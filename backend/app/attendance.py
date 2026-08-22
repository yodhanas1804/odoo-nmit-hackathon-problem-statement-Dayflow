from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .auth import get_current_user, require_admin
from .database import get_db
from .models import Attendance, AttendanceStatus, User
from .schemas import AttendanceRead

router = APIRouter(tags=["attendance"])


def today_record(db: Session, employee_id: str) -> Optional[Attendance]:
    return (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee_id, Attendance.date == date.today())
        .first()
    )


@router.post("/attendance/check-in", response_model=AttendanceRead)
def check_in(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Attendance:
    if today_record(db, current_user.employee_id):
        raise HTTPException(status_code=409, detail="Already checked in today")

    attendance = Attendance(
        employee_id=current_user.employee_id,
        date=date.today(),
        check_in=datetime.utcnow(),
        status=AttendanceStatus.PRESENT.value,
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


@router.post("/attendance/check-out", response_model=AttendanceRead)
def check_out(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Attendance:
    attendance = today_record(db, current_user.employee_id)
    if not attendance:
        raise HTTPException(status_code=400, detail="Check in before checking out")
    if attendance.check_out:
        raise HTTPException(status_code=409, detail="Already checked out today")

    attendance.check_out = datetime.utcnow()
    db.commit()
    db.refresh(attendance)
    return attendance


@router.get("/attendance/me", response_model=list[AttendanceRead])
def list_my_attendance(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Attendance]:
    start_date = date.today() - timedelta(days=max(1, min(days, 31)) - 1)
    return (
        db.query(Attendance)
        .filter(Attendance.employee_id == current_user.employee_id, Attendance.date >= start_date)
        .order_by(Attendance.date.desc(), Attendance.check_in.desc())
        .all()
    )


@router.get("/admin/attendance", response_model=list[AttendanceRead])
def list_all_attendance(
    days: int = 7,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[Attendance]:
    start_date = date.today() - timedelta(days=max(1, min(days, 31)) - 1)
    return (
        db.query(Attendance)
        .filter(Attendance.date >= start_date)
        .order_by(Attendance.date.desc(), Attendance.employee_id.asc(), Attendance.check_in.desc())
        .all()
    )
