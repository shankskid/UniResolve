# Phase 07 — Analytics, Reports, and Audit Log

## What was built

Phase 7 implemented the analytics/reporting layer:

1. **Analytics endpoints**
   - `GET /api/analytics/overview`
   - `GET /api/analytics/officer/:id`
   - `GET /api/analytics/by-category`
   - `GET /api/analytics/sla-compliance`
   - `GET /api/analytics/campus-comparison`
2. **Reporting endpoint**
   - `GET /api/reports/export` (CSV)
3. **Audit endpoint**
   - `GET /api/audit-log`

## Why it was written this way

### 1) Central analytics service for consistent scope logic
All aggregation logic is centralized in `AnalyticsService`, including role checks and campus scoping.

```js
if (user.role === ROLES.CAMPUS_ADMIN) {
  where.campus_id = user.campus_id;
}
```

This avoids duplicated and inconsistent role filtering across controllers.

---

### 2) Campus/uni access boundaries are enforced in service layer
- Campus admins are restricted to their campus for overview, category analytics, SLA analytics, export, and audit log.
- Campus comparison is university-admin only.

This keeps sensitive cross-campus insights limited to university admins.

---

### 3) CSV export is generated from model data, not raw SQL
Ticket rows are pulled with Sequelize includes and serialized to CSV with escaping.

```js
const csv = [header, ...rows]
  .map((line) => line.map(escapeCsv).join(","))
  .join("\\n");
```

This complies with your no-raw-SQL architecture rule.

---

### 4) Audit log is queryable and scope-safe
`/api/audit-log` supports filters (`user`, `ticket_id`, `action`, `from`, `to`) and for campus admins only returns entries tied to tickets in their campus.

## Files added/updated

- `server/services/AnalyticsService.js`
- `server/controllers/analyticsController.js`
- `server/routes/analyticsRoutes.js`
- `server/routes/reportRoutes.js`
- `server/models/SatisfactionSurvey.js` (ticket association)
- `server/models/TicketHistory.js` (ticket association)
- `server/app.js` (analytics/report route mounts)

## Verification outcome

Phase verification passed:

1. Regression checks for existing ticket workflow still pass.
2. `overview` works for campus admin and university admin.
3. `officer/:id` returns per-officer metrics.
4. `by-category` and `sla-compliance` return structured analytics.
5. `campus-comparison` works for uni admin and is blocked for campus admin.
6. `reports/export` returns valid CSV with expected headers.
7. `audit-log` returns entries array and respects auth/scope.

Phase 7 is complete and stable with prior phases preserved.
