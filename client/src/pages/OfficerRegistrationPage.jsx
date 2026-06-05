import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { registerOfficer } from "../services/auth";
import { getDepartments, getHalls } from "../services/reference";

const INITIAL_FORM = {
  name: "",
  email: "",
  password: ""
};
const INITIAL_SCOPES = ["", ""];

export default function OfficerRegistrationPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [departments, setDepartments] = useState([]);
  const [halls, setHalls] = useState([]);
  const [scopeType, setScopeType] = useState("department");
  const [scopeIds, setScopeIds] = useState(INITIAL_SCOPES);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getDepartments(), getHalls()])
      .then(([departmentItems, hallItems]) => {
        if (!mounted) {
          return;
        }
        setDepartments(departmentItems);
        setHalls(hallItems);
      })
      .catch(() => {
        if (mounted) {
          toast.error("Failed to load reference data.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setScopeIds(INITIAL_SCOPES);
  }, [scopeType]);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateScope(index, value) {
    setScopeIds((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  }

  async function onSubmit(event) {
    event.preventDefault();
    const selectedScopes = scopeIds.filter(Boolean);
    if (selectedScopes.length !== 2) {
      toast.error("Select exactly two assignments.");
      return;
    }
    if (new Set(selectedScopes).size !== 2) {
      toast.error("Assignments must be two distinct selections.");
      return;
    }
    setSubmitting(true);
    try {
      await registerOfficer({
        name: form.name,
        email: form.email,
        password: form.password,
        scope_type: scopeType,
        scope_ids: selectedScopes
      });
      toast.success("Officer account created and assigned to you.");
      setForm(INITIAL_FORM);
      setScopeIds(INITIAL_SCOPES);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create officer account.");
    } finally {
      setSubmitting(false);
    }
  }

  if (user?.role !== "overseer") {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Register officer</h2>
        <p className="muted">Only overseer can register officers.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Register officer</h2>
      <p className="muted">New officers are automatically linked to your overseer account.</p>
      <form className="form" onSubmit={onSubmit}>
        <div className="grid grid-2">
          <div>
            <label className="label" htmlFor="officer-name">
              Full name
            </label>
            <input
              id="officer-name"
              className="input"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="officer-email">
              Email
            </label>
            <input
              id="officer-email"
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="officer-password">
              Password
            </label>
            <input
              id="officer-password"
              className="input"
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </div>
          <div>
          <label className="label" htmlFor="officer-scope-type">
            Assignment type
          </label>
          <select
            id="officer-scope-type"
            className="select"
            value={scopeType}
            onChange={(e) => {
              setScopeType(e.target.value);
              setScopeIds(INITIAL_SCOPES);
            }}
            disabled={loading}
            required
          >
            <option value="department">Departments (2)</option>
            <option value="hall">Halls (2)</option>
          </select>
          </div>
          {[0, 1].map((index) => {
          const options =
            scopeType === "hall"
              ? halls
              : departments;
          const label = scopeType === "hall" ? `Hall ${index + 1}` : `Department ${index + 1}`;
          return (
            <div key={`${scopeType}-${index}`}>
              <label className="label" htmlFor={`officer-scope-${index}`}>
                {label}
              </label>
              <select
                id={`officer-scope-${index}`}
                className="select"
                value={scopeIds[index]}
                onChange={(e) => updateScope(index, e.target.value)}
                disabled={loading}
                required
              >
                <option value="">Select {label.toLowerCase()}</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          );
          })}
        </div>
        <div style={{ display: "flex", gap: "0.65rem", marginTop: "0.4rem" }}>
          <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
            {submitting ? "Creating officer..." : "Create officer"}
          </button>
        </div>
      </form>
    </div>
  );
}
