# Phase 02 — Auth + RBAC

## What was built

Phase 2 delivered the authentication and authorization foundation:

1. Auth API routes:
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `GET /api/auth/me`
   - `POST /api/auth/forgot-password`
   - `POST /api/auth/reset-password`
2. JWT authentication middleware (`authenticate`)
3. Role guard middleware (`checkRole`)
4. Input validation middleware (`validate`) with `express-validator`
5. Auth business logic service (`AuthService`) with:
   - campus derivation from `department_id`
   - department/faculty consistency checks
   - hall-campus match enforcement for students
   - password hashing with bcrypt
   - JWT issuance with `{ id, role, campus_id, scope }`
6. Password reset token persistence table/model (`password_reset_tokens`)

## Why it was written this way

### 1) Controllers stay thin, service owns business rules
Controllers only coordinate request/response while validation and domain logic are centralized in `AuthService`.

```js
async function register(req, res, next) {
  try {
    const user = await AuthService.register(req.body);
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}
```

This aligns with your architecture rule: business logic in services, not controllers.

---

### 2) campus_id is derived, never accepted directly
Registration explicitly rejects direct `campus_id` input and derives campus from department.

```js
if (Object.hasOwn(input, "campus_id")) {
  throw new Error("campus_id must not be provided.");
}

const department = await Department.findByPk(department_id);
// ...
campus_id: department.campus_id
```

This directly enforces the data-integrity rule from the spec.

---

### 3) Student hall must belong to derived campus
For student registration, hall validation checks campus consistency.

```js
if (hall.campus_id !== department.campus_id) {
  throw new Error("Students cannot register with a hall from a different campus.");
}
```

This prevents cross-campus registration mismatches at the API layer.

---

### 4) JWT + active user enforcement
`authenticate` verifies token signature and user activity before granting access.

```js
const payload = jwt.verify(token, process.env.JWT_SECRET);
const user = await User.findByPk(payload.id);
if (!user || !user.is_active) {
  return res.status(401).json({ message: "Authentication failed." });
}
```

This ensures disabled users cannot continue using old tokens.

---

### 5) Password reset stored securely
Reset tokens are generated random, stored as SHA-256 hash, and expire.

```js
const resetToken = crypto.randomBytes(32).toString("hex");
const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
```

Only the hash is persisted in `password_reset_tokens`; raw token is returned in non-production for now (mail phase is deferred).

---

### 6) Password hash never exposed
All user responses are returned through a sanitizer object that excludes `password_hash`.

```js
function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
    // password_hash intentionally omitted
  };
}
```

This enforces your hard security rule for every auth response.

## New/updated files (phase 2)

- `server/routes/authRoutes.js`
- `server/controllers/authController.js`
- `server/services/AuthService.js`
- `server/middleware/authenticate.js`
- `server/middleware/checkRole.js`
- `server/middleware/validate.js`
- `server/models/PasswordResetToken.js`
- `server/migrations/20260505095500-create-password-reset-tokens.js`
- `server/app.js` (route mounting)
- `server/models/User.js` (reset-token association)

## Verification outcome

Phase checks confirmed:

- register/login/me flow works with JWT
- forgot/reset password flow works (with persisted reset tokens)
- login succeeds with new password after reset
- direct `campus_id` input is rejected
- cross-campus student hall registration is rejected
- password hash is not returned in auth responses

Phase 2 is complete and ready for Phase 3 (Ticket Core + routing service).
