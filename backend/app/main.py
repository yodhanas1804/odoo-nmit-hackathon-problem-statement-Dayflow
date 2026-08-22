from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .attendance import router as attendance_router
from .auth import get_current_user, require_admin, router as auth_router
from .config import settings
from .database import Base, SessionLocal, engine
from .demo_data import seed_demo_data
from .leaves import router as leaves_router
from .models import User
from .payroll import router as payroll_router
from .profiles import router as profiles_router
from .schemas import UserRead

app = FastAPI(title=settings.app_name)
Base.metadata.create_all(bind=engine)
if settings.seed_demo_data:
    with SessionLocal() as db:
        seed_demo_data(db)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(attendance_router)
app.include_router(leaves_router)
app.include_router(payroll_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
    }


@app.get("/users/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@app.get("/admin/users/me", response_model=UserRead)
def read_admin_user(current_user: User = Depends(require_admin)) -> User:
    return current_user
