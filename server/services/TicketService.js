const { Op } = require("sequelize");
const { canBeAssignedRole, JURISDICTIONS, ROLES, TICKET_STATUS, URGENCY } = require("@uniresolve/shared");
const {
  sequelize,
  Category,
  Department,
  OfficerScope,
  Ticket,
  TicketEscalation,
  TicketHistory,
  User
} = require("../models");
const TicketRouter = require("./TicketRouter");
const NotificationService = require("./NotificationService");

const TICKET_CREATOR_ROLES = [ROLES.STUDENT, ROLES.STAFF, ROLES.LECTURER];
const STATUS_UPDATE_ROLES = [ROLES.HALL_GRIEVANCE_OFFICER, ROLES.DEPT_GRIEVANCE_OFFICER, ROLES.CAMPUS_ADMIN, ROLES.UNIVERSITY_ADMIN];
const ASSIGN_ROLES = [ROLES.HALL_OVERSEER, ROLES.FACULTY_OVERSEER, ROLES.CAMPUS_ADMIN, ROLES.UNIVERSITY_ADMIN];
const ESCALATE_ROLES = [
  ROLES.HALL_GRIEVANCE_OFFICER,
  ROLES.DEPT_GRIEVANCE_OFFICER,
  ROLES.HALL_OVERSEER,
  ROLES.FACULTY_OVERSEER
];

function calculateSlaDeadline(urgency) {
  const now = new Date();
  const minutesByUrgency = {
    [URGENCY.URGENT]: 24 * 60,
    [URGENCY.HIGH]: 72 * 60,
    [URGENCY.MEDIUM]: 7 * 24 * 60,
    [URGENCY.LOW]: 14 * 24 * 60
  };
  const deltaMinutes = minutesByUrgency[urgency];
  if (!deltaMinutes) {
    throw new Error("Invalid urgency.");
  }
  return new Date(now.getTime() + deltaMinutes * 60000);
}

async function writeHistory(ticket_id, changed_by, field_changed, old_value, new_value, transaction) {
  await TicketHistory.create(
    {
      ticket_id,
      changed_by,
      field_changed,
      old_value: old_value == null ? null : String(old_value),
      new_value: new_value == null ? null : String(new_value)
    },
    { transaction }
  );
}

function sanitizeSubmitter(ticketJson, viewerRole) {
  if (!ticketJson.is_anonymous) {
    return ticketJson;
  }

  if ([ROLES.CAMPUS_ADMIN, ROLES.UNIVERSITY_ADMIN].includes(viewerRole)) {
    return ticketJson;
  }

  if (!ticketJson.submitter) {
    return ticketJson;
  }

  return {
    ...ticketJson,
    submitter: {
      id: ticketJson.submitter.id,
      name: "Anonymous",
      email: null,
      department_id: null,
      hall_id: null
    }
  };
}

async function getFacultyScopeDepartmentIds(userId) {
  const scopes = await OfficerScope.findAll({
    where: { user_id: userId, scope_type: "faculty" },
    attributes: ["scope_id"]
  });
  if (!scopes.length) {
    return [];
  }
  const facultyIds = scopes.map((scope) => scope.scope_id);
  const departments = await Department.findAll({
    where: { faculty_id: { [Op.in]: facultyIds } },
    attributes: ["id"]
  });
  return departments.map((department) => department.id);
}

async function getAccessibleTicketFilter(user) {
  if ([ROLES.STUDENT, ROLES.STAFF, ROLES.LECTURER].includes(user.role)) {
    return { submitter_id: user.id };
  }
  if ([ROLES.HALL_GRIEVANCE_OFFICER, ROLES.DEPT_GRIEVANCE_OFFICER].includes(user.role)) {
    return { assigned_to: user.id };
  }
  if (user.role === ROLES.HALL_OVERSEER) {
    return { campus_id: user.campus_id, jurisdiction_type: JURISDICTIONS.HALL };
  }
  if (user.role === ROLES.FACULTY_OVERSEER) {
    const departmentIds = await getFacultyScopeDepartmentIds(user.id);
    return { jurisdiction_type: JURISDICTIONS.DEPARTMENT, "$submitter.department_id$": { [Op.in]: departmentIds } };
  }
  if (user.role === ROLES.CAMPUS_ADMIN) {
    return { campus_id: user.campus_id };
  }
  return {};
}

async function getTicketScopedOrThrow(ticketId, user) {
  const where = await getAccessibleTicketFilter(user);
  const ticket = await Ticket.findOne({
    where: { ...where, id: ticketId },
    include: [
      { model: Category, attributes: ["id", "name", "jurisdiction_type"] },
      {
        model: User,
        as: "submitter",
        attributes: ["id", "name", "email", "department_id", "hall_id", "campus_id"]
      }
    ],
    order: [["created_at", "DESC"]]
  });
  if (!ticket) {
    throw new Error("Ticket not found or inaccessible.");
  }
  return ticket;
}

async function createTicket(user, payload) {
  if (!TICKET_CREATOR_ROLES.includes(user.role)) {
    throw new Error("Only students, staff, or lecturers can create tickets.");
  }

  const submitter = await User.findByPk(user.id);
  const category = await Category.findByPk(payload.category_id);
  if (!submitter || !category) {
    throw new Error("Invalid submitter or category.");
  }

  const forcedUrgency = category.name === "Sexual Harassment / Discrimination" ? URGENCY.URGENT : null;
  const minUrgency = category.min_urgency;
  const urgencyOrder = [URGENCY.LOW, URGENCY.MEDIUM, URGENCY.HIGH, URGENCY.URGENT];
  const selectedUrgency = forcedUrgency || payload.urgency;

  if (minUrgency && urgencyOrder.indexOf(selectedUrgency) < urgencyOrder.indexOf(minUrgency)) {
    throw new Error(`Urgency for this category must be at least ${minUrgency}.`);
  }

  if (forcedUrgency && payload.urgency !== URGENCY.URGENT) {
    throw new Error("Sexual Harassment / Discrimination tickets must be urgent.");
  }

  return sequelize.transaction(async (transaction) => {
    const route = await TicketRouter.assign({ category, submitter, transaction });
    const sla_deadline = calculateSlaDeadline(selectedUrgency);

    const ticket = await Ticket.create(
      {
        title: payload.title,
        description: payload.description,
        urgency: selectedUrgency,
        category_id: category.id,
        submitter_id: submitter.id,
        assigned_to: route.assignee ? route.assignee.id : null,
        campus_id: submitter.campus_id,
        jurisdiction_type: route.jurisdiction,
        is_anonymous: Boolean(payload.is_anonymous),
        sla_deadline
      },
      { transaction }
    );

    await writeHistory(ticket.id, "SYSTEM", "assigned_to", null, route.assignee ? route.assignee.id : null, transaction);
    await writeHistory(ticket.id, "SYSTEM", "sla_deadline", null, sla_deadline.toISOString(), transaction);

    if (route.fallbackEscalation) {
      await TicketEscalation.create(
        {
          ticket_id: ticket.id,
          escalated_by: submitter.id,
          escalated_to_role: ROLES.CAMPUS_ADMIN,
          reason: "Auto-escalated due to unavailable direct assignee."
        },
        { transaction }
      );

      const campusAdmins = await OfficerScope.findAll({
        where: { scope_type: "campus", scope_id: submitter.campus_id },
        include: [{ model: User, required: true, where: { role: ROLES.CAMPUS_ADMIN, is_active: true } }],
        transaction
      });

      for (const adminScope of campusAdmins) {
        await NotificationService.createInAppNotification(
          {
            user_id: adminScope.user_id,
            ticket_id: ticket.id,
            type: "routing_fallback",
            message: `Ticket ${ticket.id} was auto-escalated due to missing assignee.`
          },
          transaction
        );
      }
    }

    return ticket;
  });
}

async function listTickets(user) {
  const where = await getAccessibleTicketFilter(user);
  const tickets = await Ticket.findAll({
    where,
    include: [
      { model: Category, attributes: ["id", "name", "jurisdiction_type"] },
      {
        model: User,
        as: "submitter",
        attributes: ["id", "name", "email", "department_id", "hall_id", "campus_id"]
      }
    ],
    order: [["created_at", "DESC"]]
  });

  return tickets.map((ticket) => sanitizeSubmitter(ticket.toJSON(), user.role));
}

async function getTicket(user, ticketId) {
  const ticket = await getTicketScopedOrThrow(ticketId, user);
  return sanitizeSubmitter(ticket.toJSON(), user.role);
}

async function updateStatus(user, ticketId, status) {
  if (!STATUS_UPDATE_ROLES.includes(user.role)) {
    throw new Error("Role cannot update ticket status.");
  }
  const ticket = await getTicketScopedOrThrow(ticketId, user);

  const previous = ticket.status;
  if (previous === status) {
    return ticket.toJSON();
  }

  return sequelize.transaction(async (transaction) => {
    ticket.status = status;
    if (status === TICKET_STATUS.RESOLVED) {
      ticket.resolved_at = new Date();
    }
    if (status === TICKET_STATUS.CLOSED) {
      ticket.closed_at = new Date();
    }
    await ticket.save({ transaction });
    await writeHistory(ticket.id, user.id, "status", previous, status, transaction);
    return getTicket(user, ticket.id);
  });
}

async function assignTicket(user, ticketId, assignedTo) {
  if (!ASSIGN_ROLES.includes(user.role)) {
    throw new Error("Role cannot assign tickets.");
  }

  const ticket = await getTicketScopedOrThrow(ticketId, user);
  const assignee = await User.findByPk(assignedTo);
  if (!assignee || !assignee.is_active) {
    throw new Error("Assignee does not exist or is inactive.");
  }
  if (!canBeAssignedRole(assignee.role)) {
    throw new Error("Overseers cannot be assigned tickets.");
  }
  if (user.role === ROLES.CAMPUS_ADMIN && assignee.campus_id !== user.campus_id) {
    throw new Error("Campus admin can only assign within their campus.");
  }

  return sequelize.transaction(async (transaction) => {
    const previous = ticket.assigned_to;
    ticket.assigned_to = assignee.id;
    await ticket.save({ transaction });
    await writeHistory(ticket.id, user.id, "assigned_to", previous, assignee.id, transaction);
    return getTicket(user, ticket.id);
  });
}

function getEscalationTargetRole(ticket) {
  if (ticket.jurisdiction_type === JURISDICTIONS.HALL) {
    return ROLES.HALL_OVERSEER;
  }
  if (ticket.jurisdiction_type === JURISDICTIONS.DEPARTMENT) {
    return ROLES.FACULTY_OVERSEER;
  }
  if (ticket.jurisdiction_type === JURISDICTIONS.CAMPUS) {
    return ROLES.UNIVERSITY_ADMIN;
  }
  return ROLES.UNIVERSITY_ADMIN;
}

async function escalateTicket(user, ticketId, reason) {
  if (!ESCALATE_ROLES.includes(user.role)) {
    throw new Error("Role cannot escalate tickets.");
  }
  const ticket = await getTicketScopedOrThrow(ticketId, user);
  const targetRole = getEscalationTargetRole(ticket);

  return sequelize.transaction(async (transaction) => {
    await TicketEscalation.create(
      {
        ticket_id: ticket.id,
        escalated_by: user.id,
        escalated_to_role: targetRole,
        reason
      },
      { transaction }
    );
    await writeHistory(ticket.id, user.id, "escalation", null, `${targetRole}:${reason}`, transaction);
    return getTicket(user, ticket.id);
  });
}

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateStatus,
  assignTicket,
  escalateTicket
};
