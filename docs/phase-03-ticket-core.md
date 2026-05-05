# Phase 03 — Ticket Core

## What was built

Phase 3 implemented core ticket operations and automatic routing:

1. `POST /api/tickets` (student/staff/lecturer submission)
2. `GET /api/tickets` (role-scoped listing)
3. `GET /api/tickets/:id` (single ticket with anonymous masking rules)
4. `PATCH /api/tickets/:id/status` (officer/admin status updates)
5. `PATCH /api/tickets/:id/assign` (overseer/admin reassignment)
6. `POST /api/tickets/:id/escalate` (officer/overseer escalation)
7. `TicketRouter.assign()` with jurisdiction-based deterministic assignment
8. SLA deadline calculation at ticket creation
9. Mandatory `ticket_history` logging for assignment/status/escalation events

## Why it was written this way

### 1) Routing logic is centralized in `TicketRouter`
All assignment decisions live in one service so controllers/routes cannot drift from policy.

```js
const route = await TicketRouter.assign({ category, submitter, transaction });

const ticket = await Ticket.create({
  assigned_to: route.assignee ? route.assignee.id : null,
  jurisdiction_type: route.jurisdiction
}, { transaction });
```

This follows your architecture rule: routing logic only in `server/services/TicketRouter.js`.

---

### 2) SLA is set immediately on creation
The creation flow computes deadline from urgency and stores `sla_deadline` at insert time.

```js
const minutesByUrgency = {
  urgent: 24 * 60,
  high: 72 * 60,
  medium: 7 * 24 * 60,
  low: 14 * 24 * 60
};
```

This ensures downstream SLA automation can run without recomputing missing fields.

---

### 3) Anonymous masking is applied by viewer role
Officer-facing responses mask submitter identity when `is_anonymous=true`, while campus/uni admins retain visibility.

```js
if (ticketJson.is_anonymous && ![ROLES.CAMPUS_ADMIN, ROLES.UNIVERSITY_ADMIN].includes(viewerRole)) {
  ticketJson.submitter = { name: "Anonymous", email: null, department_id: null };
}
```

This matches the rule that admins can identify anonymous submitters but officers cannot.

---

### 4) Role-scoped visibility is enforced at query level
Ticket queries are filtered by role/scope before data is returned:
- students/staff/lecturers -> own tickets only
- grievance officers -> assigned queue
- hall overseers -> hall tickets in their campus
- faculty overseers -> department-track tickets in scoped faculties
- campus admin -> campus tickets
- university admin -> all

This prevents leaking records across role boundaries.

---

### 5) Hard constraints are enforced in core service

Implemented checks include:
- staff/lecturer cannot create hall-jurisdiction tickets
- harassment category cannot be submitted with non-urgent urgency
- overseers cannot be assigned to tickets (`canBeAssignedRole`)
- assignment/status/escalation all write to `ticket_history`

```js
if (!canBeAssignedRole(assignee.role)) {
  throw new Error("Overseers cannot be assigned tickets.");
}
```

---

### 6) Multi-write actions use transactions
Create, assign, status update, and escalation flows run in Sequelize transactions to preserve consistency between ticket state and history/audit rows.

## Files added/updated

- `server/services/TicketRouter.js`
- `server/services/TicketService.js`
- `server/services/NotificationService.js` (in-app notify helper for routing fallback)
- `server/controllers/ticketsController.js`
- `server/routes/ticketRoutes.js`
- `server/app.js` (mounted `/api/tickets`)

## Verification outcome

End-to-end checks confirmed:

- student/staff registration and auth still work
- student hall ticket creation auto-assigns to hall grievance officer
- staff hall-jurisdiction ticket creation is rejected
- anonymous ticket shows submitter as `Anonymous` to officer
- campus admin can still view real submitter on anonymous ticket
- status update succeeds and writes history
- escalation succeeds and writes escalation + history
- reassignment succeeds and blocks overseer assignment policy
- SLA deadline is set at creation

Phase 3 is complete and ready for Phase 4 (notification trigger expansion + automation integration).
