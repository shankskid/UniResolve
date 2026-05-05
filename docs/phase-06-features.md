# Phase 06 — Advanced Features (Comments, Attachments, Anonymous, KB, Surveys, Checklists)

## What was built

Phase 6 implemented the feature layer requested in the spec:

1. **Public anonymous submission**
   - `POST /api/submit-anonymous`
   - Restricted to sensitive categories (currently enforced via category name list)
2. **Ticket comments**
   - `POST /api/tickets/:id/comments`
   - `GET /api/tickets/:id/comments`
   - Internal comments (`is_internal`) are visible only to officers/admins
3. **Ticket attachments (Multer)**
   - `POST /api/tickets/:id/attachments`
   - MIME restrictions + 10MB limit enforced
4. **Ticket history route**
   - `GET /api/tickets/:id/history`
5. **Checklist workflow**
   - Checklist items auto-created on ticket creation from category templates
   - `GET /api/tickets/:id/checklist`
   - `PATCH /api/tickets/:id/checklist/:itemId`
   - Ticket cannot move to `resolved` while checklist has incomplete items
6. **Satisfaction surveys**
   - `POST /api/surveys`
   - Submitter-only, resolved/closed-only, once-per-ticket
7. **Canned responses**
   - `GET /api/canned-responses`
   - `POST /api/canned-responses` (campus_admin / university_admin)
8. **Knowledge base**
   - `GET /api/knowledge-base`
   - `POST /api/knowledge-base` (officers/admins)
   - Students/staff/lecturers only see `is_public=true`

## Why it was written this way

### 1) Keep business rules in service layer
Feature route handlers delegate to `TicketService`, preserving the controller-thin/service-heavy pattern used in earlier phases.

---

### 2) Checklist constraints integrated into status transition
The resolve gate is enforced in status update path itself, so no caller can bypass it.

```js
if (status === TICKET_STATUS.RESOLVED) {
  const incomplete = await TicketChecklistItem.count({ where: { ticket_id: ticket.id, is_completed: false } });
  if (incomplete > 0) {
    throw new Error("Tickets cannot be resolved with incomplete checklist items.");
  }
}
```

---

### 3) Attachment policy centralized in upload middleware
MIME and file-size checks are handled at middleware boundary with shared constants.

```js
limits: { fileSize: ANONYMOUS_SUBMISSION.MAX_ATTACHMENT_BYTES }
```

This avoids duplicated attachment validation logic in controllers/services.

---

### 4) Anonymous endpoint designed to preserve schema integrity
Because tickets require a valid `submitter_id`, anonymous submissions create an internal anonymous submitter account and always mark tickets `is_anonymous=true`.  
Officer-facing masking from previous phases still applies, while admin visibility remains intact.

---

### 5) Backward compatibility preserved
Existing auth/ticket/notification flows from Phases 1–5 were regression-tested after these additions.

## Files added/updated

- `server/services/TicketService.js` (extended with feature behaviors)
- `server/controllers/ticketsController.js` (new handlers)
- `server/routes/ticketRoutes.js` (expanded ticket endpoints)
- `server/routes/publicRoutes.js` (`/api/submit-anonymous`)
- `server/routes/featureRoutes.js` (surveys, canned responses, KB)
- `server/middleware/upload.js` (Multer policy)
- `server/models/TicketComment.js` (author association)
- `server/models/TicketChecklistItem.js` (checklist association)
- `server/models/ResolutionChecklist.js` (reverse association)
- `server/app.js` (new route mounts + upload static serving + upload errors)

## Verification outcome

Verified end-to-end and regression:

1. Phase 1–5 smoke paths still pass (health, auth, routing, notifications).
2. Anonymous public submit works for sensitive categories and blocks non-sensitive.
3. Internal comments are hidden from non-officer users.
4. Attachment upload accepts allowed MIME and rejects disallowed types.
5. Checklist items are created and must be completed before resolve.
6. Survey submission works once and blocks duplicates.
7. Canned response create is role-restricted; list works for officers/admins.
8. Knowledge base public/internal visibility by role is enforced.

Phase 6 is complete and stable for proceeding to analytics/frontend phases.
