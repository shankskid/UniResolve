import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("uniresolve_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Convert all camelCase keys in API responses to snake_case.
// The backend (Sequelize) serializes as camelCase but the frontend
// components read snake_case field names (e.g. created_at, sla_deadline).
function camelToSnake(str) {
  return str.replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`);
}

function convertKeysToSnakeCase(value) {
  if (Array.isArray(value)) {
    return value.map(convertKeysToSnakeCase);
  }
  if (value !== null && typeof value === "object" && !(value instanceof File) && !(value instanceof Blob)) {
    return Object.keys(value).reduce((acc, key) => {
      acc[camelToSnake(key)] = convertKeysToSnakeCase(value[key]);
      return acc;
    }, {});
  }
  return value;
}

api.interceptors.response.use((response) => {
  if (response.data && typeof response.data === "object") {
    response.data = convertKeysToSnakeCase(response.data);
  }
  return response;
});

export default api;
