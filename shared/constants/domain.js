const ROLES = Object.freeze({
  STUDENT: "student",
  STAFF: "staff",
  OFFICER: "officer",
  OVERSEER: "overseer",
  SUPERADMIN: "superadmin"
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const TICKET_SCOPE = Object.freeze({
  HALL: "hall",
  DEPARTMENT: "department"
});

const TICKET_SCOPE_VALUES = Object.freeze(Object.values(TICKET_SCOPE));

const JURISDICTIONS = TICKET_SCOPE;
const JURISDICTION_VALUES = TICKET_SCOPE_VALUES;

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
  RESOLVED: "resolved",
  CLOSED: "closed"
});

const TICKET_STATUS_VALUES = Object.freeze(Object.values(TICKET_STATUS));

function normalizeJurisdiction(value) {
  if (value === "dept") {
    return TICKET_SCOPE.DEPARTMENT;
  }
  return value;
}

module.exports = {
  ROLES,
  ROLE_VALUES,
  TICKET_SCOPE,
  TICKET_SCOPE_VALUES,
  JURISDICTIONS,
  JURISDICTION_VALUES,
  URGENCY,
  URGENCY_VALUES,
  TICKET_STATUS,
  TICKET_STATUS_VALUES,
  normalizeJurisdiction
};
