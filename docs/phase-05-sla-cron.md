# Phase 05 — SLA Cron Checker

## What was built

Phase 5 adds SLA monitoring automation with a cron job:

1. `server/jobs/slaChecker.js` created using `node-cron`
2. Scheduler runs every 15 minutes (`*/15 * * * *`)
3. Added one-off runner function `runSlaCheckOnce()` for deterministic testing
4. Added npm script:
   - `npm run sla:check -w server`

## SLA behavior implemented

For active tickets (`open`, `in_progress`, `pending_review`) with a non-null SLA deadline:

1. Compute SLA elapsed %
2. At >=75% and <100%:
   - notify assigned officer (in-app + deferred email hook)
   - write `ticket_history` (`field_changed = sla_warning_75`, `changed_by = SYSTEM`)
3. At >=100%:
   - set `sla_breached = true`
   - notify overseer layer based on jurisdiction
   - auto-escalate if ticket is still `open`
   - write `ticket_history` entries for breach and auto-escalation

## Why it was written this way

### 1) Idempotent by history markers
The job checks existing SYSTEM history entries before writing warning/breach again.  
This prevents duplicate warning/breach notifications across repeated cron runs.

```js
const alreadyWarned = await historyExists(ticket.id, "sla_warning_75", transaction);
if (alreadyWarned) return;
```

---

### 2) Role-aware overseer notifications
Breach recipients are resolved using governance hierarchy:
- hall tickets -> hall overseers on campus
- department tickets -> faculty overseers of submitter faculty
- campus tickets -> campus admins
- university tickets -> university admins

This keeps alert scope consistent with role responsibilities.

---

### 3) SYSTEM audit trail is enforced
Every automated SLA action writes to `ticket_history` with `changed_by = SYSTEM`.

```js
await writeSystemHistory(ticket.id, "sla_breach", priorBreached, true, transaction);
await writeSystemHistory(ticket.id, "sla_auto_escalation", null, targetRole, transaction);
```

---

### 4) Safe cron + testability
The job exports:
- `startSlaChecker()` for live scheduled execution
- `runSlaCheckOnce()` for deterministic verification and local tests

This avoids testing through sleeping/waiting for real cron intervals.

## Files added/updated

- `server/jobs/slaChecker.js`
- `server/package.json` (new script `sla:check`)

## Verification outcome

Targeted checks passed:

1. Ticket at ~80% SLA -> warning notification + SYSTEM history (`sla_warning_75`)
2. Ticket beyond deadline -> breach flag set + SYSTEM history (`sla_breach`)
3. Breached open ticket -> auto-escalation row + SYSTEM history (`sla_auto_escalation`)
4. Overseer receives breach notification
5. Re-running checker does not duplicate warning/breach history entries

Phase 5 is complete and ready for Phase 6 (comments, attachments, anonymous public endpoint, canned responses, KB, surveys, checklists).
