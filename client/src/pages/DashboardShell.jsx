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
import { getByCategory, getOverview, getSlaCompliance, exportCsvReport } from "../services/analytics";
import { toast } from "react-hot-toast";
import { updateOfficerStatus } from "../services/auth";
import { getOfficerQueueStats, listOfficerAssignments, listOverseerAssignments, listTickets } from "../services/tickets";

const ROLE_COPY = {
  student: "Track your submitted tickets and updates.",
  staff: "Track your submitted tickets and updates.",
  officer: "Manage your assigned hall and department tickets.",
  overseer: "Monitor the officers assigned to you.",
  superadmin: "Manage the system and monitor all tickets."
};

const STATUS_COLORS = ["#2563eb", "#7c3aed", "#ea580c", "#16a34a", "#64748b"];
const ANALYTICS_ROLES = new Set(["officer", "overseer", "superadmin"]);

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
  const isAdminAnalyticsRole = ANALYTICS_ROLES.has(role);

  const statusBreakdown = useMemo(() => {
    if (analytics?.overview?.status_breakdown) {
      return Object.entries(analytics.overview.status_breakdown).map(([name, value]) => ({ name, value }));
    }
    const allowedStatuses = new Set(["open", "in_progress", "resolved", "closed"]);
    const map = new Map();
    for (const ticket of tickets) {
      if (!allowedStatuses.has(ticket.status)) {
        continue;
      }
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
    () => tickets.filter((ticket) => ["open", "in_progress"].includes(ticket.status)).length,
    [tickets]
  );

  const myResolvedCount = useMemo(
    () => tickets.filter((ticket) => ["resolved", "closed"].includes(ticket.status)).length,
    [tickets]
  );

  const categoryItems = analytics?.byCategory || [];
  const slaRows = analytics?.sla?.by_officer || [];

  return (
    <div className="grid">
      <div className="grid grid-3">
        <StatCard label="Role Overview" value={role || "-"} help={ROLE_COPY[role] || "Role dashboard."} />
        <StatCard label="Visible Tickets" value={String(tickets.length)} help="Your role-scoped ticket visibility." />
        <StatCard label="Active vs Resolved" value={`${myOpenCount} / ${myResolvedCount}`} help="Open+in-progress / resolved+closed." />
      </div>

      {isAdminAnalyticsRole && analyticsError && (
        <div className="notice">Some analytics are temporarily unavailable. Ticket metrics are still shown.</div>
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

      {isAdminAnalyticsRole && !!analytics?.overview && (
        <div className="grid grid-3">
          <StatCard label="Total Tickets (Scope)" value={String(analytics.overview.total_tickets || 0)} />
          <StatCard label="SLA Compliance %" value={String(analytics.overview.sla_compliance_pct ?? 0)} />
          <StatCard label="Avg Resolution (Hours)" value={String(analytics.overview.avg_resolution_hours ?? 0)} />
        </div>
      )}

      {isAdminAnalyticsRole && (
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

          <ChartCard title="SLA Breach Rate by Officer" empty={!slaRows.length ? "SLA officer analytics unavailable." : null}>
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
      )}
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
  const [queueStats, setQueueStats] = useState([]);
  const [officerAssignments, setOfficerAssignments] = useState([]);
  const [overseerAssignments, setOverseerAssignments] = useState([]);

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

      const requests = [getOverview(), getByCategory(), getSlaCompliance()];

      const [overviewResult, byCategoryResult, slaResult] = await Promise.allSettled(requests);
      const nextAnalytics = {
        overview: overviewResult.status === "fulfilled" ? overviewResult.value : null,
        byCategory: byCategoryResult.status === "fulfilled" ? byCategoryResult.value : [],
        sla: slaResult.status === "fulfilled" ? slaResult.value : null
      };
      const hasFailures = [overviewResult, byCategoryResult, slaResult].some((result) => result.status === "rejected");

      setAnalytics(nextAnalytics);
      setAnalyticsError(hasFailures);
    }

    loadAnalytics();
  }, [user?.role]);

  useEffect(() => {
    async function loadManagementData() {
      if (!["overseer", "superadmin"].includes(user?.role)) {
        setQueueStats([]);
        setOfficerAssignments([]);
        setOverseerAssignments([]);
        return;
      }

      const [statsResult, officerAssignmentsResult, overseerAssignmentsResult] = await Promise.allSettled([
        getOfficerQueueStats(),
        user.role === "superadmin" ? listOfficerAssignments() : Promise.resolve([]),
        user.role === "superadmin" ? listOverseerAssignments() : Promise.resolve([])
      ]);

      setQueueStats(statsResult.status === "fulfilled" ? statsResult.value : []);
      setOfficerAssignments(officerAssignmentsResult.status === "fulfilled" ? officerAssignmentsResult.value : []);
      setOverseerAssignments(overseerAssignmentsResult.status === "fulfilled" ? overseerAssignmentsResult.value : []);
    }

    loadManagementData();
  }, [user?.role]);

  if (loading) {
    return <div className="card">Loading dashboard...</div>;
  }

  async function handleStatusUpdate(officerId, currentActive, currentTimedOut, action) {
    let newStatus = "";
    let promptMsg = "";
    if (action === "timeout") {
      newStatus = "timeout";
      promptMsg = "Enter reason for timeout (e.g. 'Ignored 5 SLA breaches'):";
    } else if (action === "discontinue") {
      newStatus = "discontinue";
      promptMsg = "Enter reason for discontinuing this officer:";
    } else if (action === "restore") {
      newStatus = "active";
      promptMsg = "Enter reason for restoring this officer (or leave blank):";
    }

    let reason = "";
    if (action !== "restore") {
      reason = window.prompt(promptMsg);
      if (reason === null) return; // User cancelled
      if (!reason.trim()) {
        toast.error("Reason is required.");
        return;
      }
    }

    try {
      await updateOfficerStatus(officerId, { status: newStatus, reason: reason || "Restored" });
      toast.success("Officer status updated.");
      const statsResult = await getOfficerQueueStats();
      setQueueStats(statsResult);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  }

  const isTimedOut = user?.role === "officer" && user?.is_timed_out;

  async function handleExportCSV() {
    try {
      const blob = await exportCsvReport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tickets-report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Failed to export CSV.");
    }
  }

  return (
    <div className="split">
      <aside className="sidebar">
        <NavLink to="/dashboard">Overview</NavLink>
        <NavLink to="/tickets">Tickets</NavLink>
        {["student", "staff"].includes(user?.role) && <NavLink to="/tickets/new">Submit Ticket</NavLink>}
        <NavLink to="/notifications">Notifications</NavLink>
        {user?.role === "overseer" && <NavLink to="/overseer/officers/new">Register officer</NavLink>}
        {user?.role === "superadmin" && (
          <>
            <NavLink to="/admin/users">Users</NavLink>
            <NavLink to="/admin/assignments">Assignments</NavLink>
            <NavLink to="/admin/categories">Categories</NavLink>
          </>
        )}
      </aside>
      <section className="grid" style={{ alignContent: "start" }}>
        {ticketError && <div className="notice">Could not load your tickets right now. Please refresh in a moment.</div>}
        
        {isTimedOut && (
          <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "16px", borderRadius: "6px", border: "1px solid #fca5a5" }}>
            <h3 style={{ margin: "0 0 8px 0" }}>🚨 Account Timed Out (12 Hours)</h3>
            <p style={{ margin: 0 }}>You have been temporarily suspended by your Overseer and cannot manage tickets. Your account will automatically reactivate after 12 hours.</p>
            <p style={{ margin: "8px 0 0", fontWeight: "bold" }}>Reason: {user.status_reason}</p>
            <p style={{ margin: "8px 0 0", fontWeight: "bold" }}>Please note that repeated SLA breaches could lead to your account being permanently discontinued.</p>
          </div>
        )}

        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Welcome, {user?.name}</h2>
          <p className="muted" style={{ margin: 0 }}>
            Current role: <strong>{user?.role}</strong>
          </p>
        </div>
        <DashboardCards role={user?.role} tickets={isTimedOut ? [] : tickets} analytics={analytics} analyticsError={analyticsError} />
        {["overseer", "superadmin"].includes(user?.role) && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Officer workload</h3>
            {!queueStats.length && <p className="muted">No officer workload data available.</p>}
            {!!queueStats.length && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Officer</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Active</th>
                      <th>Resolved</th>
                      <th>Urgent Active</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueStats.map((item) => (
                      <tr key={item.officer.id}>
                        <td>{item.officer.name}</td>
                        <td>
                          {!item.officer.is_active ? (
                            <span style={{ color: "#dc2626", fontWeight: "bold" }}>Discontinued</span>
                          ) : item.officer.is_timed_out ? (
                            <span style={{ color: "#ea580c", fontWeight: "bold" }}>Timed Out</span>
                          ) : (
                            <span style={{ color: "#16a34a", fontWeight: "bold" }}>Active</span>
                          )}
                        </td>
                        <td>{item.total}</td>
                        <td>{item.active}</td>
                        <td>{item.resolved}</td>
                        <td>{item.urgent}</td>
                        <td style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          {item.officer.is_active && !item.officer.is_timed_out && (
                            <>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleStatusUpdate(item.officer.id, item.officer.is_active, item.officer.is_timed_out, "timeout")}>Timeout</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleStatusUpdate(item.officer.id, item.officer.is_active, item.officer.is_timed_out, "discontinue")}>Discontinue</button>
                            </>
                          )}
                          {(item.officer.is_timed_out || !item.officer.is_active) && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(item.officer.id, item.officer.is_active, item.officer.is_timed_out, "restore")}>Restore</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {user?.role === "superadmin" && (
          <div className="grid grid-2">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Officer assignments</h3>
              <p className="muted">{officerAssignments.length} hall/department assignments configured.</p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Overseer assignments</h3>
              <p className="muted">{overseerAssignments.length} officer supervision assignments configured.</p>
            </div>
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ marginTop: 0 }}>Export</h3>
              <p className="muted" style={{ marginBottom: "0.75rem" }}>Download a full CSV report of all tickets in the system.</p>
              <button
                onClick={handleExportCSV}
                className="btn btn-secondary"
              >
                ⬇ Download CSV Report
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
