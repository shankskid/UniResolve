# Phase 01 — Foundation

## What was built

Phase 1 established the backend/data foundation for UniResolve:

1. Monorepo scaffolding for `client`, `server`, `shared`
2. Sequelize wiring and CLI setup
3. Initial full database schema migration
4. Structural seeders for campuses/faculties/departments/hall zones/halls/categories
5. Shared domain constants to enforce normalized roles and jurisdictions
6. Basic server health endpoints including DB connectivity

## Why it was written this way

### 1) Shared constants first (single source of truth)
I put roles, jurisdiction values, ticket statuses, urgency levels, and policy constraints in `shared/` so both backend and frontend can consume the same values and avoid drift.

```js
const JURISDICTIONS = Object.freeze({
  HALL: "hall",
  DEPARTMENT: "department",
  CAMPUS: "campus",
  UNIVERSITY: "university"
});

function normalizeJurisdiction(value) {
  if (value === "dept") {
    return JURISDICTIONS.DEPARTMENT;
  }
  return value;
}
```

This directly enforces the earlier clarification to normalize `dept` → `department`.

---

### 2) Migration-first schema for reproducibility
The full schema is created through a single migration (`20260505092000-initial-schema.js`) so any environment can be recreated exactly through migration commands.

```js
await queryInterface.createTable("tickets", {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: Sequelize.literal("gen_random_uuid()") },
  title: { type: DataTypes.STRING(300), allowNull: false },
  status: { type: DataTypes.ENUM(...TICKET_STATUS_VALUES), allowNull: false, defaultValue: "open" },
  urgency: { type: DataTypes.ENUM(...URGENCY_VALUES), allowNull: false },
  assigned_to: { type: DataTypes.UUID, allowNull: true, references: { model: "users", key: "id" } },
  is_anonymous: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  sla_deadline: { type: DataTypes.DATE, allowNull: true },
  deleted_at: { type: DataTypes.DATE, allowNull: true }
});
```

This matches your hard requirements: UUIDs, SLA fields, and soft-delete support.

---

### 3) Circular FK handled safely
`hall_zones.grievance_officer_id` points to `users.id`, but `users` itself depends on structural tables.  
To avoid migration deadlocks, the FK is added after both tables exist.

```js
await queryInterface.addConstraint("hall_zones", {
  fields: ["grievance_officer_id"],
  type: "foreign key",
  references: { table: "users", field: "id" },
  onUpdate: "CASCADE",
  onDelete: "SET NULL",
  name: "hall_zones_grievance_officer_id_fkey"
});
```

---

### 4) Deterministic seeding
Seed IDs are generated from stable hashes in `seeders/data/structure.js`, so seed output is consistent across machines and reruns.

```js
const crypto = require("crypto");

function fixedUuid(seed) {
  const hex = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
```

This solved duplicate-ID collisions and gives predictable references for future seed relationships.

---

### 5) Server health and DB health endpoints
`server/app.js` exposes:
- `/health` for service liveliness
- `/health/db` for DB connectivity

```js
app.get("/health/db", async (_req, res, next) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    next(error);
  }
});
```

This gives quick diagnostics before any feature routes are added.

## Files introduced in this phase (high-impact)

- `server/migrations/20260505092000-initial-schema.js`
- `server/models/*` (all core + feature models)
- `server/seeders/01-campuses.js` … `06-categories.js`
- `server/seeders/data/structure.js`
- `server/config/config.cjs`, `server/config/database.js`, `server/.sequelizerc`
- `shared/constants/domain.js`, `shared/constants/policies.js`
- `server/app.js` (health + DB health)

## Phase 1 result

Schema and structural data foundation are in place and validated:
- 8 campuses
- 11 faculties
- 55 departments
- 16 hall zones
- 80 halls
- 16 categories

This completes the base required to begin Phase 2 (auth + RBAC).
