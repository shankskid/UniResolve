import { formatDate } from "../utils/formatDate";

export default function StatusTimeline({ history }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Status timeline</h3>
      {!history.length && <p className="muted">No history yet.</p>}
      <div className="grid" style={{ gap: "0.55rem" }}>
        {history.map((item) => (
          <div key={item.id} style={{ borderLeft: "3px solid #93c5fd", paddingLeft: "0.6rem" }}>
            <div style={{ fontWeight: 600 }}>{item.field_changed}</div>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              {item.old_value || "-"} → {item.new_value || "-"}
            </div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              {formatDate(item.created_at)} by {item.changed_by}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
