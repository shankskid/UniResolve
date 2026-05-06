# Phase 09 — Frontend Ticket Workflows

## What was built

Phase 9 delivered the end-to-end ticket UI for authenticated users:

1. Ticket list page (`/tickets`) with status filter and refresh.
2. Ticket creation page (`/tickets/new`) connected to backend categories.
3. Ticket detail page (`/tickets/:id`) with:
   - ticket metadata + SLA progress
   - comments thread + add comment
   - checklist view and officer/admin checklist toggles
   - attachment upload
   - history timeline when role can access history
4. Ticket-focused reusable UI components:
   - `TicketCard`
   - `SLACountdown`
   - `StatusTimeline`
   - `CommentThread`
5. Ticket data utilities and hooks:
   - `services/tickets.js`
   - `hooks/useTickets.js`
   - `utils/formatDate.js`
   - `utils/slaHelpers.js`
6. Route/navigation wiring updates in `App.jsx`, `DashboardShell`, and `AppLayout`.
7. Reference service expansion with `getCategories()` for ticket creation.

## Why it was written this way

### 1) API calls are centralized in `services/tickets.js`
Ticket pages use small service functions instead of inline Axios calls, so UI stays focused on state/render logic.

```js
export async function listComments(ticketId) {
  const { data } = await api.get(`/tickets/${ticketId}/comments`);
  return data.comments || [];
}
```

---

### 2) SLA rendering is isolated in a helper + component pair
`getSlaProgress()` computes normalized SLA state and `SLACountdown` only renders it, keeping display logic consistent across list/detail views.

```js
const pct = Math.max(0, Math.min(100, ((now - created) / (deadline - created)) * 100));
const tone = pct >= 100 ? "danger" : pct >= 75 ? "warn" : "ok";
```

---

### 3) Ticket detail loads parallel resources with graceful fallback
Detail view fetches ticket, comments, checklist, and history together; history is optional because some roles cannot access it.

```js
const [ticketData, commentsData, checklistData, historyResult] = await Promise.all([
  getTicket(id),
  listComments(id),
  getChecklist(id),
  getHistory(id).catch(() => [])
]);
```

---

### 4) Sensitive category behavior is enforced in create form
When the category is `Sexual Harassment / Discrimination`, urgency is forced to `urgent` and anonymous mode is enforced in payload generation to match backend policy.

## Files added/updated

- `client/src/App.jsx`
- `client/src/components/AppLayout.jsx`
- `client/src/components/CommentThread.jsx`
- `client/src/components/SLACountdown.jsx`
- `client/src/components/StatusTimeline.jsx`
- `client/src/components/TicketCard.jsx`
- `client/src/hooks/useTickets.js`
- `client/src/pages/DashboardShell.jsx`
- `client/src/pages/NewTicketPage.jsx`
- `client/src/pages/TicketDetailPage.jsx`
- `client/src/pages/TicketsPage.jsx`
- `client/src/services/reference.js`
- `client/src/services/tickets.js`
- `client/src/utils/formatDate.js`
- `client/src/utils/slaHelpers.js`

## Verification outcome

1. Frontend production build succeeds (`npm run build -w client`).
2. Ticket API smoke flow works for register/login/create/list/detail/comment/checklist.
3. Route wiring for `/tickets`, `/tickets/new`, and `/tickets/:id` is active behind auth guard.
4. Existing Phase 8 auth/navigation behavior remains intact.
