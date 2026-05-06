# Phase 08 — Frontend Core

## What was built

Phase 8 delivered the frontend foundation and connected it to backend APIs:

1. Vite React app bootstrap (`index.html`, `vite.config.js`, `main.jsx`)
2. Global app shell and routing (`App.jsx`, `AppLayout`, `ProtectedRoute`)
3. Auth state management (`AuthContext`)
4. Core public pages:
   - Landing (`/`)
   - Login (`/login`)
   - Register (`/register`) with 4-step flow
   - Forgot password (`/forgot-password`)
   - Reset password (`/reset-password/:token`)
5. Initial authenticated dashboard shell (`/dashboard`) with role-adaptive overview copy
6. API service layer:
   - `auth.js`
   - `reference.js`
   - `api.js` with JWT interceptor
7. Backend support for registration UI dropdowns:
   - `GET /api/reference/campuses`
   - `GET /api/reference/faculties`
   - `GET /api/reference/departments`
   - `GET /api/reference/halls`
   - `GET /api/reference/categories`

## Why it was written this way

### 1) Separate auth + reference services
Auth and reference data calls are split to keep page logic simple and avoid tightly coupling forms to raw Axios calls.

```js
export async function getDepartments(facultyId) {
  const { data } = await api.get("/reference/departments", {
    params: facultyId ? { faculty_id: facultyId } : {}
  });
  return data.items || [];
}
```

---

### 2) Registration form mirrors backend validation
The 4-step registration UI maps directly to backend rules:
- user type selection (`student | staff | lecturer`)
- faculty -> department cascade
- conditional hall block for students
- student registration number enforcement

This reduces frontend/backend mismatch risk.

---

### 3) Protected routing via context
`ProtectedRoute` uses `AuthContext` to guard private routes and keep auth behavior centralized.

```jsx
if (!isAuthenticated) {
  return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
```

---

### 4) Backend route ordering fixed for frontend bootstrap
Reference routes were mounted before generic `/api` authenticated routes so registration dropdown data is reachable without accidental auth interception.

## Files added/updated

### Frontend
- `client/index.html`
- `client/vite.config.js`
- `client/src/main.jsx`
- `client/src/styles.css`
- `client/src/App.jsx`
- `client/src/context/AuthContext.jsx`
- `client/src/components/AppLayout.jsx`
- `client/src/components/ProtectedRoute.jsx`
- `client/src/pages/LandingPage.jsx`
- `client/src/pages/LoginPage.jsx`
- `client/src/pages/RegisterPage.jsx`
- `client/src/pages/ForgotPasswordPage.jsx`
- `client/src/pages/ResetPasswordPage.jsx`
- `client/src/pages/DashboardShell.jsx`
- `client/src/pages/NotFoundPage.jsx`
- `client/src/services/api.js`
- `client/src/services/auth.js`
- `client/src/services/reference.js`

### Backend support
- `server/controllers/referenceController.js`
- `server/routes/referenceRoutes.js`
- `server/app.js` (CORS + reference route mounting order)

## Verification outcome

1. Frontend production build succeeds (`npm run build -w client`).
2. Backend health endpoints still pass.
3. Reference endpoints return real data used by registration cascade (`faculties/departments/halls`).
4. Prior backend auth/ticket features remain intact (route structure preserved).

Phase 8 is complete and stable. Next phases can build ticket UI, role dashboards, and analytics visuals on top of this foundation.
