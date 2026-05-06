import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { getCategories } from "../services/reference";
import { createTicket } from "../services/tickets";

const DEFAULT_FORM = {
  title: "",
  description: "",
  category_id: "",
  urgency: "medium",
  is_anonymous: false
};

export default function NewTicketPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => toast.error("Failed to load categories."));
  }, []);

  const selectedCategory = useMemo(() => categories.find((c) => c.id === form.category_id), [categories, form.category_id]);
  const forceAnonymousHint = selectedCategory?.name === "Sexual Harassment / Discrimination";
  const forceUrgency = selectedCategory?.name === "Sexual Harassment / Discrimination";

  useEffect(() => {
    if (forceUrgency && form.urgency !== "urgent") {
      setForm((prev) => ({ ...prev, urgency: "urgent" }));
    }
  }, [forceUrgency, form.urgency]);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        urgency: forceUrgency ? "urgent" : form.urgency,
        is_anonymous: forceAnonymousHint ? true : Boolean(form.is_anonymous)
      };
      const ticket = await createTicket(payload);
      toast.success("Ticket submitted.");
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Submit new ticket</h2>
      <form className="form" onSubmit={submit}>
        <div>
          <label className="label" htmlFor="ticket-title">
            Title
          </label>
          <input
            id="ticket-title"
            className="input"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="ticket-description">
            Description
          </label>
          <textarea
            id="ticket-description"
            className="textarea"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            required
          />
        </div>
        <div className="grid grid-2">
          <div>
            <label className="label" htmlFor="ticket-category">
              Category
            </label>
            <select
              id="ticket-category"
              className="select"
              value={form.category_id}
              onChange={(e) => update("category_id", e.target.value)}
              required
            >
              <option value="">Select category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ticket-urgency">
              Urgency
            </label>
            <select
              id="ticket-urgency"
              className="select"
              value={form.urgency}
              onChange={(e) => update("urgency", e.target.value)}
              disabled={forceUrgency}
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            type="checkbox"
            checked={forceAnonymousHint ? true : Boolean(form.is_anonymous)}
            onChange={(e) => update("is_anonymous", e.target.checked)}
            disabled={forceAnonymousHint}
          />
          Submit anonymously
        </label>
        {forceAnonymousHint && (
          <div className="notice">For this category, anonymous mode is recommended and urgency is enforced by policy.</div>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit ticket"}
        </button>
      </form>
    </div>
  );
}
