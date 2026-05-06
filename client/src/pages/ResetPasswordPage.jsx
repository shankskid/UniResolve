import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../services/auth";

export default function ResetPasswordPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword({ token, new_password: newPassword });
      toast.success("Password reset successful.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Password reset failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 460, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Reset password</h2>
      <form className="form" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            className="input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Updating..." : "Update password"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
        Back to <Link to="/login">login</Link>
      </p>
    </div>
  );
}
