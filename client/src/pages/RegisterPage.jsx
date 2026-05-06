import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/auth";
import { getDepartments, getFaculties, getHalls } from "../services/reference";

const USER_TYPES = [
  { value: "student", label: "Student" },
  { value: "staff", label: "Staff" },
  { value: "lecturer", label: "Lecturer" }
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [halls, setHalls] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    user_type: "student",
    faculty_id: "",
    department_id: "",
    registration_number: "",
    lives_in_hall: true,
    hall_id: ""
  });

  const selectedDepartment = useMemo(
    () => departments.find((item) => item.id === form.department_id),
    [departments, form.department_id]
  );

  useEffect(() => {
    getFaculties()
      .then(setFaculties)
      .catch(() => toast.error("Failed to load faculties."));
  }, []);

  useEffect(() => {
    if (!form.faculty_id) {
      setDepartments([]);
      setForm((prev) => ({ ...prev, department_id: "", hall_id: "" }));
      return;
    }
    getDepartments(form.faculty_id)
      .then((items) => {
        setDepartments(items);
      })
      .catch(() => toast.error("Failed to load departments."));
  }, [form.faculty_id]);

  useEffect(() => {
    if (!selectedDepartment?.campus_id || form.user_type !== "student") {
      setHalls([]);
      setForm((prev) => ({ ...prev, hall_id: "" }));
      return;
    }
    getHalls(selectedDepartment.campus_id)
      .then((items) => setHalls(items))
      .catch(() => toast.error("Failed to load halls."));
  }, [selectedDepartment?.campus_id, form.user_type]);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
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
        faculty_id: form.faculty_id,
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
    <div className="card" style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Register</h2>
      <p className="muted">Step {step} of 4</p>
      <form className="form" onSubmit={onSubmit}>
        {step === 1 && (
          <div className="grid grid-2">
            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input id="name" className="input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="user_type">
                User type
              </label>
              <select
                id="user_type"
                className="select"
                value={form.user_type}
                onChange={(e) => update("user_type", e.target.value)}
              >
                {USER_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {form.user_type === "student" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="label" htmlFor="registration_number">
                  Registration number
                </label>
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
          <div className="grid grid-2">
            <div>
              <label className="label" htmlFor="faculty_id">
                Faculty
              </label>
              <select
                id="faculty_id"
                className="select"
                value={form.faculty_id}
                onChange={(e) => update("faculty_id", e.target.value)}
                required
              >
                <option value="">Select faculty</option>
                {faculties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="department_id">
                Department
              </label>
              <select
                id="department_id"
                className="select"
                value={form.department_id}
                onChange={(e) => update("department_id", e.target.value)}
                required
                disabled={!form.faculty_id}
              >
                <option value="">Select department</option>
                {departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <>
            {form.user_type !== "student" ? (
              <p className="notice">Hall selection is only for students.</p>
            ) : (
              <div className="form">
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.lives_in_hall)}
                    onChange={(e) => update("lives_in_hall", e.target.checked)}
                  />
                  I stay in university halls
                </label>
                <div>
                  <label className="label" htmlFor="hall_id">
                    Hall
                  </label>
                  <select
                    id="hall_id"
                    className="select"
                    value={form.hall_id}
                    onChange={(e) => update("hall_id", e.target.value)}
                    disabled={!form.lives_in_hall || !selectedDepartment?.campus_id}
                    required={Boolean(form.lives_in_hall)}
                  >
                    <option value="">Select hall</option>
                    {halls.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <div className="grid grid-2">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
              />
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.65rem", marginTop: "0.4rem" }}>
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={() => setStep((prev) => prev - 1)}>
              Back
            </button>
          )}
          {step < 4 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep((prev) => prev + 1)}>
              Next
            </button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
