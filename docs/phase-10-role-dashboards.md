# Phase 10 — Role Dashboards and Analytics Charts

## What was built

Phase 10 delivered role-adaptive dashboards with real-time analytics visualizations:

1. **Analytics service layer** (`services/analytics.js`):
   - `getOverview()` — total tickets, status breakdown, SLA compliance, avg resolution
   - `getByCategory()` — ticket distribution across categories
   - `getSlaCompliance()` — SLA breach rates by officer, department, faculty, campus
   - `getCampusComparison()` — cross-campus metrics (university-admin only)

2. **Enhanced dashboard page** (`pages/DashboardShell.jsx`):
   - Role-adaptive stat cards (role overview, visible tickets, active vs resolved)
   - **Pie chart** — status distribution (open/in-progress/pending-review/resolved/closed)
   - **Bar chart** — urgency distribution (low/medium/high/urgent)
   - **Summary stats** — total tickets, SLA compliance %, avg resolution hours (when admin)
   - **Category breakdown chart** — tickets by category
   - **Campus comparison chart** — SLA compliance by campus (university-admin only)
   - **SLA breach rate chart** — breach rate by campus (admin analytics)

3. **Graceful degradation for role restrictions**:
- Non-admin roles skip admin analytics calls and use ticket-based metrics directly
- Ticket-based metrics always available (status/urgency breakdown from user's visible tickets)
- Admin-only metrics/charts are hidden from non-admin roles
- Empty state messages for unauthorized/empty sections

4. **Chart library integration** (recharts):
   - PieChart for status with color coding
   - BarChart for urgency, categories, campuses, SLA metrics
   - Responsive containers with tooltips
   - No layout shifts on error

## Why it was written this way

### 1) Role-aware analytics loading with error isolation
Tickets and analytics load independently. Analytics calls are only made for admin roles, and admin requests use `Promise.allSettled` so partial failures do not blank out all analytics cards/charts.

```js
useEffect(() => {
  async function loadAnalytics() {
    if (!ANALYTICS_ROLES.has(user?.role)) {
      setAnalytics(null);
      setAnalyticsError(false);
      return;
    }

    const [overviewResult, byCategoryResult, slaResult, comparisonResult] = await Promise.allSettled(requests);
    setAnalytics(nextAnalytics);
    setAnalyticsError(hasFailures);
  }
  loadAnalytics();
}, [user?.role]);
```

This avoids guaranteed 403s for non-admin users and preserves available analytics even if one admin endpoint fails.

---

### 2) Dual-source metrics reduce API dependency
Status and urgency breakdowns are computed from `tickets` array locally, falling back from `analytics?.overview?.status_breakdown`. If the user has no admin role:
- Tickets still load and render visual breakdown
- Analytics fail gracefully
- User sees their ticket metrics instead of empty dashboard

```js
const statusBreakdown = useMemo(() => {
  if (analytics?.overview?.status_breakdown) {
    return Object.entries(analytics.overview.status_breakdown).map(([name, value]) => ({ name, value }));
  }
  const map = new Map();
  for (const ticket of tickets) {
    map.set(ticket.status, (map.get(ticket.status) || 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}, [analytics?.overview?.status_breakdown, tickets]);
```

---

### 3) Stat cards are simple, reusable components
`StatCard` accepts label, value, and help text, making the dashboard declarative and easy to adjust.

```js
<StatCard label="SLA Compliance %" value={String(analytics.overview.sla_compliance_pct ?? 0)} />
```

---

### 4) Charts are empty-state aware
`ChartCard` accepts an `empty` prop that displays a message instead of rendering an empty chart.

```js
<ChartCard title="Campus Comparison" empty={!comparisonItems.length ? "Campus comparison is available to university admin." : null}>
```

---

## Files added/updated

- `client/src/services/analytics.js` (new)
- `client/src/pages/DashboardShell.jsx` (rewritten)

## Backend integration

Existing Phase 7 analytics endpoints fully support Phase 10 frontend:
- `GET /api/analytics/overview` (admin)
- `GET /api/analytics/by-category` (admin)
- `GET /api/analytics/sla-compliance` (admin)
- `GET /api/analytics/campus-comparison` (university-admin)

Authorization enforced at backend; frontend gracefully degrades on 403 errors.

## Verification outcome

1. ✅ Client builds successfully with recharts dependency.
2. ✅ Dashboard loads for all roles without errors.
3. ✅ Non-admin roles receive graceful error notice and still see ticket-based metrics.
4. ✅ Analytics endpoints return properly scoped data when called by authorized roles.
5. ✅ Charts render correctly with data; empty states display appropriate messages.
6. ✅ No breaking changes to Phases 1-9; all prior functionality preserved.

Phase 10 is complete and stable. Dashboard is role-adaptive, performant, and resilient to authorization failures.
