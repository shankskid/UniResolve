import api from "./api";

export async function getCampuses() {
  const { data } = await api.get("/reference/campuses");
  return data.items || [];
}

export async function getFaculties(campusId) {
  const { data } = await api.get("/reference/faculties", {
    params: campusId ? { campus_id: campusId } : {}
  });
  return data.items || [];
}

export async function getDepartments(facultyId) {
  const { data } = await api.get("/reference/departments", {
    params: facultyId ? { faculty_id: facultyId } : {}
  });
  return data.items || [];
}

export async function getHalls(campusId) {
  const { data } = await api.get("/reference/halls", {
    params: campusId ? { campus_id: campusId } : {}
  });
  return data.items || [];
}
