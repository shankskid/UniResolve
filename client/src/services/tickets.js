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

export async function getChecklist(ticketId) {
  const { data } = await api.get(`/tickets/${ticketId}/checklist`);
  return data.items || [];
}

export async function updateChecklist(ticketId, itemId, isCompleted) {
  const { data } = await api.patch(`/tickets/${ticketId}/checklist/${itemId}`, { is_completed: isCompleted });
  return data.item;
}

export async function uploadAttachment(ticketId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/tickets/${ticketId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data.attachment;
}
