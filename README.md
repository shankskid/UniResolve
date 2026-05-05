# UniResolve

UniResolve is a full-stack university grievance management system built with React, Node.js/Express, and PostgreSQL.

## Monorepo structure

- `client/` React frontend
- `server/` Node.js + Express backend
- `shared/` shared constants and policy helpers

## Standards already enforced

1. **Jurisdiction enum normalized** to `hall | department | campus | university`.
2. **Role model is explicit (9 roles)**:
   `student, staff, lecturer, hall_grievance_officer, hall_overseer, dept_grievance_officer, faculty_overseer, campus_admin, university_admin`.
3. **Anonymous submission contract** defined in shared constants.
4. **Overseer assignment guard** defined in policy constants (overseers are non-assignable).

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+

## Environment

Create `server/.env`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgres://uniresolve_app:CHANGE_ME@localhost:5432/uniresolve_dev
DATABASE_TEST_URL=postgres://uniresolve_app:CHANGE_ME@localhost:5432/uniresolve_test
JWT_SECRET=REPLACE_WITH_64+_CHAR_RANDOM_SECRET
JWT_EXPIRY=7d
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=uploads
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```

## Setup

```bash
npm install
npm run db:migrate -w server
npm run db:seed -w server
```

## Current progress

- Phase 1 (Foundation) completed:
  - Sequelize config + DB wiring
  - Initial schema migration
  - Structural seeders (8 campuses, 11 faculties, 55 departments, 16 hall zones, 80 halls, 16 categories)
