const { ROLES } = require("./domain");

const ANONYMOUS_SUBMISSION = Object.freeze({
  ROUTE: "/api/submit-anonymous",
  MAX_ATTACHMENT_BYTES: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ]),
  SENSITIVE_CATEGORIES: Object.freeze([
    "Sexual Harassment / Discrimination"
  ])
});

const NON_ASSIGNABLE_ROLES = Object.freeze([
  ROLES.STUDENT,
  ROLES.STAFF,
  ROLES.OVERSEER
]);

function canBeAssignedRole(role) {
  return !NON_ASSIGNABLE_ROLES.includes(role);
}

module.exports = {
  ANONYMOUS_SUBMISSION,
  NON_ASSIGNABLE_ROLES,
  canBeAssignedRole
};
