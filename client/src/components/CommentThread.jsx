import { useState } from "react";
import { formatDate } from "../utils/formatDate";

export default function CommentThread({ comments, onAdd }) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({ body: body.trim(), is_internal: isInternal });
      setBody("");
      setIsInternal(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Comments</h3>
      <div className="grid" style={{ gap: "0.6rem", marginBottom: "0.8rem" }}>
        {comments.map((comment) => (
          <div key={comment.id} style={{ border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <strong>{comment.author?.name || "User"}</strong>
              {comment.is_internal && (
                <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                  Internal
                </span>
              )}
            </div>
            <p style={{ margin: "0.45rem 0" }}>{comment.body}</p>
            <small className="muted">{formatDate(comment.created_at)}</small>
          </div>
        ))}
      </div>
      <form className="form" onSubmit={submit}>
        <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add comment..." />
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
          Internal note (officers/admin only)
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Posting..." : "Post comment"}
        </button>
      </form>
    </div>
  );
}
