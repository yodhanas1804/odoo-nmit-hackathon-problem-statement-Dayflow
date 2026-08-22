# Dayflow HRMS — Complete Modification Task

## IMPORTANT

This is the **CURRENT, ALREADY-DEVELOPED Dayflow HRMS application**.

This is a modification task, NOT a new project.

### DO NOT

- rebuild the application
- restart the implementation plan
- recreate existing features
- replace the existing architecture
- create a second/new application
- replace working APIs unnecessarily
- use mock/fake data
- remove existing functionality

First inspect the current codebase and understand the existing implementation.

Implement only the requirements below, reusing the current models, routes, APIs, components, and architecture wherever possible.

Backend changes are allowed **only where required for the requested functional/security behavior**. Do not rewrite unrelated backend functionality.

---

# 1. PUBLIC SIGNUP SECURITY — NO SELF-CREATED ADMIN

The public signup flow must NEVER allow a user to register themselves as ADMIN.

## Required flow

```text
Public Signup
      ↓
EMPLOYEE + PENDING
      ↓
Admin Review
      ↓
APPROVED
      ↓
EMPLOYEE + ACTIVE
```

Requirements:

- Remove any ADMIN role selection from public signup.
- Public signup always creates an EMPLOYEE.
- New employee accounts start as `PENDING`.
- Pending employees cannot access protected HRMS functionality.
- Only an authenticated ADMIN can approve/reject employees.
- Enforce this on the backend, not only in the UI.
- If a client manually sends `role=ADMIN` to the signup API, the backend must reject/ignore that requested role and must not create an Admin account.
- Existing Admin accounts and Admin login must continue working.
- Do not create a public Admin registration flow.

## Tests

Verify:

- normal signup → EMPLOYEE + PENDING
- public signup cannot create ADMIN
- direct API attempt cannot create ADMIN
- pending employee cannot bypass approval
- Admin can still log in
- Admin can still approve/reject employees

---

# 2. PROFILE PICTURE / AVATAR

Add profile-picture functionality to the EXISTING employee profile system.

## Employee profile

Employees must be able to:

- upload a profile picture
- change their profile picture
- see their current profile picture
- use a professional default avatar if no picture exists

Use the existing application architecture and storage approach where possible.

Requirements:

- Validate reasonable image type and size.
- Use the real uploaded image.
- Do not use random/fake profile images.
- Preserve all existing profile fields and editing functionality.
- Do not expose private information.

## Header avatar

Show the logged-in user's profile picture/avatar in the top-right header.

Clicking the avatar opens a small menu:

```text
My Profile
Log Out
```

`My Profile` opens the existing profile page.

`Log Out` uses the existing authentication/logout flow.

Do not change authentication logic just for the avatar.

---

# 3. EMPLOYEE DIRECTORY / EMPLOYEE CARDS

Where the current application displays employee cards/listings, improve them to include:

- profile picture/avatar
- employee name
- existing basic employee information
- attendance/work-status indicator

Use REAL existing employee data.

Do not hardcode employees.

If employee-card navigation already exists, clicking an employee should open the existing employee information/profile view.

Do not create a duplicate employee/profile system.

---

# 4. EMPLOYEE WORK / ATTENDANCE STATUS INDICATORS

Use the existing attendance and leave data to show employee status where employee cards/directory require it.

Use these meanings from the provided hackathon specification:

- 🟢 Green — employee is present/in office
- ✈️ Airplane — employee is on approved leave
- 🟡 Yellow — employee is absent and has not applied for time off

The indicator must use real attendance/leave data.

Do not invent statuses.

Provide accessible labels/tooltips where appropriate.

After successful Check In, the relevant employee status should update to the present/green state.

Do not alter the actual attendance calculation merely to implement the indicator.

---

# 5. ATTENDANCE — REAL CHECK-IN / CHECK-OUT

Fix/preserve the actual timestamp-based attendance behavior.

The source of truth must be the real timestamps:

```text
worked_duration = check_out_timestamp - check_in_timestamp
```

Requirements:

- Store the real check-in timestamp.
- Store the real check-out timestamp.
- Use consistent timezone handling.
- Never use a fixed/default 5-hour or 7-hour duration when real timestamps exist.
- Prevent duplicate check-in.
- Prevent duplicate check-out.
- Preserve existing attendance history.

A 1-second session must remain approximately 1 second.

Example:

```text
Check-in: 10:00:00
Check-out: 10:00:01
Worked: ~1 second
```

It must NOT become 5 hours or 7 hours.

---

# 6. ATTENDANCE — 7-HOUR MINIMUM WORK SESSION

The expected minimum work duration is **7 hours**.

This is a minimum requirement/warning, NOT a fake duration.

## While working

After check-in, show a live timer:

```text
Currently Working

Check-in
09:32 AM

Worked
02h 14m 18s

Minimum required
07h 00m

Remaining
04h 45m 42s

[ Check Out ]
```

Requirements:

- Timer starts from the real check-in timestamp.
- Timer updates continuously.
- Worked time is calculated from the real current time and check-in time.
- Show remaining time until 7 hours.
- Clearly indicate when the minimum is completed.

## After 7 hours

Show:

```text
✓ 7-hour minimum completed
```

The employee can check out normally.

---

# 7. CHECKOUT BEFORE 7 HOURS

If the employee tries to check out before 7 hours, DO NOT silently block checkout.

Show a warning/confirmation dialog:

```text
You have not completed the minimum 7-hour work session.

Worked: 05h 12m
Remaining: 01h 48m

Are you sure you want to check out?

[ Continue Working ]    [ Check Out Anyway ]
```

## Continue Working

- Close the warning.
- Do not check out.
- Keep the timer running.

## Check Out Anyway

Allow checkout.

Then:

- save the REAL checkout timestamp
- calculate the REAL worked duration
- preserve the actual duration
- mark the attendance using the existing attendance model/status rules
- indicate that the employee did not complete the 7-hour minimum

Example:

```text
Shift Completed

Check-in
09:32 AM

Check-out
02:44 PM

Worked
05h 12m

Minimum required
07h 00m

Status
Below minimum
```

### CRITICAL

Never change a short session into 7 hours.

Never use a default shift duration.

Never fabricate time.

The actual timestamps are always the source of truth.

---

# 8. ATTENDANCE HISTORY — EMPLOYEE VIEW

The employee Attendance page should clearly show day-wise attendance using REAL records.

Include where supported by the current data:

- date
- check-in
- check-out
- worked hours
- attendance status
- extra hours if already supported
- 7-hour minimum status

Provide useful date navigation/filtering where compatible with the current implementation.

Do not create fake attendance records.

---

# 9. ATTENDANCE LIST — ADMIN / HR VIEW

Implement the behavior described in the supplied hackathon specification for Admin/HR attendance.

Admins/HR should be able to view attendance for employees.

The attendance list should support, where compatible with the current application:

- employee
- date
- check-in
- check-out
- work hours
- extra hours
- search
- date navigation/filtering

Use real attendance records.

The admin view must not expose data to unauthorized users.

---

# 10. ATTENDANCE SLIP

Add an attendance document similar to the existing payslip/payroll document.

Employees should have:

`View Attendance Slip`

and/or

`Print Attendance Slip`

The attendance slip must contain REAL data:

- Dayflow HRMS
- employee name
- employee ID
- attendance date
- check-in time
- check-out time
- total worked duration
- minimum required duration: 7 hours
- whether 7-hour minimum was completed
- attendance status
- relevant attendance remarks/status if supported

## Print requirements

- professional HR-document layout
- clean typography
- clear sections
- hide sidebar/navigation/buttons while printing
- print only the attendance document
- browser `Print → Save as PDF` must work
- no hardcoded values

Do not modify payroll calculations.

---

# 11. LEAVE / TIME-OFF — EMPLOYEE VIEW

Follow the supplied hackathon specification while preserving the current leave implementation.

Employees can view **only their own** leave/time-off records.

The employee leave page should provide, where supported:

- New leave request
- leave type
- start date
- end date
- reason/remarks
- status
- leave history
- available paid time off
- available sick time off

Use real existing leave data.

Do not invent leave balances.

---

# 12. LEAVE / TIME-OFF — ADMIN / HR VIEW

Admins/HR should be able to view employee leave/time-off records.

They should be able to:

- view leave requests
- search/filter requests
- see employee name
- see start date
- see end date
- see leave type
- see status
- approve requests
- reject requests

Only authorized Admin/HR users may approve/reject.

Employees must not be able to approve/reject their own or another employee's leave through direct API calls.

Preserve the existing leave approval logic.

---

# 13. PRINTABLE LEAVE SLIP

Add:

`Print Leave Slip`

for an employee's approved leave request.

The printed document must contain:

- Dayflow HRMS
- employee name
- employee ID
- leave type
- leave start date
- leave end date
- number of days
- **leave reason/remarks**
- approval status
- approval date if available
- approver/Admin information if already available

The leave reason MUST appear on the printed document.

## Print behavior

- use real leave data
- no hardcoded values
- hide normal navigation/sidebar/buttons
- professional HR-document appearance
- browser Print → Save as PDF
- reuse existing PDF/print functionality if available
- do not change existing leave calculations/approval rules

---

# 14. PROFILE PAGE — HACKATHON SPECIFICATION

The supplied specification shows the employee's My Profile page with a profile picture and organized employee information.

Use the existing profile implementation and present the available fields professionally.

Where these fields already exist and are permitted by the current authorization model, organize them into sections/tabs such as:

- Resume
- Private Info
- Salary Info
- Security

Possible existing information includes:

### Personal/private information

- date of birth
- residing address
- nationality
- personal email
- gender
- marital status
- date of joining

### Bank information

- account number
- bank name
- IFSC code
- PAN number
- UAN number
- employee code

Do NOT invent missing fields.

Do NOT expose restricted fields to unauthorized users.

Use the existing authorization rules.

---

# 15. SALARY INFORMATION / SALARY COMPONENTS

The supplied hackathon specification includes salary configuration.

If these salary fields/components already exist in the current Dayflow application, improve/preserve their presentation.

The specification requires support for:

- wage type
- fixed wage
- salary components

Salary components may include, where supported:

- Basic
- House Rent Allowance
- Standard Allowance
- Performance Bonus
- Leave Travel Allowance
- Fixed Allowance

Each component may use:

- fixed amount
- percentage of wage

The system should calculate component amounts from the employee's defined wage where this functionality already exists.

Example from the specification:

```text
Wage = ₹50,000
Basic = 50% of wage
Basic = ₹25,000
```

If HRA = 50% of Basic:

```text
HRA = ₹12,500
```

### IMPORTANT

Do not rewrite payroll calculations if they already work.

Do not introduce salary logic unrelated to this specification.

Only modify what is necessary to support/present the requested behavior.

---

# 16. PAYROLL / PAYSLIP

Preserve the existing payroll functionality.

Do not break:

- salary calculations
- salary components
- allowances
- deductions
- net salary
- payslip generation

Attendance data should remain compatible with the existing payroll system.

The supplied specification indicates attendance records are used as the basis for payslip generation and payable days.

If unpaid leave or missing attendance is already part of the payroll rules, preserve that behavior.

Do not invent new payroll rules unless required by the existing specification/current implementation.

---

# 17. PROFESSIONAL UI / UX

All requested functionality must be integrated into the EXISTING professional Dayflow UI.

The final application should look like a real corporate HRMS.

Prefer:

- light/white or off-white background
- dark charcoal text
- subtle gray borders
- restrained accent color
- clean typography
- practical spacing
- subtle shadows
- restrained border radius
- professional tables
- clear status indicators
- responsive layout

Avoid:

- neon/glowing effects
- futuristic dark themes
- glassmorphism
- excessive gradients
- excessive animations
- giant decorative cards
- excessive rounded elements
- excessive colorful badges
- visual effects that make the application look AI-generated

The UI should prioritize usability and realism.

---

# 18. RESPONSIVENESS

Verify the existing frontend on:

- desktop
- laptop
- tablet
- mobile

Navigation, tables, forms, profile picture, dialogs, attendance timer, and print views should behave appropriately.

---

# 19. STRICT PRESERVATION RULES

Do not break:

- authentication
- Admin approval
- employee profiles
- profile editing
- attendance
- attendance history
- leave
- leave approval
- payroll
- payslips
- Admin dashboards
- existing API contracts

Reuse current models/routes/APIs whenever possible.

Do not add unnecessary dependencies.

Do not create duplicate systems.

Do not replace working backend logic merely for visual changes.

---

# 20. VERIFICATION

Run all available relevant tests and checks.

## Signup security

- Employee signup → EMPLOYEE + PENDING
- Admin role cannot be selected publicly
- Direct API attempt cannot create ADMIN
- Pending employee cannot bypass approval
- Admin login works

## Profile

- upload profile picture
- change profile picture
- default avatar when absent
- avatar appears in header
- avatar menu opens
- My Profile works
- Log Out works
- employee cards use real profile pictures

## Attendance

Test:

1. Check in.
2. Timer starts.
3. Timer updates.
4. Real check-in timestamp is stored.
5. 7-hour minimum is displayed.
6. Remaining time is displayed.
7. Checkout before 7 hours shows warning.
8. Continue Working keeps timer active.
9. Check Out Anyway records actual checkout.
10. Actual duration remains correct.
11. Checkout after 7 hours shows completion.
12. 1-second session remains approximately 1 second.
13. No fixed 5-hour/7-hour duration appears.

## Attendance slip

Verify:

- correct employee
- correct date
- check-in
- check-out
- worked duration
- 7-hour status
- attendance status
- print layout
- Save as PDF

## Leave

Verify:

- employee sees own leave records
- admin sees employee requests
- approve/reject works
- unauthorized employee cannot approve/reject
- leave reason is preserved
- Leave Slip prints the reason
- Leave Slip contains correct dates/type/status

## Payroll/Profile

Verify existing:

- profile
- salary information
- payroll
- payslip
- leave
- attendance
- Admin functionality

still works.

## Frontend

Run:

- frontend build
- available lint
- available TypeScript/type checks
- browser verification
- check browser console for errors

Review the final diff and fix errors introduced by these modifications.

---

# 21. GIT

Use the existing branch and GitHub remote.

Do not:

- create a new branch
- force-push
- rewrite history

Only commit the changes made for this task.

Do not add:

- `Co-authored-by:`
- Codex attribution
- Antigravity attribution
- OpenAI attribution
- AI-generated comments
- AI-agent metadata

Do not modify Git author identity.

Use the repository's existing Git identity.

After all verification passes:

```text
git add
git commit
git push
```

Commit message:

`feat: improve hrms attendance leave profile and security`

Push to the existing GitHub repository.

---

# FINAL INSTRUCTION

This is a modification task for the **CURRENT Dayflow HRMS application**.

Do NOT rebuild anything.
Do NOT restart the old implementation plan.
Do NOT create a new application.

Implement and integrate ALL requested requirements:

1. Public signup cannot create Admin accounts.
2. New employees remain Pending until Admin approval.
3. Employee profile picture upload/change.
4. Profile picture/avatar in header.
5. My Profile / Log Out avatar menu.
6. Employee cards with real profile pictures and work-status indicators.
7. Green present / airplane leave / yellow absent indicators.
8. Real timestamp-based attendance.
9. Live 7-hour minimum work timer.
10. Early-checkout warning with Continue Working / Check Out Anyway.
11. Actual short-session duration must remain truthful.
12. Employee attendance history.
13. Admin/HR attendance list.
14. Printable Attendance Slip.
15. Employee leave/time-off view.
16. Admin/HR leave approval/rejection.
17. Printable Leave Slip including the reason.
18. Existing profile information organized professionally.
19. Existing salary/salary-component functionality preserved where supported.
20. Existing payroll/payslip functionality preserved.
21. Professional, realistic corporate UI.
22. Responsive behavior.
23. Full verification.

Use the supplied hackathon wireframes/specification as the functional reference. Do not copy their rough visual style literally; implement the required behavior within the existing professional Dayflow design.

After implementation, verification, commit, and push, STOP.

Report only:

- changes made
- files changed
- tests/build/type-check result
- commit hash
- push result
