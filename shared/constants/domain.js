const ROLES = Object.freeze({
  STUDENT: "student",
  STAFF: "staff",
  LECTURER: "lecturer",
  HALL_GRIEVANCE_OFFICER: "hall_grievance_officer",
  HALL_OVERSEER: "hall_overseer",
  DEPT_GRIEVANCE_OFFICER: "dept_grievance_officer",
  FACULTY_OVERSEER: "faculty_overseer",
  CAMPUS_ADMIN: "campus_admin",
  UNIVERSITY_ADMIN: "university_admin"
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const JURISDICTIONS = Object.freeze({
  HALL: "hall",
  DEPARTMENT: "department",
  CAMPUS: "campus",
  UNIVERSITY: "university"
});

const JURISDICTION_VALUES = Object.freeze(Object.values(JURISDICTIONS));

const URGENCY = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent"
});

const URGENCY_VALUES = Object.freeze(Object.values(URGENCY));

const TICKET_STATUS = Object.freeze({
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  PENDING_REVIEW: "pending_review",
  RESOLVED: "resolved",
  CLOSED: "closed"
});

const TICKET_STATUS_VALUES = Object.freeze(Object.values(TICKET_STATUS));

function normalizeJurisdiction(value) {
  if (value === "dept") {
    return JURISDICTIONS.DEPARTMENT;
  }
  return value;
}

module.exports = {
  ROLES,
  ROLE_VALUES,
  JURISDICTIONS,
  JURISDICTION_VALUES,
  URGENCY,
  URGENCY_VALUES,
  TICKET_STATUS,
  TICKET_STATUS_VALUES,
  normalizeJurisdiction
};
