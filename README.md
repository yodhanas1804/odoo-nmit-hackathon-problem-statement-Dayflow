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

## Next Phase

Phase 2 will add database schema and authentication.

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
