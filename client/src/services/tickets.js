import api from "./api";

export async function createTicket(payload) {
  const { data } = await api.post("/tickets", payload);
  return data.ticket;
}

export async function listTickets() {
  const { data } = await api.get("/tickets");
  return data.tickets || [];
}

export async function getTicket(ticketId) {
  const { data } = await api.get(`/tickets/${ticketId}`);
  return data.ticket;
}

export async function listComments(ticketId) {
  const { data } = await api.get(`/tickets/${ticketId}/comments`);
  return data.comments || [];
}

export async function addComment(ticketId, payload) {
  const { data } = await api.post(`/tickets/${ticketId}/comments`, payload);
  return data.comment;
}

export async function getHistory(ticketId) {
  const { data } = await api.get(`/tickets/${ticketId}/history`);
  return data.history || [];
}

export async function uploadAttachment(ticketId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/tickets/${ticketId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data.attachment;
}

export async function updateTicketStatus(ticketId, status) {
  const { data } = await api.patch(`/tickets/${ticketId}/status`, { status });
  return data.ticket;
}

export async function reassignTicket(ticketId, assignedTo) {
  const { data } = await api.patch(`/tickets/${ticketId}/assign`, { assigned_to: assignedTo });
  return data.ticket;
}

export async function listManagedUsers() {
  const { data } = await api.get("/admin/users");
  return data.users || [];
}

export async function listOfficerAssignments() {
  const { data } = await api.get("/admin/officer-assignments");
  return data.assignments || [];
}

export async function listOverseerAssignments() {
  const { data } = await api.get("/admin/overseer-assignments");
  return data.assignments || [];
}

export async function createOfficerAssignment(payload) {
  const { data } = await api.post("/admin/officer-assignments", payload);
  return data.assignment;
}

export async function createOverseerAssignment(payload) {
  const { data } = await api.post("/admin/overseer-assignments", payload);
  return data.assignment;
}

export async function createCategory(payload) {
  const { data } = await api.post("/admin/categories", payload);
  return data.category;
}

export async function getOfficerQueueStats() {
  const { data } = await api.get("/officer-queue-stats");
  return data.items || [];
}

export async function deleteOfficerAssignment(id) {
  await api.delete(`/admin/officer-assignments/${id}`);
}

export async function deleteOverseerAssignment(id) {
  await api.delete(`/admin/overseer-assignments/${id}`);
}

export async function listAttachments(ticketId) {
  const { data } = await api.get(`/tickets/${ticketId}/attachments`);
  return data.attachments || [];
}

export async function updateTicketUrgency(ticketId, urgency) {
  const { data } = await api.patch(`/tickets/${ticketId}/urgency`, { urgency });
  return data.ticket;
}
