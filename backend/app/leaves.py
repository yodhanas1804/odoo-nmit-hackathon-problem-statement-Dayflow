from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .auth import get_current_user, require_admin
from .database import get_db
from .models import LeaveRequest, LeaveStatus, User
from .schemas import AdminLeaveUpdate, LeaveCreate, LeaveRead

router = APIRouter(tags=["leaves"])


@router.post("/leaves", response_model=LeaveRead, status_code=201)
def create_leave_request(
    payload: LeaveCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LeaveRequest:
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date")
    if payload.start_date < date.today():
        raise HTTPException(status_code=400, detail="Start date cannot be in the past")

    leave = LeaveRequest(
        employee_id=current_user.employee_id,
        leave_type=payload.leave_type.value,
        start_date=payload.start_date,
        end_date=payload.end_date,
        remarks=payload.remarks,
        status=LeaveStatus.PENDING.value,
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


@router.get("/leaves/me", response_model=list[LeaveRead])
def list_my_leave_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LeaveRequest]:
    return (
        db.query(LeaveRequest)
        .filter(LeaveRequest.employee_id == current_user.employee_id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )


@router.get("/admin/leaves", response_model=list[LeaveRead])
def list_all_leave_requests(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[LeaveRequest]:
    return db.query(LeaveRequest).order_by(LeaveRequest.created_at.desc()).all()


@router.patch("/admin/leaves/{leave_id}", response_model=LeaveRead)
def update_leave_request(
    leave_id: int,
    payload: AdminLeaveUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> LeaveRequest:
    if payload.status == LeaveStatus.PENDING:
        raise HTTPException(status_code=400, detail="Admin must approve or reject the request")

    leave = db.get(LeaveRequest, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = payload.status.value
    leave.admin_comment = payload.admin_comment
    db.commit()
    db.refresh(leave)
    return leave
