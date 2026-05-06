import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import CommentThread from "../components/CommentThread";
import SLACountdown from "../components/SLACountdown";
import StatusTimeline from "../components/StatusTimeline";
import {
  addComment,
  getChecklist,
  getHistory,
  getTicket,
  listComments,
  updateChecklist,
  uploadAttachment
} from "../services/tickets";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/formatDate";

const OFFICER_ADMIN_ROLES = new Set([
  "hall_grievance_officer",
  "dept_grievance_officer",
  "hall_overseer",
  "faculty_overseer",
  "campus_admin",
  "university_admin"
]);

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const canManageChecklist = OFFICER_ADMIN_ROLES.has(user?.role);

  async function load() {
    setLoading(true);
    try {
      const [ticketData, commentsData, checklistData, historyResult] = await Promise.all([
        getTicket(id),
        listComments(id),
        getChecklist(id),
        getHistory(id).catch(() => [])
      ]);
      setTicket(ticketData);
      setComments(commentsData);
      setChecklist(checklistData);
      setHistory(Array.isArray(historyResult) ? historyResult : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const checklistDone = useMemo(() => checklist.filter((item) => item.is_completed).length, [checklist]);

  async function submitComment(payload) {
    const created = await addComment(id, payload);
    setComments((prev) => [...prev, created]);
  }

  async function toggleChecklist(item, checked) {
    try {
      const updated = await updateChecklist(id, item.id, checked);
      setChecklist((prev) => prev.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update checklist item.");
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAttachment(id, file);
      toast.success("Attachment uploaded.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload attachment.");
    } finally {
      event.target.value = "";
      setUploading(false);
    }
  }

  if (loading) {
    return <div className="card">Loading ticket...</div>;
  }

  if (!ticket) {
    return (
      <div className="card">
        Ticket could not be loaded. <Link to="/tickets">Back to tickets</Link>
      </div>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "start" }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>{ticket.title}</h2>
            <p className="muted" style={{ margin: 0 }}>
              Created {formatDate(ticket.created_at)} | Category: {ticket.category?.name || "-"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="badge badge-role">{ticket.status}</span>{" "}
            <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
              {ticket.urgency}
            </span>
          </div>
        </div>
        <p style={{ marginTop: "0.8rem" }}>{ticket.description}</p>
        <SLACountdown ticket={ticket} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Resolution checklist</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {checklistDone}/{checklist.length} completed
          </p>
          <div className="grid" style={{ gap: "0.45rem" }}>
            {checklist.map((item) => (
              <label key={item.id} style={{ display: "flex", gap: "0.5rem", alignItems: "start" }}>
                <input
                  type="checkbox"
                  checked={Boolean(item.is_completed)}
                  disabled={!canManageChecklist}
                  onChange={(event) => toggleChecklist(item, event.target.checked)}
                />
                <span>{item.checklist?.step_text || "Checklist item"}</span>
              </label>
            ))}
            {!checklist.length && <p className="muted">No checklist items for this category.</p>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Attachments</h3>
          <p className="muted">Upload evidence or supporting files (max 10MB per file).</p>
          <input type="file" className="input" onChange={handleUpload} disabled={uploading} />
        </div>
      </div>

      <CommentThread comments={comments} onAdd={submitComment} />
      {history.length > 0 && <StatusTimeline history={history} />}
    </section>
  );
}
