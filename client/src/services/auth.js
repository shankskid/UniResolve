import api from "./api";

export async function registerUser(payload) {
  const { data } = await api.post("/auth/register", payload);
  return data.user;
}

export async function loginUser(payload) {
  const { data } = await api.post("/auth/login", payload);
  return data;
}

export async function me() {
  const { data } = await api.get("/auth/me");
  return data.user;
}

export async function forgotPassword(payload) {
  const { data } = await api.post("/auth/forgot-password", payload);
  return data;
}

export async function resetPassword(payload) {
  const { data } = await api.post("/auth/reset-password", payload);
  return data;
}
