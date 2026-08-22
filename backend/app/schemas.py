from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import AttendanceStatus, LeaveStatus, LeaveType, UserRole


class UserCreate(BaseModel):
    employee_id: str = Field(min_length=2, max_length=32)
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole = UserRole.EMPLOYEE


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    employee_id: str
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ProfileRead(BaseModel):
    id: int
    user_id: int
    employee_id: str
    name: str
    email: EmailStr
    role: UserRole
    personal_details: str
    job_details: str
    salary_structure: str
    documents_metadata: str
    profile_picture_url: str
    address: str
    phone: str


class EmployeeProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    address: Optional[str] = None
    phone: Optional[str] = None
    profile_picture_url: Optional[str] = None


class AdminProfileUpdate(EmployeeProfileUpdate):
    personal_details: Optional[str] = None
    job_details: Optional[str] = None
    salary_structure: Optional[str] = None
    documents_metadata: Optional[str] = None


class AttendanceRead(BaseModel):
    id: int
    employee_id: str
    date: date
    check_in: datetime
    check_out: Optional[datetime]
    status: AttendanceStatus

    model_config = {"from_attributes": True}


class LeaveCreate(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    remarks: str = Field(default="", max_length=1000)


class AdminLeaveUpdate(BaseModel):
    status: LeaveStatus
    admin_comment: str = Field(default="", max_length=1000)


class LeaveRead(BaseModel):
    id: int
    employee_id: str
    leave_type: LeaveType
    start_date: date
    end_date: date
    remarks: str
    status: LeaveStatus
    admin_comment: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PayrollUpdate(BaseModel):
    basic_salary: float = Field(ge=0)
    allowances: float = Field(ge=0)
    deductions: float = Field(ge=0)


class PayrollRead(BaseModel):
    id: int
    employee_id: str
    basic_salary: float
    allowances: float
    deductions: float
    net_salary: float

    model_config = {"from_attributes": True}
