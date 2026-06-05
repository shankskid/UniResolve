const { ROLES, TICKET_SCOPE } = require("@uniresolve/shared");
const { OfficerAssignment, User } = require("../models");

async function findOfficer(scopeType, scopeId, transaction) {
  const assignment = await OfficerAssignment.findOne({
    where: {
      scope_type: scopeType,
      scope_id: scopeId
    },
    include: [
      {
        model: User,
        as: "officer",
        required: true,
        where: {
          role: ROLES.OFFICER,
          is_active: true
        }
      }
    ],
    transaction
  });

  return assignment?.officer || null;
}

async function assign({ scopeType, submitter, transaction }) {
  if (scopeType === TICKET_SCOPE.HALL) {
    if (submitter.role !== ROLES.STUDENT) {
      throw new Error("Only students can submit hall tickets.");
    }
    if (!submitter.hall_id) {
      throw new Error("You are not registered in a hall.");
    }

    const assignee = await findOfficer(TICKET_SCOPE.HALL, submitter.hall_id, transaction);
    if (!assignee) {
      throw new Error("No active officer is assigned to your hall.");
    }

    return {
      scope_type: TICKET_SCOPE.HALL,
      scope_id: submitter.hall_id,
      assignee
    };
  }

  if (scopeType === TICKET_SCOPE.DEPARTMENT) {
    if (!submitter.department_id) {
      throw new Error("You are not registered in a department.");
    }

    const assignee = await findOfficer(TICKET_SCOPE.DEPARTMENT, submitter.department_id, transaction);
    if (!assignee) {
      throw new Error("No active officer is assigned to your department.");
    }

    return {
      scope_type: TICKET_SCOPE.DEPARTMENT,
      scope_id: submitter.department_id,
      assignee
    };
  }

  throw new Error("Invalid ticket issue area.");
}

module.exports = {
  assign
};
