import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { getByCategory, getCampusComparison, getOverview, getSlaCompliance } from "../services/analytics";
import { listTickets } from "../services/tickets";

const ROLE_COPY = {
  student: "Track your submitted tickets and updates.",
  staff: "Track your submitted tickets and updates.",
  lecturer: "Track your submitted tickets and updates.",
  hall_grievance_officer: "Manage your assigned hall grievance queue.",
  dept_grievance_officer: "Manage your assigned department grievance queue.",
  hall_overseer: "Monitor hall officer workloads and escalations.",
  faculty_overseer: "Monitor department officer workloads and escalations.",
  campus_admin: "Oversee all campus tickets and performance metrics.",
  university_admin: "Oversee cross-campus operations and analytics."
};

const STATUS_COLORS = ["#2563eb", "#7c3aed", "#ea580c", "#16a34a", "#64748b"];
const ANALYTICS_ROLES = new Set(["campus_admin", "university_admin"]);

function StatCard({ label, value, help }) {
  return (
    <article className="card">
      <p className="muted" style={{ marginTop: 0, marginBottom: "0.45rem" }}>
        {label}
      </p>
      <h3 style={{ margin: 0 }}>{value}</h3>
      {help && (
        <p className="muted" style={{ marginBottom: 0, marginTop: "0.45rem", fontSize: "0.85rem" }}>
          {help}
        </p>
      )}
    </article>
  );
}

function ChartCard({ title, children, empty }) {
  return (
    <article className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {empty ? <p className="muted">{empty}</p> : children}
    </article>
  );
}

function DashboardCards({ role, tickets, analytics, analyticsError }) {
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

  const urgencyBreakdown = useMemo(() => {
    const map = new Map();
    for (const ticket of tickets) {
      map.set(ticket.urgency, (map.get(ticket.urgency) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  const myOpenCount = useMemo(
    () => tickets.filter((ticket) => ["open", "in_progress", "pending_review"].includes(ticket.status)).length,
    [tickets]
  );

  const myResolvedCount = useMemo(
    () => tickets.filter((ticket) => ["resolved", "closed"].includes(ticket.status)).length,
    [tickets]
  );

  const categoryItems = analytics?.byCategory || [];
  const comparisonItems = analytics?.comparison || [];
  const slaRows = analytics?.sla?.by_campus || [];

  return (
    <div className="grid">
      <div className="grid grid-3">
        <StatCard label="Role Overview" value={role || "-"} help={ROLE_COPY[role] || "Role dashboard."} />
        <StatCard label="Visible Tickets" value={String(tickets.length)} help="Your role-scoped ticket visibility." />
        <StatCard label="Active vs Resolved" value={`${myOpenCount} / ${myResolvedCount}`} help="Open+in-progress / resolved+closed." />
      </div>

      {analyticsError && (
        <div className="notice">Some analytics are unavailable for your role. You still have ticket-based dashboard metrics.</div>
      )}

      <div className="grid grid-2">
        <ChartCard title="Status Distribution" empty={!statusBreakdown.length ? "No ticket data yet." : null}>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" outerRadius={90}>
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Urgency Distribution" empty={!urgencyBreakdown.length ? "No ticket data yet." : null}>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={urgencyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {!!analytics?.overview && (
        <div className="grid grid-3">
          <StatCard label="Total Tickets (Scope)" value={String(analytics.overview.total_tickets || 0)} />
          <StatCard label="SLA Compliance %" value={String(analytics.overview.sla_compliance_pct ?? 0)} />
          <StatCard label="Avg Resolution (Hours)" value={String(analytics.overview.avg_resolution_hours ?? 0)} />
        </div>
      )}

      <div className="grid grid-2">
        <ChartCard title="Tickets by Category" empty={!categoryItems.length ? "No category analytics available." : null}>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={categoryItems.map((item) => ({ name: item.category_name, tickets: item.ticket_count }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tickets" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Campus Comparison" empty={!comparisonItems.length ? "Campus comparison is available to university admin." : null}>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart
                data={comparisonItems.map((item) => ({
                  name: item.campus_name,
                  compliance: item.sla_compliance_pct
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="compliance" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="SLA Breach Rate by Campus" empty={!slaRows.length ? "SLA cohort analytics unavailable." : null}>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart
              data={slaRows.map((item) => ({
                name: item.name,
                breach_rate_pct: item.breach_rate_pct
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="breach_rate_pct" fill="#ea580c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

export default function DashboardShell() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [ticketError, setTicketError] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setTicketError(false);
      try {
        const ticketItems = await listTickets();
        setTickets(ticketItems);
      } catch {
        setTicketError(true);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  useEffect(() => {
    async function loadAnalytics() {
      if (!ANALYTICS_ROLES.has(user?.role)) {
        setAnalytics(null);
        setAnalyticsError(false);
        return;
      }

      try {
        const requests = [
          getOverview(),
          getByCategory(),
          getSlaCompliance()
        ];
        if (user.role === "university_admin") {
          requests.push(getCampusComparison());
        }

        const [overviewResult, byCategoryResult, slaResult, comparisonResult] = await Promise.allSettled(requests);
        const nextAnalytics = {
          overview: overviewResult.status === "fulfilled" ? overviewResult.value : null,
          byCategory: byCategoryResult.status === "fulfilled" ? byCategoryResult.value : [],
          sla: slaResult.status === "fulfilled" ? slaResult.value : null,
          comparison:
            user.role === "university_admin" && comparisonResult?.status === "fulfilled" ? comparisonResult.value : []
        };
        const hasFailures = [overviewResult, byCategoryResult, slaResult].some((result) => result.status === "rejected");

        setAnalytics(nextAnalytics);
        setAnalyticsError(hasFailures);
      } catch {
        setAnalyticsError(true);
        setAnalytics({ overview: null, byCategory: [], sla: null, comparison: [] });
      }
    }

    loadAnalytics();
  }, [user?.role]);

  if (loading) {
    return <div className="card">Loading dashboard...</div>;
  }

  return (
    <div className="split">
      <aside className="sidebar">
        <NavLink to="/dashboard">Overview</NavLink>
        <NavLink to="/tickets">Tickets</NavLink>
        <NavLink to="/tickets/new">Submit Ticket</NavLink>
        <NavLink to="/notifications">Notifications</NavLink>
      </aside>
      <section className="grid" style={{ alignContent: "start" }}>
        {ticketError && <div className="notice">Could not load your tickets right now. Please refresh in a moment.</div>}
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Welcome, {user?.name}</h2>
          <p className="muted" style={{ margin: 0 }}>
            Current role: <strong>{user?.role}</strong>
          </p>
        </div>
        <DashboardCards role={user?.role} tickets={tickets} analytics={analytics} analyticsError={analyticsError} />
      </section>
    </div>
  );
}
