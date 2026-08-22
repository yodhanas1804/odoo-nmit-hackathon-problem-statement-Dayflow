from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class UserRole(str, Enum):
    EMPLOYEE = "EMPLOYEE"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default=UserRole.EMPLOYEE.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    personal_details: Mapped[str] = mapped_column(Text, default="")
    job_details: Mapped[str] = mapped_column(Text, default="")
    salary_structure: Mapped[str] = mapped_column(Text, default="")
    documents_metadata: Mapped[str] = mapped_column(Text, default="")
    profile_picture_url: Mapped[str] = mapped_column(String(500), default="")
    address: Mapped[str] = mapped_column(Text, default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
