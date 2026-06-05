import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      setErrorMsg("");
      await login({ email, password });
      toast.success("Welcome back!");
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (error) {
      const msg = error?.response?.data?.message || "Login failed. Check your credentials.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-icon"></span>UniResolve
        </div>
        <h2 className="auth-title">Sign in to your account</h2>
        <p className="auth-subtitle">University Grievance Management System</p>

        {errorMsg && (
          <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "6px", border: "1px solid #fca5a5", marginBottom: "1rem", fontSize: "0.9rem", lineHeight: "1.4" }}>
            <strong>Login Failed</strong>
            <p style={{ margin: "4px 0 0" }}>{errorMsg}</p>
          </div>
        )}

        <form className="form" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/forgot-password" className="muted small">Forgot password?</Link>
          <span className="meta-sep">·</span>
          <Link to="/register" className="small">Create account</Link>
        </div>
      </div>
    </div>
  );
}
