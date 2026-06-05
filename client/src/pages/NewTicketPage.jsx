import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCategories } from "../services/reference";
import { createTicket, uploadAttachment } from "../services/tickets";

const DEFAULT_FORM = {
  title: "",
  description: "",
  category_id: "",
  scope_type: "department"
  // urgency is intentionally removed — server auto-classifies from title + description
};

export default function NewTicketPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const canCreateTicket = ["student", "staff"].includes(user?.role);
  const canSubmitHallTicket = user?.role === "student" && Boolean(user?.hall_id);

  const scopeOptions = useMemo(() => {
    const options = [{ value: "department", label: "Department or classroom issue" }];
    if (canSubmitHallTicket) {
      options.unshift({ value: "hall", label: "Hall or hostel issue" });
    }
    return options;
  }, [canSubmitHallTicket]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => toast.error("Failed to load categories."));
  }, []);

  useEffect(() => {
    if (form.scope_type === "hall" && !canSubmitHallTicket) {
      setForm((prev) => ({ ...prev, scope_type: "department", category_id: "" }));
    }
  }, [canSubmitHallTicket, form.scope_type]);

  if (!canCreateTicket) {
    return (
      <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>Submit new ticket</h2>
        <p className="muted">Only students and staff can submit tickets.</p>
      </div>
    );
  }

  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat.jurisdiction_type === form.scope_type),
    [categories, form.scope_type]
  );

  function update(name, value) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "scope_type") next.category_id = "";
      return next;
    });
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setImage(null);
      setImagePreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (jpg, png, webp, gif).");
      event.target.value = "";
      return;
    }
    setImage(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  function clearImage() {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(event) {
    event.preventDefault();

    if (!image) {
      toast.error("A photo of the issue is required to submit a ticket.");
      return;
    }

    const wordCount = form.description.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 10) {
      toast.error(`Please provide a more detailed description (minimum 10 words). You currently have ${wordCount} word${wordCount === 1 ? '' : 's'}.`);
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await createTicket(form);
      try {
        await uploadAttachment(ticket.id, image);
      } catch (uploadError) {
        // Ticket is already created — inform user but still navigate
        toast.error(
          uploadError?.response?.data?.message ||
          "Ticket created, but your photo failed to upload. Please re-upload from the ticket page."
        );
        navigate(`/tickets/${ticket.id}`);
        return;
      }
      toast.success("Ticket submitted successfully.");
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="new-ticket-wrapper">
      <div className="card new-ticket-card">
        <div className="new-ticket-header">
          <h2 style={{ margin: 0 }}>Submit a new ticket</h2>
          <p className="muted" style={{ margin: "0.3rem 0 0" }}>
            Describe your issue below. Urgency is automatically assessed by the system from your description.
          </p>
        </div>

        {/* Medical Emergency Disclaimer */}
        <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "6px", marginBottom: "20px", fontSize: "0.9rem", border: "1px solid #fca5a5" }}>
          <strong>🚨 Urgent Medical Emergency?</strong>
          <p style={{ margin: "4px 0 0" }}>If you or someone else is experiencing a critical medical emergency, do not wait for a ticket response. Please rush immediately to the <strong>Sanatorium located at Hall 11</strong>.</p>
        </div>

        <form className="form" onSubmit={submit}>

          {/* Issue area */}
          <div>
            <label className="label" htmlFor="ticket-scope">Issue area</label>
            <select
              id="ticket-scope"
              className="select"
              value={form.scope_type}
              onChange={(e) => update("scope_type", e.target.value)}
              required
            >
              {scopeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {user?.role === "student" && !user?.hall_id && (
              <p className="muted small" style={{ marginTop: "0.4rem" }}>
                Hall issues are only available to students registered in a hall.
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="label" htmlFor="ticket-category">Category</label>
            <select
              id="ticket-category"
              className="select"
              value={form.category_id}
              onChange={(e) => update("category_id", e.target.value)}
              required
            >
              <option value="">Select category</option>
              {filteredCategories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="label" htmlFor="ticket-title">Title</label>
            <input
              id="ticket-title"
              className="input"
              placeholder="e.g. Broken door handle in room 204"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="label" htmlFor="ticket-description">
              Description
              <span className="muted small" style={{ marginLeft: "0.5rem", fontWeight: 400 }}>
                — be specific, urgency is inferred from your words
              </span>
            </label>
            <textarea
              id="ticket-description"
              className="textarea"
              placeholder="Example: The pipe under the sink in room 204 burst at 3 AM. The room is flooded and the water is reaching the hallway. Our belongings are getting wet. We need a plumber immediately."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              required
              rows={4}
            />
          </div>

          {/* Auto-urgency info box */}
          <div className="urgency-info-box">
            <span className="urgency-info-icon">⚡</span>
            <div>
              <strong>Automatic urgency assessment</strong>
              <p className="muted small" style={{ margin: "0.15rem 0 0" }}>
                The system reads your title and description and assigns an urgency level (Low → Urgent).
                Write clearly and include details like whether others are affected or if there is a safety risk.
              </p>
            </div>
          </div>

          {/* Compulsory image upload */}
          <div className="image-upload-section">
            <label className="label">
              Photo evidence <span className="required-star">*</span>
              <span className="muted small" style={{ marginLeft: "0.4rem", fontWeight: 400 }}>
                (jpg, png, webp, gif — max 10 MB)
              </span>
            </label>

            {!imagePreview ? (
              <label className="image-drop-zone" htmlFor="ticket-image">
                <input
                  ref={fileInputRef}
                  id="ticket-image"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                  disabled={submitting}
                />
                <span className="image-drop-icon">📷</span>
                <span className="image-drop-text">Click to select a photo of the issue</span>
                <span className="muted small">Image files only</span>
              </label>
            ) : (
              <div className="image-preview-wrapper">
                <img
                  src={imagePreview}
                  alt="Issue preview"
                  className="image-preview"
                />
                <div className="image-preview-meta">
                  <span className="muted small">{image.name} ({Math.round(image.size / 1024)} KB)</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={clearImage}
                    disabled={submitting}
                  >
                    Change photo
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting || !image}
          >
            {submitting ? "Submitting…" : "Submit ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}
