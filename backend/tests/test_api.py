from datetime import date, timedelta

from app.security import create_access_token


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


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_signup_login_and_duplicate_account(client):
    created = signup(client)

    login = client.post(
        "/auth/login",
        json={"email": "employee100@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["employee_id"] == created["user"]["employee_id"]

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


def test_invalid_token_subject_returns_401(client):
    token = create_access_token("not-a-user-id")
    response = client.get("/users/me", headers=auth_headers(token))
    assert response.status_code == 401


def test_employee_cannot_access_admin_endpoints(client):
    employee = signup(client)
    response = client.get("/admin/payroll", headers=auth_headers(employee["access_token"]))
    assert response.status_code == 403


def test_employee_profile_update_rejects_restricted_fields(client):
    employee = signup(client)
    response = client.patch(
        "/profiles/me",
        headers=auth_headers(employee["access_token"]),
        json={"job_details": "Should not be accepted", "address": "New address"},
    )
    assert response.status_code == 422

    profile = client.patch(
        "/profiles/me",
        headers=auth_headers(employee["access_token"]),
        json={"address": "New address"},
    )
    assert profile.status_code == 200
    assert profile.json()["address"] == "New address"


def test_attendance_check_in_check_out_and_duplicate_errors(client):
    employee = signup(client)
    headers = auth_headers(employee["access_token"])

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


def test_leave_workflow_and_validation(client):
    employee = signup(client)
    admin = signup(client, employee_id="ADM100", email="admin100@example.com", role="ADMIN")
    employee_headers = auth_headers(employee["access_token"])
    admin_headers = auth_headers(admin["access_token"])
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


def test_payroll_admin_update_and_employee_read_only(client):
    employee = signup(client)
    admin = signup(client, employee_id="ADM200", email="admin200@example.com", role="ADMIN")
    employee_headers = auth_headers(employee["access_token"])
    admin_headers = auth_headers(admin["access_token"])

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
