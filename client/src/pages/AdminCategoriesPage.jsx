import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getCategories } from "../services/reference";
import { createCategory } from "../services/tickets";

const DEFAULT_FORM = {
  name: "",
  scope_type: "department",
  min_urgency: ""
};

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (user?.role !== "superadmin") {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const items = await getCategories();
        setCategories(items);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load categories.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.role]);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await createCategory({
        name: form.name.trim(),
        scope_type: form.scope_type,
        min_urgency: form.min_urgency || null
      });
      toast.success("Category created.");
      setForm(DEFAULT_FORM);
      const items = await getCategories();
      setCategories(items);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create category.");
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== "superadmin") {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Category management</h2>
        <p className="muted">Only superadmin can manage categories.</p>
      </div>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Category management</h2>
        <p className="muted" style={{ margin: 0 }}>
          Create ticket categories for hall and department issues.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create category</h3>
        <form className="form" onSubmit={submit}>
          <div className="grid grid-2">
            <div>
              <label className="label" htmlFor="category-name">
                Name
              </label>
              <input
                id="category-name"
                className="input"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="category-scope">
                Scope
              </label>
              <select
                id="category-scope"
                className="select"
                value={form.scope_type}
                onChange={(event) => update("scope_type", event.target.value)}
              >
                <option value="department">Department</option>
                <option value="hall">Hall</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="category-urgency">
              Minimum urgency (optional)
            </label>
            <select
              id="category-urgency"
              className="select"
              value={form.min_urgency}
              onChange={(event) => update("min_urgency", event.target.value)}
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()}>
            {saving ? "Saving..." : "Create category"}
          </button>
        </form>
      </div>

      {loading && <div className="card">Loading categories...</div>}
      {!loading && !categories.length && <div className="card muted">No categories found.</div>}
      {!loading && categories.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Scope</th>
                  <th>Min urgency</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.jurisdiction_type}</td>
                    <td>{category.min_urgency || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
