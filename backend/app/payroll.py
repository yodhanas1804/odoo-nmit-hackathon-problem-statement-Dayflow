from calendar import monthrange
from datetime import date
from typing import Union

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .auth import get_current_user, require_admin
from .database import get_db
from .models import LeaveRequest, LeaveStatus, LeaveType, Payroll, User
from .schemas import PayrollRead, PayrollUpdate

router = APIRouter(tags=["payroll"])

PAID_LEAVE_ALLOWANCE = 2
SICK_LEAVE_ALLOWANCE = 1


def calculate_net_salary(
    basic_salary: float,
    allowances: float,
    deductions: float,
    leave_deduction: float = 0.0,
) -> float:
    return max(0.0, basic_salary + allowances - deductions - leave_deduction)


def get_or_create_payroll(db: Session, employee_id: str) -> Payroll:
    payroll = db.query(Payroll).filter(Payroll.employee_id == employee_id).first()
    if payroll:
        return payroll

    payroll = Payroll(employee_id=employee_id)
    db.add(payroll)
    db.commit()
    db.refresh(payroll)
    return payroll


def leave_days_in_month(leave: LeaveRequest, year: int, month: int) -> int:
    month_start = date(year, month, 1)
    month_end = date(year, month, monthrange(year, month)[1])
    start_date = max(leave.start_date, month_start)
    end_date = min(leave.end_date, month_end)
    if end_date < start_date:
        return 0
    return (end_date - start_date).days + 1


PayrollValue = Union[float, int, str]


def monthly_leave_summary(db: Session, employee_id: str, payroll: Payroll) -> dict[str, Union[float, int]]:
    today = date.today()
    month_start = date(today.year, today.month, 1)
    month_end = date(today.year, today.month, monthrange(today.year, today.month)[1])
    approved_leaves = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == LeaveStatus.APPROVED.value,
            LeaveRequest.start_date <= month_end,
            LeaveRequest.end_date >= month_start,
        )
        .all()
    )

    paid_used = 0
    sick_used = 0
    unpaid_used = 0
    for leave in approved_leaves:
        days = leave_days_in_month(leave, today.year, today.month)
        if leave.leave_type == LeaveType.PAID.value:
            paid_used += days
        elif leave.leave_type == LeaveType.SICK.value:
            sick_used += days
        else:
            unpaid_used += days

    excess_paid = max(0, paid_used - PAID_LEAVE_ALLOWANCE)
    excess_sick = max(0, sick_used - SICK_LEAVE_ALLOWANCE)
    unpaid_leave_days = unpaid_used + excess_paid + excess_sick
    monthly_gross = payroll.basic_salary + payroll.allowances
    daily_rate = monthly_gross / monthrange(today.year, today.month)[1] if monthly_gross else 0
    leave_deduction = round(unpaid_leave_days * daily_rate, 2)

    return {
        "paid_leave_allowance": PAID_LEAVE_ALLOWANCE,
        "sick_leave_allowance": SICK_LEAVE_ALLOWANCE,
        "paid_leave_used": paid_used,
        "sick_leave_used": sick_used,
        "unpaid_leave_days": unpaid_leave_days,
        "leave_deduction": leave_deduction,
    }


def serialize_payroll(db: Session, payroll: Payroll) -> dict[str, PayrollValue]:
    leave_summary = monthly_leave_summary(db, payroll.employee_id, payroll)
    net_salary = calculate_net_salary(
        payroll.basic_salary,
        payroll.allowances,
        payroll.deductions,
        float(leave_summary["leave_deduction"]),
    )
    return {
        "id": payroll.id,
        "employee_id": payroll.employee_id,
        "basic_salary": payroll.basic_salary,
        "allowances": payroll.allowances,
        "deductions": payroll.deductions,
        "leave_deduction": leave_summary["leave_deduction"],
        "net_salary": net_salary,
        "paid_leave_allowance": leave_summary["paid_leave_allowance"],
        "sick_leave_allowance": leave_summary["sick_leave_allowance"],
        "paid_leave_used": leave_summary["paid_leave_used"],
        "sick_leave_used": leave_summary["sick_leave_used"],
        "unpaid_leave_days": leave_summary["unpaid_leave_days"],
    }


@router.get("/payroll/me", response_model=PayrollRead)
def read_my_payroll(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, PayrollValue]:
    return serialize_payroll(db, get_or_create_payroll(db, current_user.employee_id))


@router.get("/admin/payroll", response_model=list[PayrollRead])
def list_payroll(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[dict[str, PayrollValue]]:
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [serialize_payroll(db, get_or_create_payroll(db, user.employee_id)) for user in users]


@router.patch("/admin/payroll/{employee_id}", response_model=PayrollRead)
def update_employee_payroll(
    employee_id: str,
    payload: PayrollUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, PayrollValue]:
    user = db.query(User).filter(User.employee_id == employee_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    payroll = get_or_create_payroll(db, employee_id)
    payroll.basic_salary = payload.basic_salary
    payroll.allowances = payload.allowances
    payroll.deductions = payload.deductions
    payroll.net_salary = calculate_net_salary(
        payload.basic_salary,
        payload.allowances,
        payload.deductions,
    )
    db.commit()
    db.refresh(payroll)
    return serialize_payroll(db, payroll)
