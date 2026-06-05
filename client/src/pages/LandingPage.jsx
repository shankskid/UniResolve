import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "",
    title: "Submit Tickets",
    desc: "Raise hall or department issues in seconds. Attach evidence, set urgency, and track progress in real time."
  },
  {
    icon: "",
    title: "Smart Routing",
    desc: "Tickets are automatically assigned to the right officer based on your hall or department — no manual handoffs."
  },
  {
    icon: "",
    title: "SLA Countdown",
    desc: "Every ticket comes with a live SLA timer so you always know when a response is due."
  },
  {
    icon: "",
    title: "Live Notifications",
    desc: "Get notified the moment your ticket is updated, commented on, or resolved by an officer."
  },
  {
    icon: "",
    title: "Analytics Dashboard",
    desc: "Officers, overseers, and admins get rich charts on ticket volumes, SLA compliance, and resolution trends."
  },
  {
    icon: "",
    title: "Role-Based Access",
    desc: "Five distinct roles — student, staff, officer, overseer, and superadmin — each with precisely scoped access."
  }
];

const STEPS = [
  { num: "1", title: "Register", desc: "Create your account in under two minutes." },
  { num: "2", title: "Submit",   desc: "Describe your issue and set urgency." },
  { num: "3", title: "Track",    desc: "Watch your ticket move through to resolution." }
];

export default function LandingPage() {
  return (
    <div className="landing">

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-eyebrow">University Grievance Management</div>
        <h1 className="hero-title">
          Resolve campus issues<br />
          <span className="hero-accent">faster than ever.</span>
        </h1>
        <p className="hero-sub">
          UniResolve gives students and staff a modern, transparent way to raise and track grievances
          — with automatic routing, SLA tracking, and real-time updates at every step.
        </p>
        <div className="hero-cta">
          <Link to="/register" className="btn btn-primary btn-lg">Get started free</Link>
          <Link to="/login"    className="btn btn-ghost btn-lg">Sign in →</Link>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <h2 className="section-title">How it works</h2>
        <div className="steps-row">
          {STEPS.map((s) => (
            <div key={s.num} className="step-card">
              <div className="step-num">{s.num}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="features-section">
        <h2 className="section-title">Everything you need</h2>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="cta-banner">
        <h2 className="cta-title">Ready to get started?</h2>
        <p className="cta-sub muted">Join your university's grievance platform today.</p>
        <Link to="/register" className="btn btn-primary btn-lg">Create your account</Link>
      </section>

    </div>
  );
}
