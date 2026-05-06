import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <section className="hero">
      <h1>University Grievance Management</h1>
      <p>
        UniResolve helps students and staff submit complaints, track progress, and collaborate with officers and administrators
        across campuses.
      </p>
      <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
        <Link to="/login" className="btn btn-primary">
          Login
        </Link>
        <Link to="/register" className="btn btn-secondary">
          Register
        </Link>
      </div>
    </section>
  );
}
