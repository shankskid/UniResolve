import api from "./api";

export async function getOverview() {
  const { data } = await api.get("/analytics/overview");
  return data;
}

export async function getByCategory() {
  const { data } = await api.get("/analytics/by-category");
  return data.items || [];
}

export async function getSlaCompliance() {
  const { data } = await api.get("/analytics/sla-compliance");
  return data;
}

export async function getCampusComparison() {
  const { data } = await api.get("/analytics/campus-comparison");
  return data.items || [];
}
