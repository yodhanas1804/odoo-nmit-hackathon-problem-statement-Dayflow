from datetime import date, datetime
from typing import Optional

import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .models import AttendanceStatus, LeaveStatus, LeaveType, RegistrationStatus, UserRole


NAME_PATTERN = re.compile(r"^[A-Za-z][A-Za-z .'-]*$")
EMPLOYEE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
PROFILE_IMAGE_DATA_PATTERN = re.compile(r"^data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$")
PROFILE_IMAGE_MAX_CHARS = 1_400_000


class UserCreate(BaseModel):
    employee_id: str = Field(min_length=2, max_length=32)
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole = UserRole.EMPLOYEE

    @field_validator("employee_id")
    @classmethod
    def validate_employee_id(cls, value: str) -> str:
        if not EMPLOYEE_ID_PATTERN.fullmatch(value):
            raise ValueError("Employee ID can contain only letters, numbers, underscores, and hyphens")
        return value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not NAME_PATTERN.fullmatch(value):
            raise ValueError("Name can contain only letters, spaces, periods, apostrophes, and hyphens")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    employee_id: str
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class RegistrationRequestRead(BaseModel):
    id: int
    employee_id: str
    name: str
    email: EmailStr
    role: UserRole
    status: RegistrationStatus
    admin_comment: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminRegistrationDecision(BaseModel):
    status: RegistrationStatus
    admin_comment: str = Field(default="", max_length=1000)


class AdminUserRoleUpdate(BaseModel):
    role: UserRole


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class AdminPasswordReset(BaseModel):
    password: str = Field(min_length=8)


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
    father_name: str
    mother_name: str


class EmployeeProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    address: Optional[str] = None
    phone: Optional[str] = None
    profile_picture_url: Optional[str] = None
    father_name: Optional[str] = Field(default=None, max_length=120)
    mother_name: Optional[str] = Field(default=None, max_length=120)

    @field_validator("name", "father_name", "mother_name")
    @classmethod
    def validate_optional_names(cls, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        if not NAME_PATTERN.fullmatch(value):
            raise ValueError("Name can contain only letters, spaces, periods, apostrophes, and hyphens")
        return value

    @field_validator("profile_picture_url")
    @classmethod
    def validate_profile_picture(cls, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        if len(value) > PROFILE_IMAGE_MAX_CHARS:
            raise ValueError("Profile picture must be 1 MB or smaller")
        if value.startswith("data:image/") and not PROFILE_IMAGE_DATA_PATTERN.fullmatch(value):
            raise ValueError("Profile picture must be a valid JPG, PNG, WebP, or GIF image")
        if not value.startswith("data:image/") and not value.startswith(("https://", "http://")):
            raise ValueError("Profile picture must be an uploaded image or an http(s) URL")
        return value


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
    leave_deduction: float = 0
    net_salary: float
    paid_leave_allowance: int = 2
    sick_leave_allowance: int = 1
    paid_leave_used: int = 0
    sick_leave_used: int = 0
    unpaid_leave_days: int = 0

    model_config = {"from_attributes": True}
