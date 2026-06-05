import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/auth";
import { getDepartments, getHalls } from "../services/reference";

const USER_TYPES = [
  { value: "student", label: "Student" },
  { value: "staff",   label: "Staff"    }
];

const STEPS = ["Personal Info", "Department", "Hall", "Credentials"];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [halls, setHalls] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    user_type: "student",
    department_id: "",
    registration_number: "",
    lives_in_hall: true,
    hall_id: ""
  });

  useEffect(() => {
    getDepartments().then(setDepartments).catch(() => toast.error("Failed to load departments."));
    getHalls().then(setHalls).catch(() => toast.error("Failed to load halls."));
  }, []);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validateStep(currentStep) {
    if (currentStep === 1) {
      if (!form.name.trim()) {
        toast.error("Please enter your full name.");
        return false;
      }
      if (form.user_type === "student" && !form.registration_number.trim()) {
        toast.error("Please enter your registration number.");
        return false;
      }
    }
    if (currentStep === 2) {
      if (!form.department_id) {
        toast.error("Please select a department.");
        return false;
      }
    }
    return true;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        user_type: form.user_type,
        department_id: form.department_id
      };
      if (form.user_type === "student") {
        payload.registration_number = form.registration_number;
        payload.lives_in_hall = Boolean(form.lives_in_hall);
        if (form.lives_in_hall && form.hall_id) {
          payload.hall_id = form.hall_id;
        }
      }
      await registerUser(payload);
      toast.success("Registration successful. You can now login.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <div className="auth-brand">
          <span className="brand-icon"></span>UniResolve
        </div>
        <h2 className="auth-title">Create your account</h2>

        {/* Progress bar */}
        <div className="step-progress">
          {STEPS.map((label, index) => {
            const num = index + 1;
            const isActive = num === step;
            const isDone   = num < step;
            return (
              <div key={label} className={`step-item ${isActive ? "step-active" : ""} ${isDone ? "step-done" : ""}`}>
                <div className="step-circle">{isDone ? "✓" : num}</div>
                <span className="step-label">{label}</span>
                {index < STEPS.length - 1 && <div className="step-connector" />}
              </div>
            );
          })}
        </div>

        <form className="form" onSubmit={onSubmit}>
          {step === 1 && (
            <div className="grid grid-2">
              <div>
                <label className="label" htmlFor="name">Full name</label>
                <input id="name" className="input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="user_type">I am a</label>
                <select id="user_type" className="select" value={form.user_type} onChange={(e) => update("user_type", e.target.value)}>
                  {USER_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              {form.user_type === "student" && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label" htmlFor="registration_number">Registration number</label>
                  <input
                    id="registration_number"
                    className="input"
                    value={form.registration_number}
                    onChange={(e) => update("registration_number", e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid">
              <div>
                <label className="label" htmlFor="department_id">Department</label>
                <select id="department_id" className="select" value={form.department_id} onChange={(e) => update("department_id", e.target.value)} required>
                  <option value="">Select department</option>
                  {departments.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <>
              {form.user_type !== "student" ? (
                <div className="notice">Hall selection is only for students registered in university accommodation.</div>
              ) : (
                <div className="form">
                  <label className="hall-checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(form.lives_in_hall)}
                      onChange={(e) => update("lives_in_hall", e.target.checked)}
                    />
                    I live in university halls
                  </label>
                  {form.lives_in_hall && (
                    <div>
                      <label className="label" htmlFor="hall_id">Hall</label>
                      <select id="hall_id" className="select" value={form.hall_id} onChange={(e) => update("hall_id", e.target.value)} required={Boolean(form.lives_in_hall)}>
                        <option value="">Select hall</option>
                        {halls.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <div className="grid grid-2">
              <div>
                <label className="label" htmlFor="email">Email address</label>
                <input id="email" className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input id="password" className="input" type="password" minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} required />
                <p className="muted small" style={{ marginTop: "0.3rem" }}>Minimum 8 characters</p>
              </div>
            </div>
          )}

          <div className="step-nav">
            {step > 1 && (
              <button type="button" className="btn btn-secondary" onClick={() => setStep((prev) => prev - 1)}>
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" className="btn btn-primary" onClick={() => { if (validateStep(step)) setStep((prev) => prev + 1); }}>
                Continue →
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Creating account…" : "Create account"}
              </button>
            )}
          </div>
        </form>

        <p className="auth-footer-link">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
