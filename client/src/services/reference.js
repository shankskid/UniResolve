import api from "./api";

export async function getDepartments() {
  const { data } = await api.get("/reference/departments");
  return data.items || [];
}

export async function getHalls() {
  const { data } = await api.get("/reference/halls");
  return data.items || [];
}

export async function getCategories() {
  const { data } = await api.get("/reference/categories");
  return data.items || [];
}
