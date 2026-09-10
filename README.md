# Smart Hospital Management System

Full-stack app with a **local database** — no cloud service required.

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express (plain REST API, JWT auth)
- **Database:** Microsoft SQL Server, running locally — the same database you can open, browse, and query in **SSMS (SQL Server Management Studio)**

This is a working starting point that implements the architecture from the project plan — not a finished, feature-complete product. See "What's fully wired up" vs. "What's scaffolded" below.

## Access model

- **Public / patient site** (`/`, `/departments`, `/doctors`, `/book`, `/assistant`, `/reviews`) — fully open, no login.
- **Admin panel** (`/admin/login` → `/admin/dashboard`) — separate login route and dashboard shell.
- **Doctor panel** (`/doctor/login` → `/doctor/appointments`) — separate login route and dashboard shell.

## 1. Set up the database in SSMS

1. Install **SQL Server** (Express edition is free) and **SQL Server Management Studio (SSMS)** if you don't have them.
2. In SSMS, connect to your local instance (e.g. `localhost` or `.\SQLEXPRESS`), then create the database:
   ```sql
   CREATE DATABASE SmartHospitalDB;
   ```
3. Open `backend/sql/01_schema.sql` in SSMS, select `SmartHospitalDB` as the target database, and run it. This creates every table (staff, employees, payroll, departments, doctors, patients, appointments, prescriptions, pharmacy, reviews, AI messages, etc).
4. Make sure **SQL Server Authentication** is enabled (Server Properties → Security) and that you have a login (e.g. `sa`) with a password — the backend connects with a username/password, not Windows Authentication, by default. In SSMS: **Security → Logins → sa → Properties** to set/enable it, and enable **TCP/IP** in SQL Server Configuration Manager if it's off.

## 2. Set up the backend (Express API)

```bash
cd backend
npm install
cp .env.example .env     # then fill in your SQL Server credentials
```

Edit `.env`:
```
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=SmartHospitalDB
DB_USER=sa
DB_PASSWORD=YourStrong!Passw0rd
JWT_SECRET=<any long random string>
ANTHROPIC_API_KEY=sk-ant-...        # for the AI Health Assistant
SMTP_HOST=...                        # optional, for real emails
```

Seed demo data — **10+ doctors per department**, sample medicines/patients/appointments/reviews, and your first Admin + Doctor logins:
```bash
npm run seed
```
This prints the seeded login credentials to the console:
```
Admin login  -> email: admin@hospital.local   password: Admin@123
Doctor login -> email: doctor@hospital.local  password: Doctor@123
```

Start the API:
```bash
npm run dev
```
It runs at `http://localhost:5000`. You can open `http://localhost:5000/api/health` in a browser to confirm it's up, and browse every table it reads/writes directly in SSMS at any time.

## 3. Set up the frontend

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:5000/api
npm run dev
```

Visit `http://localhost:5173`.

- Public site works immediately.
- `/admin/login` — sign in with the seeded Admin account.
- `/doctor/login` — sign in with the seeded Doctor account.

## What's fully wired up

- Public site: Home, Departments, Doctors (search/filter), Doctor profile + reviews, open appointment booking (creates the patient + appointment rows in one call, triggers a confirmation email), Reviews.
- AI Health Assistant chat UI, calling the backend which calls Claude — bilingual (English / Urdu / Roman Urdu), API key stays server-side.
- Admin: dedicated login (JWT), dashboard with live counts, Doctors list + add-doctor form, Appointments list with confirm action, Pharmacy stock overview, basic Reports.
- Doctor: dedicated login (JWT), appointments scoped to the signed-in doctor (`/api/appointments/mine`), consultation + prescription form that writes to `prescriptions`/`prescription_details` and marks the appointment completed.
- Full SQL Server schema for every table in the plan, and 10+ doctors seeded per department — open `backend/sql/01_schema.sql` any time to see or extend it in SSMS.

## What's scaffolded / left as a next step

- Employee & payroll screens (tables exist; no admin UI yet).
- Full pharmacy point-of-sale screen for Pharmacists — `POST /api/pharmacy/sales` already handles stock deduction, loyalty customer creation, and receipt emailing; it just needs a form.
- Review moderation UI for Admin (approve/hide) — `PATCH /api/reviews/:id` is ready.
- Charts on the Reports page (numbers are live; add a charting library like Recharts).
- WhatsApp delivery for appointment confirmations (email is fully wired via `SMTP_*` env vars).

## How authentication works (no cloud auth provider)

- Passwords are hashed with **bcrypt** and stored in `staff_users.password_hash`.
- Login (`POST /api/auth/login`) checks the password and issues a **JWT** signed with `JWT_SECRET`.
- The frontend stores the JWT in `localStorage` and sends it as `Authorization: Bearer <token>` on every request to a protected route.
- Express middleware (`src/middleware/auth.js`) verifies the token and checks the role — `requireRole('admin')`, `requireRole('doctor')`, etc. — mirroring the access model from the project plan without needing Postgres Row Level Security or any external auth service.

## Project structure

```
backend/
  sql/01_schema.sql     -- run this in SSMS to create every table
  scripts/seed.js        -- seeds departments, 10+ doctors each, demo data, admin/doctor logins
  src/
    server.js            -- Express app entry point
    db.js                 -- SQL Server connection pool (mssql driver)
    middleware/auth.js     -- JWT verification + role checks
    routes/                -- one file per resource (auth, doctors, appointments, ...)
    utils/                  -- email (nodemailer) + Claude API helper
frontend/
  src/
    lib/apiClient.ts      -- typed fetch wrapper for the Express API
    pages/public/          -- open patient-facing site
    pages/admin/            -- Admin panel (separate login/layout)
    pages/doctor/            -- Doctor panel (separate login/layout)
    components/, hooks/
```
