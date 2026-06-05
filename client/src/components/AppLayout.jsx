import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listUnreadNotifications } from "../services/notifications";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }

    async function fetchCount() {
      try {
        const notifications = await listUnreadNotifications();
        const unread = notifications.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      } catch { /* silent */ }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <span className="brand-icon"></span>UniResolve
          </div>
          <nav className="nav-links">
            <NavLink to="/">Home</NavLink>
            {!user && <NavLink to="/login">Login</NavLink>}
            {!user && <NavLink to="/register">Register</NavLink>}
            {user && <NavLink to="/dashboard">Dashboard</NavLink>}
            {user && <NavLink to="/tickets">Tickets</NavLink>}
            {user && (
              <NavLink to="/notifications" className="nav-notif-link">
                Notifications
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </NavLink>
            )}
            {user && (
              <>
                <span className="badge badge-role">{user.role}</span>
                <button className="btn btn-ghost-nav" onClick={logout} type="button">
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container page">
        <Outlet />
      </main>
    </div>
  );
}
