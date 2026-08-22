from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .auth import get_current_user, require_admin
from .database import get_db
from .models import EmployeeProfile, User
from .schemas import AdminProfileUpdate, EmployeeProfileUpdate, ProfileRead

router = APIRouter(tags=["profiles"])


def get_or_create_profile(db: Session, user: User) -> EmployeeProfile:
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user.id).first()
    if profile:
        return profile

    profile = EmployeeProfile(user_id=user.id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def serialize_profile(profile: EmployeeProfile, user: User) -> ProfileRead:
    return ProfileRead(
        id=profile.id,
        user_id=user.id,
        employee_id=user.employee_id,
        name=user.name,
        email=user.email,
        role=user.role,
        personal_details=profile.personal_details,
        job_details=profile.job_details,
        salary_structure=profile.salary_structure,
        documents_metadata=profile.documents_metadata,
        profile_picture_url=profile.profile_picture_url,
        address=profile.address,
        phone=profile.phone,
    )


def find_user_by_employee_id(db: Session, employee_id: str) -> Optional[User]:
    return db.query(User).filter(User.employee_id == employee_id).first()


@router.get("/profiles/me", response_model=ProfileRead)
def read_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileRead:
    profile = get_or_create_profile(db, current_user)
    return serialize_profile(profile, current_user)


@router.patch("/profiles/me", response_model=ProfileRead)
def update_my_profile(
    payload: EmployeeProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileRead:
    profile = get_or_create_profile(db, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return serialize_profile(profile, current_user)


@router.get("/admin/profiles", response_model=list[ProfileRead])
def list_profiles(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[ProfileRead]:
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [serialize_profile(get_or_create_profile(db, user), user) for user in users]


@router.patch("/admin/profiles/{employee_id}", response_model=ProfileRead)
def update_employee_profile(
    employee_id: str,
    payload: AdminProfileUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ProfileRead:
    user = find_user_by_employee_id(db, employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    profile = get_or_create_profile(db, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return serialize_profile(profile, user)
