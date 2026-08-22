from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .database import get_db
from .models import EmployeeProfile, User, UserRole
from .schemas import Token, UserCreate, UserLogin, UserRead
from .security import create_access_token, decode_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    existing = (
        db.query(User)
        .filter(or_(User.email == payload.email, User.employee_id == payload.employee_id))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email or employee ID already exists")

    user = User(
        employee_id=payload.employee_id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.add(EmployeeProfile(user_id=user.id))
    db.commit()
    return Token(access_token=create_access_token(str(user.id)), user=UserRead.model_validate(user))


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
