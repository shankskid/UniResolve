import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function DashboardCards({ role }) {
  const copyByRole = {
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

  return (
    <div className="grid grid-3">
      <article className="card">
        <h3 style={{ marginTop: 0 }}>Role Overview</h3>
        <p className="muted">{copyByRole[role] || "Role dashboard."}</p>
      </article>
      <article className="card">
        <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
        <p className="muted">Create tickets, view notifications, and review your workflow.</p>
      </article>
      <article className="card">
        <h3 style={{ marginTop: 0 }}>Next Phases</h3>
        <p className="muted">Ticket lists, details, analytics charts, and role modules continue in upcoming phases.</p>
      </article>
    </div>
  );
}

export default function DashboardShell() {
  const { user } = useAuth();

  return (
    <div className="split">
      <aside className="sidebar">
        <NavLink to="/dashboard">Overview</NavLink>
        <NavLink to="/tickets">Tickets</NavLink>
        <NavLink to="/tickets/new">Submit Ticket</NavLink>
      </aside>
      <section className="grid" style={{ alignContent: "start" }}>
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Welcome, {user?.name}</h2>
          <p className="muted" style={{ margin: 0 }}>
            Current role: <strong>{user?.role}</strong>
          </p>
        </div>
        <DashboardCards role={user?.role} />
      </section>
    </div>
  );
}
