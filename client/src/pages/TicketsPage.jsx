import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useTickets from "../hooks/useTickets";
import TicketCard from "../components/TicketCard";

export default function TicketsPage() {
  const { tickets, loading, refresh } = useTickets();
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter((ticket) => ticket.status === statusFilter);
  }, [tickets, statusFilter]);

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
          <Link to="/tickets/new" className="btn btn-primary">
            New ticket
          </Link>
          <button className="btn btn-secondary" onClick={refresh} type="button">
            Refresh
          </button>
        </div>
      </div>

      <div className="card" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <label className="label" htmlFor="statusFilter" style={{ marginBottom: 0 }}>
          Status
        </label>
        <select id="statusFilter" className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="pending_review">Pending review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
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
