# Dayflow HRMS

Dayflow is a Human Resource Management System built for the Odoo NMIT hackathon. It includes a FastAPI backend, a React + Tailwind frontend, JWT authentication, employee self-service workflows, and admin management tools.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, lucide-react icons
- Backend: FastAPI, SQLAlchemy, Pydantic, python-jose JWT
- Database: SQLite by default, configurable through `DATABASE_URL`
- Tests: Pytest for backend API coverage

## Project Structure

```text
backend/
  app/
    auth.py          Authentication, signup requests, login, admin account APIs
    attendance.py    Check-in/check-out and attendance history APIs
    config.py        Environment-driven application settings
    database.py      SQLAlchemy engine, sessions, and base model setup
    demo_data.py     Demo employee/admin seed data
    leaves.py        Leave request and admin approval APIs
    main.py          FastAPI app setup, CORS, routers, and health endpoint
    models.py        SQLAlchemy data models and enums
    payroll.py       Payroll read/update and salary calculation logic
    profiles.py      Employee and admin profile APIs
    schemas.py       Request/response validation schemas
    security.py      Password hashing and JWT helpers
  tests/
    conftest.py      Test database and FastAPI test client fixtures
    test_api.py      End-to-end API workflow tests
frontend/
  src/
    api.js           Fetch client for backend endpoints
    App.jsx          Main application UI and dashboard workflows
    main.jsx         React entry point
    styles.css       Tailwind import and global visual styles
```

## Modules

### Authentication and Registration

- Public users can submit signup requests.
- Signup requests stay `PENDING` until an admin approves them.
- Public signup always creates an employee registration, even if the submitted role is admin.
- Approved users can log in with email and password.
- Passwords are hashed before storage.
- JWT bearer tokens protect authenticated endpoints.
- The login/signup password field includes an eye toggle to show or hide the typed password.

### Roles and Authorization

- Supported roles are `EMPLOYEE` and `ADMIN`.
- Employees can access only their own records.
- Admin-only APIs reject employee tokens.
- Admins can view their own admin profile through `/admin/users/me`.
- Admins cannot deactivate or demote their own account.

### Admin Account Management

- Admins can list active users.
- Admins can promote or demote other users.
- Admins can deactivate or reactivate other users.
- Admins can reset employee passwords.
- Admins can approve or reject pending registration requests with comments.

### Employee Profiles

- A profile is created during account approval and lazy-created for existing users when needed.
- Employees can view their own profile.
- Employees can edit allowed self-service fields such as name, address, phone, parents' names, and profile picture URL.
- Admins can list all profiles.
- Admins can update personal details, job details, salary structure notes, document metadata, contact fields, and profile picture URLs.
- The frontend supports profile picture preview from URL or uploaded image data.

### Attendance

- Employees can check in once per day.
- Employees can check out once after checking in.
- Duplicate check-ins and duplicate check-outs are rejected.
- Employees can view recent personal attendance.
- Admins can view recent attendance for all employees.
- The UI shows worked duration and whether the 7-hour minimum was completed.
- Admin views include a current work-status indicator for present, approved leave, or absent.

### Leave Management

- Employees can request `PAID`, `SICK`, or `UNPAID` leave.
- Leave requests include start date, end date, and remarks.
- Invalid date ranges are rejected.
- Employees can track their own leave status.
- Admins can approve or reject leave requests with comments.
- Approved leave slips can be printed from the frontend.

### Payroll

- Employees can view their own payroll only.
- Admins can view payroll records for all employees.
- Admins can update basic salary, allowances, and deductions.
- Net salary is calculated as basic salary plus allowances minus fixed deductions and leave deduction.
- Leave usage is reflected in payroll summaries.
- Employees can print salary slips from the frontend.

### Frontend Dashboard

- Public screen supports login and employee registration.
- Authenticated employees get dashboard sections for overview, profile, attendance, leave, and payroll.
- Admin users get additional sections for registration approvals, user information, employee profiles, attendance, leave approvals, and payroll management.
- Dashboard data loading errors are shown in the interface.
- Successful actions show a confirmation prompt.
- The app reads `VITE_API_BASE_URL` and defaults to `http://localhost:8000`.

### Demo Data

Demo records are seeded automatically when the backend starts unless disabled.

```text
Employee: employee.dayflow@example.com / password123
Admin: admin.dayflow@example.com / password123
Dummy Admin Password: password123
```

Set `SEED_DEMO_DATA=false` to disable automatic demo data.

## API Endpoints

### Health

- `GET /health`

### Auth and Users

- `POST /auth/signup`
- `POST /auth/login`
- `GET /users/me`
- `GET /admin/users/me`
- `GET /admin/registrations`
- `PATCH /admin/registrations/{request_id}`
- `GET /admin/users`
- `PATCH /admin/users/{employee_id}/role`
- `PATCH /admin/users/{employee_id}/status`
- `PATCH /admin/users/{employee_id}/password`

### Profiles

- `GET /profiles/me`
- `PATCH /profiles/me`
- `GET /admin/profiles`
- `PATCH /admin/profiles/{employee_id}`

### Attendance

- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `GET /attendance/me`
- `GET /admin/attendance`

### Leaves

- `POST /leaves`
- `GET /leaves/me`
- `GET /admin/leaves`
- `PATCH /admin/leaves/{leave_id}`

### Payroll

- `GET /payroll/me`
- `GET /admin/payroll`
- `PATCH /admin/payroll/{employee_id}`

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at:

```text
http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

Optional frontend environment variable:

```text
VITE_API_BASE_URL=http://localhost:8000
```

## Environment Variables

```text
APP_NAME=Dayflow HRMS
ENVIRONMENT=development
FRONTEND_ORIGIN=http://localhost:5173
DATABASE_URL=sqlite:///./dayflow.db
SECRET_KEY=change-this-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
SEED_DEMO_DATA=true
```

## Verification

Frontend production build:

```bash
cd frontend
npm run build
```

Backend tests:

```bash
cd backend
.venv\Scripts\activate
pytest
```

Current verification status:

- Frontend build passes.
- Backend API test suite passes.
- Test coverage includes signup approval, login, structured validation errors, authorization, profile restrictions, attendance, leave workflows, payroll updates, and admin account management.
