import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useTickets from "../hooks/useTickets";
import TicketCard from "../components/TicketCard";

export default function TicketsPage() {
  const { user } = useAuth();
  const { tickets, loading, refresh } = useTickets();
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const canCreateTicket = ["student", "staff"].includes(user?.role);

  const filtered = useMemo(() => {
    return tickets.filter((ticket) => {
      const statusOk = statusFilter === "all" || ticket.status === statusFilter;
      const urgencyOk = urgencyFilter === "all" || ticket.urgency === urgencyFilter;
      return statusOk && urgencyOk;
    });
  }, [tickets, statusFilter, urgencyFilter]);

  return (
    <section className="grid">
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: "0.2rem" }}>My Tickets</h2>
          <p className="muted" style={{ margin: 0 }}>
            View your role-scoped ticket list.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {canCreateTicket && (
            <Link to="/tickets/new" className="btn btn-primary">
              New ticket
            </Link>
          )}
          <button className="btn btn-secondary" onClick={refresh} type="button">
            Refresh
          </button>
        </div>
      </div>

      <div className="tickets-filter-bar">
        <div className="filter-group">
          <label className="label" htmlFor="statusFilter">Status</label>
          <select id="statusFilter" className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="label" htmlFor="urgencyFilter">Urgency</label>
          <select id="urgencyFilter" className="select" value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
            <option value="all">All urgencies</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {loading && <div className="card">Loading tickets...</div>}
      {!loading && !filtered.length && <div className="card muted">No tickets found.</div>}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-2">
          {filtered.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </section>
  );
}
