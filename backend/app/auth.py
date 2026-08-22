from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .database import get_db
from .models import EmployeeProfile, RegistrationRequest, RegistrationStatus, User, UserRole
from .schemas import (
    AdminRegistrationDecision,
    RegistrationRequestRead,
    Token,
    UserCreate,
    UserLogin,
    UserRead,
)
from .security import create_access_token, decode_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
admin_router = APIRouter(tags=["registration approvals"])
security = HTTPBearer()


@router.post("/signup", response_model=RegistrationRequestRead, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)) -> RegistrationRequest:
    existing = (
        db.query(User)
        .filter(or_(User.email == payload.email, User.employee_id == payload.employee_id))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email or employee ID already exists")

    pending = (
        db.query(RegistrationRequest)
        .filter(
            RegistrationRequest.status == RegistrationStatus.PENDING.value,
            or_(
                RegistrationRequest.email == payload.email,
                RegistrationRequest.employee_id == payload.employee_id,
            ),
        )
        .first()
    )
    if pending:
        raise HTTPException(status_code=409, detail="Registration request already pending")

    registration = RegistrationRequest(
        employee_id=payload.employee_id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.EMPLOYEE.value,
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return registration


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return Token(access_token=create_access_token(str(user.id)), user=UserRead.model_validate(user))


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        parsed_user_id = int(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.get(User, parsed_user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@admin_router.get("/admin/registrations", response_model=list[RegistrationRequestRead])
def list_registration_requests(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[RegistrationRequest]:
    return db.query(RegistrationRequest).order_by(RegistrationRequest.created_at.desc()).all()


@admin_router.patch("/admin/registrations/{request_id}", response_model=RegistrationRequestRead)
def decide_registration_request(
    request_id: int,
    payload: AdminRegistrationDecision,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> RegistrationRequest:
    if payload.status == RegistrationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Admin must approve or reject the request")

    registration = db.get(RegistrationRequest, request_id)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration request not found")
    if registration.status != RegistrationStatus.PENDING.value:
        raise HTTPException(status_code=409, detail="Registration request already reviewed")

    if payload.status == RegistrationStatus.APPROVED:
        existing = (
            db.query(User)
            .filter(or_(User.email == registration.email, User.employee_id == registration.employee_id))
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Email or employee ID already exists")

        user = User(
            employee_id=registration.employee_id,
            name=registration.name,
            email=registration.email,
            password_hash=registration.password_hash,
            role=registration.role,
        )
        db.add(user)
        db.flush()
        db.add(EmployeeProfile(user_id=user.id))

    registration.status = payload.status.value
    registration.admin_comment = payload.admin_comment
    db.commit()
    db.refresh(registration)
    return registration
