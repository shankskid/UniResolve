import api from "./api";

export async function listUnreadNotifications() {
  const { data } = await api.get("/notifications");
  return data.notifications || [];
}

export async function markNotificationRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch("/notifications/read-all");
  return data;
}
