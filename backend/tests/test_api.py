from datetime import date, timedelta

from app.models import EmployeeProfile, User, UserRole
from app.security import create_access_token
from app.security import hash_password


def signup(client, employee_id="EMP100", email="employee100@example.com", role="EMPLOYEE"):
    response = client.post(
        "/auth/signup",
        json={
            "employee_id": employee_id,
            "name": "Test User",
            "email": email,
            "password": "password123",
            "role": role,
        },
    )
    assert response.status_code == 201
    return response.json()


def create_user(db_session, employee_id="EMP100", email="employee100@example.com", role=UserRole.EMPLOYEE.value):
    user = User(
        employee_id=employee_id,
        name="Test User",
        email=email,
        password_hash=hash_password("password123"),
        role=role,
    )
    db_session.add(user)
    db_session.flush()
    db_session.add(EmployeeProfile(user_id=user.id))
    db_session.commit()
    db_session.refresh(user)
    return user


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_signup_requires_admin_approval_before_login(client, db_session):
    admin = create_user(
        db_session,
        employee_id="ADM100",
        email="admin100@example.com",
        role=UserRole.ADMIN.value,
    )
    admin_token = create_access_token(str(admin.id))
    created = signup(client)
    assert created["status"] == "PENDING"

    login = client.post(
        "/auth/login",
        json={"email": "employee100@example.com", "password": "password123"},
    )
    assert login.status_code == 401

    approval = client.patch(
        f"/admin/registrations/{created['id']}",
        headers=auth_headers(admin_token),
        json={"status": "APPROVED", "admin_comment": "Approved"},
    )
    assert approval.status_code == 200
    assert approval.json()["status"] == "APPROVED"

    login = client.post(
        "/auth/login",
        json={"email": "employee100@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["employee_id"] == created["employee_id"]

    duplicate = client.post(
        "/auth/signup",
        json={
            "employee_id": "EMP100",
            "name": "Duplicate",
            "email": "employee100@example.com",
            "password": "password123",
            "role": "EMPLOYEE",
        },
    )
    assert duplicate.status_code == 409


def test_admin_can_reject_signup_without_creating_account(client, db_session):
    admin = create_user(
        db_session,
        employee_id="ADM101",
        email="admin101@example.com",
        role=UserRole.ADMIN.value,
    )
    request = signup(client, employee_id="EMP101", email="employee101@example.com")

    rejection = client.patch(
        f"/admin/registrations/{request['id']}",
        headers=auth_headers(create_access_token(str(admin.id))),
        json={"status": "REJECTED", "admin_comment": "Invalid details"},
    )
    assert rejection.status_code == 200
    assert rejection.json()["status"] == "REJECTED"

    login = client.post(
        "/auth/login",
        json={"email": "employee101@example.com", "password": "password123"},
    )
    assert login.status_code == 401


def test_signup_validation_error_is_structured(client):
    response = client.post(
        "/auth/signup",
        json={
            "employee_id": "E",
            "name": "A",
            "email": "not-an-email",
            "password": "short",
            "role": "EMPLOYEE",
        },
    )
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)


def test_signup_rejects_numeric_name_numeric_email_and_emoji(client):
    numeric_name = client.post(
        "/auth/signup",
        json={
            "employee_id": "EMP102",
            "name": "12345",
            "email": "employee102@example.com",
            "password": "password123",
            "role": "EMPLOYEE",
        },
    )
    assert numeric_name.status_code == 422

    numeric_email = client.post(
        "/auth/signup",
        json={
            "employee_id": "EMP103",
            "name": "Test User",
            "email": 12345,
            "password": "password123",
            "role": "EMPLOYEE",
        },
    )
    assert numeric_email.status_code == 422

    emoji_name = client.post(
        "/auth/signup",
        json={
            "employee_id": "EMP104",
            "name": "Test 😀",
            "email": "employee104@example.com",
            "password": "password123",
            "role": "EMPLOYEE",
        },
    )
    assert emoji_name.status_code == 422


def test_sql_injection_like_password_is_hashed_and_not_executed(client, db_session):
    admin = create_user(
        db_session,
        employee_id="ADM102",
        email="admin102@example.com",
        role=UserRole.ADMIN.value,
    )
    password = "' OR '1'='1'; DROP TABLE users; --"
    request = client.post(
        "/auth/signup",
        json={
            "employee_id": "EMP105",
            "name": "Injection Test",
            "email": "employee105@example.com",
            "password": password,
            "role": "EMPLOYEE",
        },
    )
    assert request.status_code == 201

    approval = client.patch(
        f"/admin/registrations/{request.json()['id']}",
        headers=auth_headers(create_access_token(str(admin.id))),
        json={"status": "APPROVED", "admin_comment": "Approved"},
    )
    assert approval.status_code == 200

    wrong_password = client.post(
        "/auth/login",
        json={"email": "employee105@example.com", "password": "' OR '1'='1'"},
    )
    assert wrong_password.status_code == 401

    correct_password = client.post(
        "/auth/login",
        json={"email": "employee105@example.com", "password": password},
    )
    assert correct_password.status_code == 200


def test_invalid_token_subject_returns_401(client):
    token = create_access_token("not-a-user-id")
    response = client.get("/users/me", headers=auth_headers(token))
    assert response.status_code == 401


def test_employee_cannot_access_admin_endpoints(client, db_session):
    employee = create_user(db_session)
    response = client.get("/admin/payroll", headers=auth_headers(create_access_token(str(employee.id))))
    assert response.status_code == 403


def test_employee_profile_update_rejects_restricted_fields(client, db_session):
    employee = create_user(db_session)
    response = client.patch(
        "/profiles/me",
        headers=auth_headers(create_access_token(str(employee.id))),
        json={"job_details": "Should not be accepted", "address": "New address"},
    )
    assert response.status_code == 422

    profile = client.patch(
        "/profiles/me",
        headers=auth_headers(create_access_token(str(employee.id))),
        json={"address": "New address"},
    )
    assert profile.status_code == 200
    assert profile.json()["address"] == "New address"


def test_attendance_check_in_check_out_and_duplicate_errors(client, db_session):
    employee = create_user(db_session)
    headers = auth_headers(create_access_token(str(employee.id)))

    missing_check_in = client.post("/attendance/check-out", headers=headers)
    assert missing_check_in.status_code == 400

    check_in = client.post("/attendance/check-in", headers=headers)
    assert check_in.status_code == 200
    assert check_in.json()["status"] == "PRESENT"

    duplicate_check_in = client.post("/attendance/check-in", headers=headers)
    assert duplicate_check_in.status_code == 409

    check_out = client.post("/attendance/check-out", headers=headers)
    assert check_out.status_code == 200
    assert check_out.json()["check_out"] is not None

    duplicate_check_out = client.post("/attendance/check-out", headers=headers)
    assert duplicate_check_out.status_code == 409


def test_leave_workflow_and_validation(client, db_session):
    employee = create_user(db_session)
    admin = create_user(
        db_session,
        employee_id="ADM200",
        email="admin200@example.com",
        role=UserRole.ADMIN.value,
    )
    employee_headers = auth_headers(create_access_token(str(employee.id)))
    admin_headers = auth_headers(create_access_token(str(admin.id)))
    start_date = (date.today() + timedelta(days=2)).isoformat()

    invalid_range = client.post(
        "/leaves",
        headers=employee_headers,
        json={
            "leave_type": "PAID",
            "start_date": start_date,
            "end_date": date.today().isoformat(),
            "remarks": "Invalid",
        },
    )
    assert invalid_range.status_code == 400

    created = client.post(
        "/leaves",
        headers=employee_headers,
        json={
            "leave_type": "SICK",
            "start_date": start_date,
            "end_date": start_date,
            "remarks": "Feeling unwell",
        },
    )
    assert created.status_code == 201
    assert created.json()["status"] == "PENDING"

    employee_admin_view = client.get("/admin/leaves", headers=employee_headers)
    assert employee_admin_view.status_code == 403

    decision = client.patch(
        f"/admin/leaves/{created.json()['id']}",
        headers=admin_headers,
        json={"status": "APPROVED", "admin_comment": "Approved"},
    )
    assert decision.status_code == 200
    assert decision.json()["status"] == "APPROVED"


def test_payroll_admin_update_and_employee_read_only(client, db_session):
    employee = create_user(db_session)
    admin = create_user(
        db_session,
        employee_id="ADM300",
        email="admin300@example.com",
        role=UserRole.ADMIN.value,
    )
    employee_headers = auth_headers(create_access_token(str(employee.id)))
    admin_headers = auth_headers(create_access_token(str(admin.id)))

    employee_payroll = client.get("/payroll/me", headers=employee_headers)
    assert employee_payroll.status_code == 200
    assert employee_payroll.json()["net_salary"] == 0

    employee_update = client.patch(
        "/admin/payroll/EMP100",
        headers=employee_headers,
        json={"basic_salary": 1000, "allowances": 200, "deductions": 50},
    )
    assert employee_update.status_code == 403

    admin_update = client.patch(
        "/admin/payroll/EMP100",
        headers=admin_headers,
        json={"basic_salary": 1000, "allowances": 200, "deductions": 50},
    )
    assert admin_update.status_code == 200
    assert admin_update.json()["net_salary"] == 1150

    negative_value = client.patch(
        "/admin/payroll/EMP100",
        headers=admin_headers,
        json={"basic_salary": -1, "allowances": 0, "deductions": 0},
    )
    assert negative_value.status_code == 422
