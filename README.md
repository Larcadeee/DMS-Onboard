# DMS-Onboard

DMS-Onboard is a full-stack onboarding and competency management system for newly hired Emergency Telecommunicators in the CDRRMD Dispatch Management Section.

The application combines a Next.js administrative and trainee portal with a Laravel API. It addresses the operational lifecycle of onboarding by bringing trainees, onboarding programs, curriculum phases and modules, learning materials, training sessions, attendance, assessments, competency evaluations, approvals, reports, notifications, and audit records into one permission-controlled system.

## Project Structure

```text
.
├── backend/    Laravel 13 API, migrations, seeders, and SQLite database
├── frontend/   Next.js 16 and React 19 web application
└── README.md
```

## Features

- Role-based access for administrators, training supervisors, trainers/evaluators, and trainees
- Trainee registration, profiles, documents, enrollment, and onboarding progress
- Onboarding programs and versioned curriculum phases and training modules
- Training materials, schedules, attendance, and session management
- Assessments, submitted results, competency evaluations, and final approvals
- Trainee portal for the assigned program, materials, schedule, assessments, and history
- Dashboard summaries, reports, notifications, audit logs, and system settings

## Prerequisites

Install the following tools before setup:

- PHP 8.4.1 or newer
- Composer
- Node.js and npm
- SQLite support for PHP

The backend requires PHP 8.4.1 or newer, Laravel 13.17 or newer within the Laravel 13 release, and Laravel Sanctum 4.

## Installation and Getting Started

Run the backend and frontend in separate terminals.

### 1. Configure the Laravel API

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
```

The example environment uses SQLite. `database/database.sqlite` is the configured database file. The migration and seeding commands create the schema and seed roles, permissions, and demonstration data.

Set these backend values in `backend/.env`:

```dotenv
APP_URL=http://localhost:8000
DB_CONNECTION=sqlite
SESSION_COOKIE=cdrrmd-session
SESSION_DOMAIN=
SESSION_SECURE_COOKIE=false
SESSION_SAME_SITE=lax
```

`GOOGLE_CLIENT_ID` is optional. To enable Google Sign-In, set the same Google OAuth client ID in both environments:

```dotenv
# backend/.env
GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

```dotenv
# frontend/.env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

Do not publish either private credentials or service credentials; only the public browser client ID belongs in `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

Start the API:

```bash
php artisan serve
```

The API listens at `http://127.0.0.1:8000` by default.

### 2. Configure the Next.js frontend

Open a second terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The frontend is available at `http://localhost:3000`.

The local frontend defaults to the Laravel API at `http://127.0.0.1:8000`, so no additional API URL configuration is required for the standard setup. The source also supports these optional environment settings:

```dotenv
# Optional public API base; leave unset to use Next.js rewrites
NEXT_PUBLIC_API_URL=

# Optional session idle timeout in minutes; defaults to 60
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=60

# Optional server-side/API proxy settings
API_PROXY_TARGET=http://127.0.0.1:8000
API_SESSION_COOKIE=cdrrmd-session
```

If `NEXT_PUBLIC_API_URL` is set, it must point to a URL that is correctly configured for session cookies and Sanctum CSRF. `API_PROXY_TARGET` and `API_SESSION_COOKIE` must match the Laravel server and the `SESSION_COOKIE` value in `backend/.env`.

### Optional Composer setup command

The backend also exposes a Laravel setup script:

```bash
cd backend
composer run setup
```

This installs Composer dependencies, creates `.env` from `.env.example` if missing, generates the application key, runs migrations, installs backend npm dependencies, and builds backend assets. It does not create `database/database.sqlite`; create that file first when it does not already exist.

## Deploying the frontend to Vercel

This repository keeps the Next.js app in `frontend/`, so Vercel must use that folder as the project root:

1. In Vercel, create or open the project connected to this repository.
2. Go to **Settings → Build and Deployment** and set **Root Directory** to `frontend`. Save the setting.
3. Keep the framework preset set to **Next.js** (or let Vercel detect it), and use the default install and build commands.
4. Redeploy.

The `package.json` and lockfile Vercel needs are in `frontend/`; deploying with the repository root as the project root causes the “Failed to locate `package.json`” error. The Laravel backend is a separate application and must be deployed and configured separately. For a deployed frontend, configure `API_PROXY_TARGET` in the Vercel project's environment variables to point to the reachable Laravel API, and configure Laravel's production session, Sanctum, and CORS settings for the deployed frontend origin.

## Usage

Open `http://localhost:3000` and sign in. The root route redirects to the login page.

Demo accounts created by `php artisan migrate --seed`:

| Role | Email | Password |
|---|---|---|
| Training Supervisor | `supervisor@cdrrmd.gov.ph` | `Supervisor@12345` |
| Trainer / Evaluator | `trainer@cdrrmd.gov.ph` | `Trainer@12345` |
| Trainee | `trainee.ana@cdrrmd.gov.ph` | `Trainee@12345` |
| Trainee | `trainee.ben@cdrrmd.gov.ph` | `Trainee@12345` |
| Trainee | `trainee.carla@cdrrmd.gov.ph` | `Trainee@12345` |

These credentials are demonstration data and should be changed or removed outside local development.

### Main navigation

Administrators and authorized staff can access:

- Dashboard and onboarding progress
- Trainees and onboarding programs
- Training curriculum and materials
- Training schedule and attendance
- Assessments and assessment results
- Competency framework and evaluations
- Reports and analytics
- Users, roles and permissions, audit logs, and settings

Trainees are redirected to a personal portal with dashboard, program, learning materials, schedule, assessments, competencies, attendance, and training history.

### API access

Application API routes are under `/api/v1`. Public routes include login, registration, and Google authentication. Most data routes require an authenticated Sanctum session and, where applicable, a role permission.

Example after an active browser session:

```bash
curl -i http://127.0.0.1:8000/api/v1/user
```

The normal application uses cookie-based Laravel sessions rather than a manually supplied bearer token.

## Development Commands

### Backend

```bash
cd backend
php artisan serve
php artisan migrate
php artisan migrate:fresh --seed
php artisan test
composer run test
composer run dev
```

Use `migrate:fresh --seed` only in development because it drops and recreates the database.

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run start
npm run lint
```

## License

The backend's [Composer manifest](backend/composer.json) declares MIT as the project license, and Laravel dependencies are MIT-licensed as shown in the framework package. However, this repository does not currently contain a root `LICENSE` or `LICENSE.md` file, and the frontend package also does not declare a project license. Confirm the intended project-wide license and add a standalone license file before distributing or publishing DMS-Onboard.
