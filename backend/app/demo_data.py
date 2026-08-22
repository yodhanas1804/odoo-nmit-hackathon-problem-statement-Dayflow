from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from .models import (
    Attendance,
    AttendanceStatus,
    EmployeeProfile,
    LeaveRequest,
    LeaveStatus,
    LeaveType,
    Payroll,
    User,
    UserRole,
)
from .security import hash_password

DEMO_EMPLOYEE_EMAIL = "employee.dayflow@example.com"
DEMO_ADMIN_EMAIL = "admin.dayflow@example.com"
DEMO_PASSWORD = "password123"


def seed_demo_data(db: Session) -> None:
    admin = get_or_create_user(
        db,
        employee_id="ADM001",
        name="Demo Admin",
        email=DEMO_ADMIN_EMAIL,
        role=UserRole.ADMIN.value,
    )
    employee = get_or_create_user(
        db,
        employee_id="EMP001",
        name="Demo Employee",
        email=DEMO_EMPLOYEE_EMAIL,
        role=UserRole.EMPLOYEE.value,
    )

    ensure_profile(
        db,
        admin,
        job_details="HR Administrator",
        salary_structure="Monthly payroll administrator",
        phone="+91 90000 00001",
        address="Bengaluru",
    )
    ensure_profile(
        db,
        employee,
        personal_details="Demo employee profile",
        job_details="Operations Associate",
        salary_structure="Basic plus allowances",
        documents_metadata="Aadhaar and PAN verified",
        phone="+91 90000 00002",
        address="Mysuru",
    )
    ensure_payroll(db, employee.employee_id, basic_salary=45000, allowances=8000, deductions=2500)
    ensure_payroll(db, admin.employee_id, basic_salary=70000, allowances=12000, deductions=5000)
    ensure_attendance(db, employee.employee_id)
    ensure_leave_request(db, employee.employee_id)
    db.commit()


def get_or_create_user(
    db: Session,
    employee_id: str,
    name: str,
    email: str,
    role: str,
) -> User:
    user = db.query(User).filter((User.email == email) | (User.employee_id == employee_id)).first()
    if user:
        user.employee_id = employee_id
        user.name = name
        user.email = email
        user.password_hash = hash_password(DEMO_PASSWORD)
        user.role = role
        user.is_active = True
        db.flush()
        return user

    user = User(
        employee_id=employee_id,
        name=name,
        email=email,
        password_hash=hash_password(DEMO_PASSWORD),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def ensure_profile(db: Session, user: User, **values: str) -> None:
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user.id).first()
    if not profile:
        profile = EmployeeProfile(user_id=user.id)
        db.add(profile)
        db.flush()

    for field, value in values.items():
        if not getattr(profile, field):
            setattr(profile, field, value)


def ensure_payroll(
    db: Session,
    employee_id: str,
    basic_salary: float,
    allowances: float,
    deductions: float,
) -> None:
    payroll = db.query(Payroll).filter(Payroll.employee_id == employee_id).first()
    if payroll:
        return

    db.add(
        Payroll(
            employee_id=employee_id,
            basic_salary=basic_salary,
            allowances=allowances,
            deductions=deductions,
            net_salary=max(0.0, basic_salary + allowances - deductions),
        )
    )


def ensure_attendance(db: Session, employee_id: str) -> None:
    yesterday = date.today() - timedelta(days=1)
    existing = (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee_id, Attendance.date == yesterday)
        .first()
    )
    if existing:
        return

    check_in = datetime.combine(yesterday, datetime.min.time()).replace(hour=9, minute=15)
    check_out = datetime.combine(yesterday, datetime.min.time()).replace(hour=17, minute=45)
    db.add(
        Attendance(
            employee_id=employee_id,
            date=yesterday,
            check_in=check_in,
            check_out=check_out,
            status=AttendanceStatus.PRESENT.value,
        )
    )


def ensure_leave_request(db: Session, employee_id: str) -> None:
    existing = db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee_id).first()
    if existing:
        return

    start_date = date.today() + timedelta(days=3)
    db.add(
        LeaveRequest(
            employee_id=employee_id,
            leave_type=LeaveType.PAID.value,
            start_date=start_date,
            end_date=start_date + timedelta(days=1),
            remarks="Family function",
            status=LeaveStatus.PENDING.value,
        )
    )
