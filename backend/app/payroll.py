from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .auth import get_current_user, require_admin
from .database import get_db
from .models import Payroll, User
from .schemas import PayrollRead, PayrollUpdate

router = APIRouter(tags=["payroll"])


def calculate_net_salary(basic_salary: float, allowances: float, deductions: float) -> float:
    return max(0.0, basic_salary + allowances - deductions)


def get_or_create_payroll(db: Session, employee_id: str) -> Payroll:
    payroll = db.query(Payroll).filter(Payroll.employee_id == employee_id).first()
    if payroll:
        return payroll

    payroll = Payroll(employee_id=employee_id)
    db.add(payroll)
    db.commit()
    db.refresh(payroll)
    return payroll


@router.get("/payroll/me", response_model=PayrollRead)
def read_my_payroll(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Payroll:
    return get_or_create_payroll(db, current_user.employee_id)


@router.get("/admin/payroll", response_model=list[PayrollRead])
def list_payroll(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[Payroll]:
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [get_or_create_payroll(db, user.employee_id) for user in users]


@router.patch("/admin/payroll/{employee_id}", response_model=PayrollRead)
def update_employee_payroll(
    employee_id: str,
    payload: PayrollUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Payroll:
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
    return payroll
