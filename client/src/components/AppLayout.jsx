import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">UniResolve</div>
          <nav className="nav-links">
            <NavLink to="/">Home</NavLink>
            {!user && <NavLink to="/login">Login</NavLink>}
            {!user && <NavLink to="/register">Register</NavLink>}
            {user && <NavLink to="/dashboard">Dashboard</NavLink>}
            {user && (
              <>
                <span className="badge badge-role">{user.role}</span>
                <button className="btn btn-secondary" onClick={logout} type="button">
                  Logout
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
