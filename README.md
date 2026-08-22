# Dayflow HRMS

Dayflow is a planned Human Resource Management System for the Odoo NMIT hackathon.

## Phase 0 Status

- Repository inspected on branch `main`.
- Remote: `origin` -> `https://github.com/yodhanas1804/odoo-nmit-hackathon-problem-statement-Dayflow.git`
- Existing application code: none.
- Selected stack:
  - Frontend: React + Tailwind CSS
  - Backend: FastAPI
  - Database: PostgreSQL-compatible setup

## Planned Modules

- Authentication with `EMPLOYEE` and `ADMIN` roles.
- Employee profile management.
- Attendance check-in/check-out and daily/weekly views.
- Leave request workflow with admin approval or rejection.
- Payroll visibility for employees and payroll management for admins.

## Planned Data Model

### User

- `id`
- `employee_id`
- `name`
- `email`
- `password_hash`
- `role`
- `created_at`

### Employee Profile

- `id`
- `user_id`
- `personal_details`
- `job_details`
- `address`
- `phone`
- `profile_picture_url`
- `documents_metadata`

### Attendance

- `id`
- `employee_id`
- `date`
- `check_in`
- `check_out`
- `status`

### Leave Request

- `id`
- `employee_id`
- `leave_type`
- `start_date`
- `end_date`
- `remarks`
- `status`
- `admin_comment`
- `created_at`

### Payroll

- `id`
- `employee_id`
- `basic_salary`
- `allowances`
- `deductions`
- `net_salary`

## Planned API Surface

- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `GET /users/me`
- `GET /profiles/me`
- `PATCH /profiles/me`
- `GET /admin/profiles`
- `PATCH /admin/profiles/{employee_id}`
- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `GET /attendance/me`
- `GET /admin/attendance`
- `POST /leaves`
- `GET /leaves/me`
- `GET /admin/leaves`
- `PATCH /admin/leaves/{leave_id}`
- `GET /payroll/me`
- `GET /admin/payroll`
- `PATCH /admin/payroll/{employee_id}`

## Phase 1 Status

- FastAPI backend foundation added.
- `GET /health` endpoint added.
- React + Tailwind frontend foundation added.
- Frontend reads `VITE_API_BASE_URL` and calls backend health endpoint.
- Basic frontend loading/error states added.

## Phase 2 Status

- SQLAlchemy user schema added.
- Signup and login APIs added with password hashing.
- JWT bearer authentication added.
- Employee and admin protected endpoints added.
- React login/signup UI added.
- Role-aware dashboard placeholder added.
- Employee users are blocked from admin-only API access.

## Phase 3 Status

- Employee profile schema added.
- Profile records are created on signup and lazy-created for existing users.
- Employees can view their own profile.
- Employees can edit only address, phone, and profile picture URL.
- Admins can list employee profiles.
- Admins can update profile details, job details, salary structure, documents metadata, address, phone, and profile picture URL.
- Backend authorization enforces profile access rules.
- Frontend profile view and edit forms added.

## Phase 4 Status

- Attendance schema added with one record per employee per date.
- Employee check-in and check-out APIs added.
- Duplicate same-day check-ins and check-outs are blocked.
- Employees can view their own recent attendance.
- Admins can view recent attendance for all employees.
- Frontend attendance actions and recent attendance tables added.

## Phase 5 Status

- Leave request schema added.
- Employees can create paid, sick, and unpaid leave requests.
- New leave requests are created with `PENDING` status.
- Employees can view their own leave requests and approval status.
- Admins can view all leave requests.
- Admins can approve or reject leave requests with comments.
- Backend authorization enforces employee and admin leave access rules.

## Phase 6 Status

- Payroll schema added.
- Employees can view only their own payroll.
- Employee payroll access is read-only.
- Admins can view payroll for all employees.
- Admins can update salary structure values.
- Net salary is calculated from basic salary plus allowances minus deductions.
- Backend authorization enforces payroll access rules.

## Next Phase

Phase 7 will connect all modules into dashboards.

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend health endpoint:

```text
http://localhost:8000/health
```

Auth endpoints:

```text
POST /auth/signup
POST /auth/login
GET /users/me
GET /admin/users/me
GET /profiles/me
PATCH /profiles/me
GET /admin/profiles
PATCH /admin/profiles/{employee_id}
POST /attendance/check-in
POST /attendance/check-out
GET /attendance/me
GET /admin/attendance
POST /leaves
GET /leaves/me
GET /admin/leaves
PATCH /admin/leaves/{leave_id}
GET /payroll/me
GET /admin/payroll
PATCH /admin/payroll/{employee_id}
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend app:

```text
http://localhost:5173
```
