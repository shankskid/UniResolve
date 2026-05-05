const { Op } = require("sequelize");
const { JURISDICTIONS, ROLES, TICKET_STATUS, normalizeJurisdiction } = require("@uniresolve/shared");
const { Hall, HallZone, OfficerScope, User, Ticket } = require("../models");

async function findCampusAdmin(campusId, transaction) {
  const scope = await OfficerScope.findOne({
    where: { scope_type: "campus", scope_id: campusId },
    include: [
      {
        model: User,
        required: true,
        where: { role: ROLES.CAMPUS_ADMIN, is_active: true }
      }
    ],
    order: [["created_at", "ASC"]],
    transaction
  });
  return scope?.User || null;
}

async function findUniversityAdminWithLowestLoad(transaction) {
  const admins = await User.findAll({
    where: { role: ROLES.UNIVERSITY_ADMIN, is_active: true },
    attributes: ["id"],
    transaction
  });
  if (!admins.length) {
    return null;
  }

  const counts = await Promise.all(
    admins.map(async (admin) => ({
      userId: admin.id,
      count: await Ticket.count({
        where: {
          assigned_to: admin.id,
          status: {
            [Op.in]: [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.PENDING_REVIEW]
          }
        },
        transaction
      })
    }))
  );

  counts.sort((a, b) => a.count - b.count);
  return User.findByPk(counts[0].userId, { transaction });
}

async function assign({ category, submitter, transaction }) {
  const jurisdiction = normalizeJurisdiction(category.jurisdiction_type);
  let assignee = null;
  let fallbackEscalation = false;

  if (jurisdiction === JURISDICTIONS.HALL) {
    if (submitter.role !== ROLES.STUDENT) {
      throw new Error("Staff cannot submit residential complaints.");
    }
    if (!submitter.hall_id) {
      throw new Error("Submitter has no hall assignment for hall-jurisdiction complaint.");
    }

    const hall = await Hall.findByPk(submitter.hall_id, {
      include: [{ model: HallZone }],
      transaction
    });
    if (!hall || !hall.HallZone) {
      throw new Error("Unable to resolve hall grievance zone.");
    }

    if (hall.HallZone.grievance_officer_id) {
      assignee = await User.findOne({
        where: {
          id: hall.HallZone.grievance_officer_id,
          role: ROLES.HALL_GRIEVANCE_OFFICER,
          is_active: true
        },
        transaction
      });
    }
  } else if (jurisdiction === JURISDICTIONS.DEPARTMENT) {
    const scope = await OfficerScope.findOne({
      where: {
        scope_type: "department",
        scope_id: submitter.department_id
      },
      include: [
        {
          model: User,
          required: true,
          where: {
            role: ROLES.DEPT_GRIEVANCE_OFFICER,
            is_active: true
          }
        }
      ],
      order: [["created_at", "ASC"]],
      transaction
    });
    assignee = scope?.User || null;
  } else if (jurisdiction === JURISDICTIONS.CAMPUS) {
    assignee = await findCampusAdmin(submitter.campus_id, transaction);
  } else if (jurisdiction === JURISDICTIONS.UNIVERSITY) {
    assignee = await findUniversityAdminWithLowestLoad(transaction);
  } else {
    throw new Error("Unsupported jurisdiction type.");
  }

  if (!assignee) {
    fallbackEscalation = true;
    assignee = await findCampusAdmin(submitter.campus_id, transaction);
  }

  return {
    jurisdiction,
    assignee,
    fallbackEscalation
  };
}

module.exports = {
  assign
};
