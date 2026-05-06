import { Link } from "react-router-dom";
import SLACountdown from "./SLACountdown";
import { formatDate } from "../utils/formatDate";

export default function TicketCard({ ticket }) {
  return (
    <article className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "start" }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: "0.35rem" }}>{ticket.title}</h3>
          <p className="muted" style={{ margin: 0 }}>
            Created: {formatDate(ticket.created_at)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className="badge badge-role">{ticket.status}</span>{" "}
          <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
            {ticket.urgency}
          </span>
        </div>
      </div>
      <p className="muted" style={{ marginTop: "0.7rem" }}>
        {(ticket.description || "").slice(0, 140)}
        {ticket.description?.length > 140 ? "..." : ""}
      </p>
      <SLACountdown ticket={ticket} />
      <div style={{ marginTop: "0.75rem" }}>
        <Link className="btn btn-secondary" to={`/tickets/${ticket.id}`}>
          View details
        </Link>
      </div>
    </article>
  );
}
