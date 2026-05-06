import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Page not found</h2>
      <p className="muted">The page you requested does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Go home
      </Link>
    </div>
  );
}
