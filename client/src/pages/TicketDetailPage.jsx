import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import CommentThread from "../components/CommentThread";
import SLACountdown from "../components/SLACountdown";
import StatusTimeline from "../components/StatusTimeline";
import {
  addComment,
  getHistory,
  getOfficerQueueStats,
  getTicket,
  listAttachments,
  listComments,
  listManagedUsers,
  reassignTicket,
  updateTicketStatus,
  updateTicketUrgency,
  uploadAttachment
} from "../services/tickets";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/formatDate";

// Backend origin — uploads are served by the Express server, not Vite
const SERVER_ORIGIN = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace("/api", "")
  : "http://localhost:5000";

function getUploadUrl(fileUrl) {
  return `${SERVER_ORIGIN}/uploads/${fileUrl}`;
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
function isImage(fileName) {
  const ext = (fileName || "").split(".").pop().toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

const OFFICER_ADMIN_ROLES = new Set(["officer", "overseer", "superadmin"]);

const STATUS_ACTIONS = {
  officer: [
    { value: "in_progress", label: "Mark In Progress" },
    { value: "resolved", label: "Mark Resolved" }
  ],
  superadmin: [
    { value: "open", label: "Reopen" },
    { value: "in_progress", label: "Mark In Progress" },
    { value: "resolved", label: "Mark Resolved" },
    { value: "closed", label: "Close" }
  ]
};

const URGENCY_META = {
  urgent: { label: "Urgent", cls: "badge-urgency-urgent" },
  high:   { label: "High",   cls: "badge-urgency-high" },
  medium: { label: "Medium", cls: "badge-urgency-medium" },
  low:    { label: "Low",    cls: "badge-urgency-low" }
};

const STATUS_META = {
  open:        { label: "Open",        cls: "badge-status-open" },
  in_progress: { label: "In Progress", cls: "badge-status-progress" },
  resolved:    { label: "Resolved",    cls: "badge-status-resolved" },
  closed:      { label: "Closed",      cls: "badge-status-closed" }
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [officers, setOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const canUseInternalNotes = OFFICER_ADMIN_ROLES.has(user?.role);
  const canCloseResolved = ["student", "staff"].includes(user?.role) && ticket?.status === "resolved";
  const canReassign = ["overseer", "superadmin"].includes(user?.role);
  const canAdjustUrgency = OFFICER_ADMIN_ROLES.has(user?.role);
  const statusActions = user?.role === "superadmin"
    ? STATUS_ACTIONS.superadmin
    : user?.role === "officer"
      ? STATUS_ACTIONS.officer
      : [];
  const reassignDisabled = !selectedOfficer || selectedOfficer === ticket?.assigned_to;

  const URGENCY_LEVELS = ["low", "medium", "high", "urgent"];
  const [selectedUrgency, setSelectedUrgency] = useState("");
  const [urgencyUpdating, setUrgencyUpdating] = useState(false);

  // Sync urgency selector whenever ticket loads / changes
  useEffect(() => {
    if (ticket?.urgency) setSelectedUrgency(ticket.urgency);
  }, [ticket?.urgency]);

  async function load() {
    setLoading(true);
    try {
      const [ticketData, commentsData, historyResult, attachmentData] = await Promise.all([
        getTicket(id),
        listComments(id),
        getHistory(id).catch(() => []),
        listAttachments(id).catch(() => [])
      ]);
      setTicket(ticketData);
      setComments(commentsData);
      setHistory(Array.isArray(historyResult) ? historyResult : []);
      setAttachments(Array.isArray(attachmentData) ? attachmentData : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    async function loadOfficers() {
      if (!canReassign) { setOfficers([]); return; }
      try {
        if (user?.role === "superadmin") {
          const users = await listManagedUsers();
          setOfficers(users.filter((item) => item.role === "officer" && item.is_active));
          return;
        }
        const stats = await getOfficerQueueStats();
        setOfficers(stats.map((item) => item.officer));
      } catch { setOfficers([]); }
    }
    loadOfficers();
  }, [canReassign, user?.role]);

  useEffect(() => {
    if (!officers.length) { setSelectedOfficer(""); return; }
    setSelectedOfficer((prev) => {
      if (prev && officers.some((item) => item.id === prev)) return prev;
      if (ticket?.assigned_to && officers.some((item) => item.id === ticket.assigned_to)) return ticket.assigned_to;
      return officers[0].id;
    });
  }, [officers, ticket?.assigned_to]);

  async function submitComment(payload) {
    const created = await addComment(id, payload);
    setComments((prev) => [...prev, created]);
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAttachment(id, file);
      toast.success("Attachment uploaded.");
      const fresh = await listAttachments(id);
      setAttachments(fresh);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload attachment.");
    } finally {
      event.target.value = "";
      setUploading(false);
    }
  }

  async function changeStatus(status) {
    setStatusUpdating(true);
    try {
      const updated = await updateTicketStatus(id, status);
      setTicket(updated);
      toast.success("Ticket status updated.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update status.");
    } finally { setStatusUpdating(false); }
  }

  async function handleUrgencyUpdate() {
    if (!selectedUrgency || selectedUrgency === ticket?.urgency) return;
    setUrgencyUpdating(true);
    try {
      const updated = await updateTicketUrgency(id, selectedUrgency);
      setTicket(updated);
      toast.success(`Urgency updated to ${selectedUrgency}.`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update urgency.");
    } finally { setUrgencyUpdating(false); }
  }

  async function handleReassign() {
    if (!selectedOfficer) return;
    setReassigning(true);
    try {
      const updated = await reassignTicket(id, selectedOfficer);
      setTicket(updated);
      toast.success("Ticket reassigned.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reassign ticket.");
    } finally { setReassigning(false); }
  }

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="loading-spinner" />
        <p>Loading ticket…</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="card">
        Ticket could not be loaded. <Link to="/tickets">Back to tickets</Link>
      </div>
    );
  }

  const urgencyMeta = URGENCY_META[ticket.urgency] || { label: ticket.urgency, cls: "" };
  const statusMeta  = STATUS_META[ticket.status]   || { label: ticket.status,  cls: "" };

  return (
    <div className="detail-layout">
      {/* ── Main column ── */}
      <div className="detail-main">

        {/* Header card */}
        <div className="card detail-header-card">
          <div className="detail-header-top">
            <div className="detail-badges">
              <span className={`badge ${statusMeta.cls}`}>{statusMeta.label}</span>
              <span className={`badge ${urgencyMeta.cls}`}>{urgencyMeta.label}</span>
            </div>
            <Link to="/tickets" className="btn btn-ghost btn-sm">← Back</Link>
          </div>
          <h1 className="detail-title">{ticket.title}</h1>
          <div className="detail-meta">
            <span>Submitted {formatDate(ticket.created_at)}</span>
            <span className="meta-sep">·</span>
            <span>Category: {ticket.category?.name || "—"}</span>
            {ticket.assignee && (
              <>
                <span className="meta-sep">·</span>
                <span>Assigned to: <strong>{ticket.assignee.name}</strong></span>
              </>
            )}
          </div>
          <p className="detail-description">{ticket.description}</p>

          {/* Evidence photos — rendered inline, prominent */}
          {attachments.filter((a) => isImage(a.file_name || a.file_url)).length > 0 && (
            <div className="evidence-section">
              <h4 className="evidence-title">📷 Photo Evidence</h4>
              <div className="evidence-grid">
                {attachments
                  .filter((a) => isImage(a.file_name || a.file_url))
                  .map((att) => (
                    <a
                      key={att.id}
                      href={getUploadUrl(att.file_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-img-link"
                    >
                      <img
                        src={getUploadUrl(att.file_url)}
                        alt={att.file_name || "Evidence photo"}
                        className="evidence-img"
                      />
                      <span className="evidence-img-caption">
                        {att.file_name} {att.file_size ? `· ${Math.round(att.file_size / 1024)} KB` : ""}
                      </span>
                    </a>
                  ))}
              </div>
            </div>
          )}

          <SLACountdown ticket={ticket} />
        </div>

        {/* Comment thread */}
        <CommentThread comments={comments} onAdd={submitComment} showInternalToggle={canUseInternalNotes} />

        {/* History — always rendered */}
        <StatusTimeline history={history} />
      </div>

      {/* ── Sidebar column ── */}
      <div className="detail-sidebar">

        {/* Status actions */}
        {(statusActions.length > 0 || canCloseResolved) && (
          <div className="card sidebar-section">
            <h3 className="sidebar-section-title">Actions</h3>
            <div className="action-btn-group">
              {statusActions.map((action) => (
                <button
                  key={action.value}
                  type="button"
                  className="btn btn-secondary btn-block"
                  disabled={statusUpdating || ticket.status === action.value}
                  onClick={() => changeStatus(action.value)}
                >
                  {action.label}
                </button>
              ))}
              {canCloseResolved && (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={statusUpdating}
                  onClick={() => changeStatus("closed")}
                >
                  Close Ticket
                </button>
              )}
            </div>
          </div>
        )}

        {/* Reassign */}
        {canReassign && (
          <div className="card sidebar-section">
            <h3 className="sidebar-section-title">Reassign</h3>
            {!officers.length ? (
              <p className="muted small">No officers available.</p>
            ) : (
              <>
                <select
                  className="select"
                  value={selectedOfficer}
                  onChange={(event) => setSelectedOfficer(event.target.value)}
                >
                  {officers.map((officer) => (
                    <option key={officer.id} value={officer.id}>
                      {officer.name}
                    </option>
                  ))}
                </select>
                {user?.role === "overseer" && (
                  <p className="muted small" style={{ marginTop: "0.4rem" }}>Only your supervised officers shown.</p>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  style={{ marginTop: "0.5rem" }}
                  disabled={reassigning || reassignDisabled}
                  onClick={handleReassign}
                >
                  {reassigning ? "Reassigning…" : "Reassign"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Urgency adjustment — officers, overseers, superadmin */}
        {canAdjustUrgency && ticket && (
          <div className="card sidebar-section">
            <h3 className="sidebar-section-title">Adjust Urgency</h3>
            <p className="muted small" style={{ marginBottom: "0.6rem" }}>
              Review the photo evidence and adjust the system-assigned urgency if needed.
            </p>
            <select
              className="select"
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
            >
              {URGENCY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: "0.5rem" }}
              disabled={urgencyUpdating || selectedUrgency === ticket.urgency}
              onClick={handleUrgencyUpdate}
            >
              {urgencyUpdating ? "Updating…" : "Update Urgency"}
            </button>
          </div>
        )}

        {/* Attachments sidebar — shows all files for download */}
        <div className="card sidebar-section">
          <h3 className="sidebar-section-title">Attachments</h3>
          {attachments.length === 0 && (
            <p className="muted small">No attachments yet.</p>
          )}
          {attachments.length > 0 && (
            <ul className="attachment-list">
              {attachments.map((att) => (
                <li key={att.id} className="attachment-item">
                  <span className="attachment-icon">{isImage(att.file_name || att.file_url) ? "🖼️" : "📎"}</span>
                  <a
                    href={getUploadUrl(att.file_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="attachment-name"
                  >
                    {att.file_name}
                  </a>
                  <span className="attachment-size muted small">
                    {att.file_size ? `${Math.round(att.file_size / 1024)} KB` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <label className="upload-label" style={{ marginTop: attachments.length ? "0.75rem" : "0.25rem" }}>
            <input type="file" onChange={handleUpload} disabled={uploading} style={{ display: "none" }} />
            <span className="btn btn-secondary btn-block btn-sm">
              {uploading ? "Uploading…" : "Upload File"}
            </span>
          </label>
          <p className="muted small" style={{ marginTop: "0.3rem" }}>Max 10 MB per file</p>
        </div>

      </div>
    </div>
  );
}
