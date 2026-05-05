# Phase 04 — Notifications & Trigger Automation (In-App First)

## What was built

Phase 4 implemented notification infrastructure and connected it to ticket lifecycle events:

1. Expanded `NotificationService` with:
   - in-app creation helpers (`createInAppNotification`, `notifyMany`)
   - unread listing
   - mark-one-read
   - mark-all-read
   - deferred email sender (`sendEmail`) with env-based transport setup
2. Added notification API routes:
   - `GET /api/notifications` (own unread)
   - `PATCH /api/notifications/:id/read`
   - `PATCH /api/notifications/read-all`
3. Added notification controller layer.
4. Wired automation triggers in `TicketService` for currently implemented ticket events:
   - ticket submitted -> assignee notified
   - harassment/discrimination urgent ticket -> all university admins notified
   - status updated -> submitter notified
   - reassigned -> new assignee + submitter notified
   - escalated -> target-role users notified (hall/faculty/university based on escalation target)

## Why it was written this way

### 1) Centralized event notification service
All notification writes go through `NotificationService`, keeping trigger points concise and avoiding duplicated DB logic.

```js
await NotificationService.notifyMany(
  [route.assignee.id],
  {
    ticket_id: ticket.id,
    type: "ticket_assigned",
    message: `You have been assigned ticket ${ticket.id}.`
  },
  transaction
);
```

---

### 2) Deferred mail handled explicitly (not silently)
`sendEmail` now checks SMTP configuration and returns an explicit skipped result if not configured, so the project can continue with in-app notifications until final mail phase.

```js
const transporter = buildTransporter();
if (!transporter) {
  return { skipped: true, reason: "Email transport not configured." };
}
```

This matches your decision to implement full mail infra later while keeping trigger code paths in place now.

---

### 3) Notification ownership is enforced
Mark-read endpoints update only rows where `notification.user_id === req.user.id`; cross-user updates are blocked.

```js
await Notification.update(
  { is_read: true },
  { where: { id: notificationId, user_id: userId } }
);
```

---

### 4) Escalation target notifications are role-aware
Escalation notifications resolve recipients by escalation target role:
- hall -> hall overseers on campus
- department -> faculty overseers for submitter faculty scope
- campus/university -> university admins

This keeps notification recipients aligned with ticket governance hierarchy.

## Files added/updated

- `server/services/NotificationService.js`
- `server/controllers/notificationsController.js`
- `server/routes/notificationRoutes.js`
- `server/services/TicketService.js` (trigger wiring)
- `server/app.js` (mounted `/api/notifications`)

## Verification outcome

Phase 4 checks confirmed:

- notification created for assignee on ticket submission
- submitter notified on status update
- campus admin/new assignee notified on reassignment
- hall overseer receives escalation notification for hall tickets
- `GET /api/notifications` returns unread own notifications
- `PATCH /api/notifications/:id/read` marks one notification
- `PATCH /api/notifications/read-all` clears unread queue for current user

Phase 4 is complete and ready for Phase 5 (SLA cron + breach/warning automation).
