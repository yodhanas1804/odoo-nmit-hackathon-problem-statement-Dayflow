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
    fill_existing_user_profiles(db)
    fill_existing_user_payroll(db)
    fill_existing_user_attendance(db)
    fill_existing_user_leaves(db)
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
    if profile.profile_picture_url.startswith("https://api.dicebear.com/"):
        profile.profile_picture_url = ""


def fill_existing_user_profiles(db: Session) -> None:
    for index, user in enumerate(db.query(User).order_by(User.created_at.asc()).all(), start=1):
        ensure_profile(
            db,
            user,
            personal_details=f"Sample profile details for {user.name}",
            job_details="HR Administrator" if user.role == UserRole.ADMIN.value else "Operations Associate",
            salary_structure="Monthly salary with basic pay, allowances, deductions, and leave adjustments",
            documents_metadata="Aadhaar, PAN, resume, and bank details verified",
            address=f"Sample Address {index}, Bengaluru, Karnataka",
            phone=f"+91 90000 00{index:03d}",
            father_name=f"Father {index}",
            mother_name=f"Mother {index}",
        )


def fill_existing_user_payroll(db: Session) -> None:
    for index, user in enumerate(db.query(User).order_by(User.created_at.asc()).all(), start=1):
        if user.role == UserRole.ADMIN.value:
            basic_salary = 70000 + (index * 1000)
            allowances = 12000
            deductions = 5000
        else:
            basic_salary = 42000 + (index * 1500)
            allowances = 8000
            deductions = 2500
        ensure_payroll(
            db,
            user.employee_id,
            basic_salary=basic_salary,
            allowances=allowances,
            deductions=deductions,
        )


def fill_existing_user_attendance(db: Session) -> None:
    for user in db.query(User).order_by(User.created_at.asc()).all():
        ensure_attendance(db, user.employee_id)


def fill_existing_user_leaves(db: Session) -> None:
    for user in db.query(User).order_by(User.created_at.asc()).all():
        ensure_leave_request(db, user.employee_id)


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
    samples = [
        (1, 9, 15, 17, 45, AttendanceStatus.PRESENT.value),
        (2, 9, 40, 16, 10, AttendanceStatus.HALF_DAY.value),
        (3, 9, 5, 18, 0, AttendanceStatus.PRESENT.value),
        (4, 10, 0, 18, 20, AttendanceStatus.PRESENT.value),
        (5, 9, 25, 14, 30, AttendanceStatus.HALF_DAY.value),
    ]
    for days_ago, in_hour, in_minute, out_hour, out_minute, status in samples:
        attendance_date = date.today() - timedelta(days=days_ago)
        existing = (
            db.query(Attendance)
            .filter(Attendance.employee_id == employee_id, Attendance.date == attendance_date)
            .first()
        )
        if existing:
            continue

        check_in = datetime.combine(attendance_date, datetime.min.time()).replace(
            hour=in_hour,
            minute=in_minute,
        )
        check_out = datetime.combine(attendance_date, datetime.min.time()).replace(
            hour=out_hour,
            minute=out_minute,
        )
        db.add(
            Attendance(
                employee_id=employee_id,
                date=attendance_date,
                check_in=check_in,
                check_out=check_out,
                status=status,
            )
        )


def ensure_leave_request(db: Session, employee_id: str) -> None:
    start_date = date.today() + timedelta(days=3)
    current_month_leave = date.today().replace(day=min(date.today().day, 20))
    for leave_type, first_day, last_day, remarks, status in [
        (LeaveType.PAID.value, start_date, start_date + timedelta(days=1), "Family function", LeaveStatus.PENDING.value),
        (LeaveType.PAID.value, current_month_leave, current_month_leave + timedelta(days=2), "Approved personal leave", LeaveStatus.APPROVED.value),
        (LeaveType.SICK.value, current_month_leave + timedelta(days=4), current_month_leave + timedelta(days=5), "Approved sick leave", LeaveStatus.APPROVED.value),
    ]:
        existing = (
            db.query(LeaveRequest)
            .filter(
                LeaveRequest.employee_id == employee_id,
                LeaveRequest.leave_type == leave_type,
                LeaveRequest.start_date == first_day,
                LeaveRequest.end_date == last_day,
                LeaveRequest.remarks == remarks,
            )
            .first()
        )
        if existing:
            continue

        db.add(
            LeaveRequest(
                employee_id=employee_id,
                leave_type=leave_type,
                start_date=first_day,
                end_date=last_day,
                remarks=remarks,
                status=status,
                admin_comment="Demo record" if status == LeaveStatus.APPROVED.value else "",
            )
        )
