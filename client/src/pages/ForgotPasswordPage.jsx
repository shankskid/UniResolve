import { useState } from "react";
import toast from "react-hot-toast";
import { forgotPassword } from "../services/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await forgotPassword({ email });
      setMessage(result.message || "Reset request submitted.");
      toast.success("If the account exists, reset instructions were sent.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit reset request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 460, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Forgot password</h2>
      <form className="form" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Send reset link"}
        </button>
      </form>
      {message && (
        <p className="notice" style={{ marginTop: "0.9rem", marginBottom: 0 }}>
          {message}
        </p>
      )}
    </div>
  );
}
