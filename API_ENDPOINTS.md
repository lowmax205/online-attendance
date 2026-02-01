# API Endpoints and Server Actions

This document summarizes API routes and server actions available in the project.

## API Routes (App Router)

These are HTTP endpoints under /api.

- `GET/POST /api/auth/session` — Session handling. (src/app/api/auth/session/route.ts)
- `GET /api/cron/update-event-status` — Scheduled status updates for events. (src/app/api/cron/update-event-status/route.ts)
- `GET /api/events/upcoming` — Upcoming events feed. (src/app/api/events/upcoming/route.ts)
- `GET /api/templates/event-print` — Event print template. (src/app/api/templates/event-print/route.ts)

## Server Actions (Domain Actions)

These are server-side functions used by pages/components. They are not HTTP endpoints by default but represent the main backend operations.

### Admin

- `system-config` — System configuration management. (src/actions/admin/system-config.ts)
- `users` — User administration (create/update/filter). (src/actions/admin/users.ts)

### Attendance

- `submit` — Submit attendance record. (src/actions/attendance/submit.ts)
- `verify` — Verify attendance. (src/actions/attendance/verify.ts)
- `validate-qr` — Validate QR payload. (src/actions/attendance/validate-qr.ts)
- `check-duplicate` — Prevent duplicate submissions. (src/actions/attendance/check-duplicate.ts)
- `appeal` — Attendance appeal flow. (src/actions/attendance/appeal.ts)
- `list-mine` — List current user’s attendance. (src/actions/attendance/list-mine.ts)
- `list-by-event` — List attendance by event. (src/actions/attendance/list-by-event.ts)
- `get-for-verification` — Load entries awaiting verification. (src/actions/attendance/get-for-verification.ts)
- `export` — Attendance export routines. (src/actions/attendance/export.ts)

### Auth

- `register` — User registration. (src/actions/auth/register.ts)
- `login` — User login. (src/actions/auth/login.ts)
- `logout` — User logout. (src/actions/auth/logout.ts)
- `refresh` — Refresh tokens/session. (src/actions/auth/refresh.ts)
- `get-temp-password-warning` — Temporary password notice. (src/actions/auth/get-temp-password-warning.ts)

### Dashboard

- `admin` — Admin dashboard data. (src/actions/dashboard/admin.ts)
- `moderator` — Moderator dashboard data. (src/actions/dashboard/moderator.ts)
- `student` — Student dashboard data. (src/actions/dashboard/student.ts)

### Events

- `create` — Create event. (src/actions/events/create.ts)
- `update` — Update event. (src/actions/events/update.ts)
- `delete` — Delete event. (src/actions/events/delete.ts)
- `list` — List events. (src/actions/events/list.ts)
- `get-by-id` — Get event by ID. (src/actions/events/get-by-id.ts)
- `get-by-code` — Get event by code. (src/actions/events/get-by-code.ts)
- `generate-qr` — Generate QR for event. (src/actions/events/generate-qr.ts)
- `download-qr` — Download event QR. (src/actions/events/download-qr.ts)
- `get-attendance-map-data` — Map data for attendance. (src/actions/events/get-attendance-map-data.ts)

### Export

- `export-attendance` — Export attendance data. (src/actions/export/export-attendance.ts)

### Moderator

- `attendance` — Moderator attendance workflows. (src/actions/moderator/attendance.ts)

### Profile

- `create` — Create profile. (src/actions/profile/create.ts)
- `update` — Update profile. (src/actions/profile/update.ts)
- `change-password` — Change password. (src/actions/profile/change-password.ts)
- `delete-document` — Remove profile document. (src/actions/profile/delete-document.ts)

## Notes

- Server Actions are invoked from components and pages; they are not public HTTP endpoints unless wrapped by route handlers.
- For deployment, ensure environment variables in .env are configured for production services as needed.
