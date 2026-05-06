import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  listUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/notifications";
import { formatDate } from "../utils/formatDate";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const items = await listUnreadNotifications();
      setNotifications(items);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markOne(item) {
    setUpdating(true);
    try {
      await markNotificationRead(item.id);
      setNotifications((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to mark notification as read.");
    } finally {
      setUpdating(false);
    }
  }

  async function markAll() {
    setUpdating(true);
    try {
      await markAllNotificationsRead();
      setNotifications([]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to mark all notifications as read.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <section className="grid">
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Notifications</h2>
          <p className="muted" style={{ margin: 0 }}>
            Unread alerts from ticket assignment, status changes, comments, and escalations.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading || updating}>
            Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={markAll} disabled={updating || !notifications.length}>
            Mark all read
          </button>
        </div>
      </div>

      {loading && <div className="card">Loading notifications...</div>}
      {!loading && !notifications.length && <div className="card muted">You are all caught up.</div>}

      {!loading &&
        notifications.map((item) => (
          <article key={item.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.type?.replaceAll("_", " ") || "Notification"}</div>
                <p style={{ margin: "0.35rem 0" }}>{item.message}</p>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {formatDate(item.created_at)}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "end" }}>
                {item.ticket_id && (
                  <Link className="btn btn-secondary" to={`/tickets/${item.ticket_id}`}>
                    Open ticket
                  </Link>
                )}
                <button type="button" className="btn btn-primary" onClick={() => markOne(item)} disabled={updating}>
                  Mark read
                </button>
              </div>
            </div>
          </article>
        ))}
    </section>
  );
}
