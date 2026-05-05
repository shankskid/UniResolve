const crypto = require("crypto");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const {
  ANONYMOUS_SUBMISSION,
  canBeAssignedRole,
  JURISDICTIONS,
  ROLES,
  TICKET_STATUS,
  URGENCY
} = require("@uniresolve/shared");
const {
  sequelize,
  CannedResponse,
  Category,
  Department,
  Hall,
  KnowledgeBase,
  OfficerScope,
  ResolutionChecklist,
  SatisfactionSurvey,
  Ticket,
  TicketAttachment,
  TicketChecklistItem,
  TicketComment,
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
const OFFICER_OR_ADMIN_ROLES = [
  ROLES.HALL_GRIEVANCE_OFFICER,
  ROLES.DEPT_GRIEVANCE_OFFICER,
  ROLES.HALL_OVERSEER,
  ROLES.FACULTY_OVERSEER,
  ROLES.CAMPUS_ADMIN,
  ROLES.UNIVERSITY_ADMIN
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

async function getFacultyOverseersForDepartment(departmentId, transaction) {
  const department = await Department.findByPk(departmentId, {
    attributes: ["faculty_id"],
    transaction
  });
  if (!department) {
    return [];
  }

  const scopes = await OfficerScope.findAll({
    where: {
      scope_type: "faculty",
      scope_id: department.faculty_id
    },
    include: [
      {
        model: User,
        required: true,
        where: {
          role: ROLES.FACULTY_OVERSEER,
          is_active: true
        }
      }
    ],
    transaction
  });

  return scopes.map((scope) => scope.user_id);
}

async function getEscalationTargetUserIds(ticket, targetRole, transaction) {
  if (targetRole === ROLES.HALL_OVERSEER) {
    const users = await User.findAll({
      where: {
        role: ROLES.HALL_OVERSEER,
        campus_id: ticket.campus_id,
        is_active: true
      },
      attributes: ["id"],
      transaction
    });
    return users.map((userRecord) => userRecord.id);
  }

  if (targetRole === ROLES.FACULTY_OVERSEER) {
    const submitterDepartmentId = ticket.submitter?.department_id;
    if (!submitterDepartmentId) {
      return [];
    }
    return getFacultyOverseersForDepartment(submitterDepartmentId, transaction);
  }

  if (targetRole === ROLES.UNIVERSITY_ADMIN) {
    const users = await User.findAll({
      where: {
        role: ROLES.UNIVERSITY_ADMIN,
        is_active: true
      },
      attributes: ["id"],
      transaction
    });
    return users.map((userRecord) => userRecord.id);
  }

  return [];
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

async function buildTicketChecklist(ticketId, categoryId, transaction) {
  const templateSteps = await ResolutionChecklist.findAll({
    where: { category_id: categoryId },
    order: [["step_order", "ASC"]],
    transaction
  });

  for (const step of templateSteps) {
    await TicketChecklistItem.create(
      {
        ticket_id: ticketId,
        checklist_id: step.id
      },
      { transaction }
    );
  }
}

async function createTicketCore(submitter, payload, forcedAnonymous = false) {
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
        is_anonymous: forcedAnonymous || Boolean(payload.is_anonymous),
        sla_deadline
      },
      { transaction }
    );

    await buildTicketChecklist(ticket.id, category.id, transaction);
    await writeHistory(ticket.id, "SYSTEM", "assigned_to", null, route.assignee ? route.assignee.id : null, transaction);
    await writeHistory(ticket.id, "SYSTEM", "sla_deadline", null, sla_deadline.toISOString(), transaction);

    if (route.assignee) {
      await NotificationService.notifyMany(
        [route.assignee.id],
        {
          ticket_id: ticket.id,
          type: "ticket_assigned",
          message: `You have been assigned ticket ${ticket.id}.`
        },
        transaction
      );
    }

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

    if (category.name === "Sexual Harassment / Discrimination") {
      const universityAdmins = await User.findAll({
        where: {
          role: ROLES.UNIVERSITY_ADMIN,
          is_active: true
        },
        attributes: ["id"],
        transaction
      });

      await NotificationService.notifyMany(
        universityAdmins.map((record) => record.id),
        {
          ticket_id: ticket.id,
          type: "harassment_alert",
          message: `Urgent harassment/discrimination ticket ${ticket.id} requires immediate attention.`
        },
        transaction
      );
    }

    return ticket;
  });
}

async function createTicket(user, payload) {
  if (!TICKET_CREATOR_ROLES.includes(user.role)) {
    throw new Error("Only students, staff, or lecturers can create tickets.");
  }
  const submitter = await User.findByPk(user.id);
  return createTicketCore(submitter, payload, false);
}

async function createAnonymousTicket(payload) {
  const category = await Category.findByPk(payload.category_id);
  if (!category) {
    throw new Error("Invalid submitter or category.");
  }
  if (!ANONYMOUS_SUBMISSION.SENSITIVE_CATEGORIES.includes(category.name)) {
    throw new Error("Anonymous submission is limited to sensitive categories.");
  }

  const department = await Department.findByPk(payload.department_id);
  if (!department) {
    throw new Error("Selected department does not exist.");
  }

  if (payload.hall_id) {
    const hall = await Hall.findByPk(payload.hall_id);
    if (!hall) {
      throw new Error("Selected hall does not exist.");
    }
    if (hall.campus_id !== department.campus_id) {
      throw new Error("Students cannot register with a hall from a different campus.");
    }
  }

  const contactEmail = payload.contact_email && payload.contact_email.trim()
    ? payload.contact_email.trim().toLowerCase()
    : `anonymous.${Date.now()}.${crypto.randomBytes(4).toString("hex")}@uniresolve.local`;

  const randomPassword = crypto.randomBytes(24).toString("hex");
  const passwordHash = await bcrypt.hash(randomPassword, 12);
  const registration = `ANON-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

  const submitter = await User.create({
    name: "Anonymous Submitter",
    email: contactEmail,
    password_hash: passwordHash,
    role: ROLES.STUDENT,
    user_type: ROLES.STUDENT,
    registration_number: registration,
    department_id: department.id,
    hall_id: payload.hall_id || null,
    campus_id: department.campus_id
  });

  return createTicketCore(submitter, { ...payload, urgency: URGENCY.URGENT }, true);
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

  if (status === TICKET_STATUS.RESOLVED) {
    const incomplete = await TicketChecklistItem.count({
      where: {
        ticket_id: ticket.id,
        is_completed: false
      }
    });
    if (incomplete > 0) {
      throw new Error("Tickets cannot be resolved with incomplete checklist items.");
    }
  }

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

    await NotificationService.notifyMany(
      [ticket.submitter_id],
      {
        ticket_id: ticket.id,
        type: "ticket_status_updated",
        message: `Ticket ${ticket.id} status changed from ${previous} to ${status}.`
      },
      transaction
    );

    if ([TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].includes(status)) {
      const submitter = await User.findByPk(ticket.submitter_id, {
        attributes: ["email"],
        transaction
      });

      if (submitter?.email) {
        await NotificationService.sendEmail({
          to: submitter.email,
          subject: `UniResolve Ticket ${ticket.id} ${status}`,
          text: `Your ticket ${ticket.id} has been marked as ${status}.`
        });
      }
    }

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

    await NotificationService.notifyMany(
      [assignee.id, ticket.submitter_id],
      {
        ticket_id: ticket.id,
        type: "ticket_reassigned",
        message: `Ticket ${ticket.id} was reassigned.`
      },
      transaction
    );

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

    const targetUserIds = await getEscalationTargetUserIds(ticket, targetRole, transaction);
    await NotificationService.notifyMany(
      targetUserIds,
      {
        ticket_id: ticket.id,
        type: "ticket_escalated",
        message: `Ticket ${ticket.id} was escalated to ${targetRole}.`
      },
      transaction
    );

    return getTicket(user, ticket.id);
  });
}

async function addComment(user, ticketId, payload) {
  const ticket = await getTicketScopedOrThrow(ticketId, user);
  const isInternal = Boolean(payload.is_internal);

  if (isInternal && !OFFICER_OR_ADMIN_ROLES.includes(user.role)) {
    throw new Error("Only officers and admins can create internal comments.");
  }

  return sequelize.transaction(async (transaction) => {
    const comment = await TicketComment.create(
      {
        ticket_id: ticket.id,
        author_id: user.id,
        body: payload.body,
        is_internal: isInternal
      },
      { transaction }
    );

    const recipients = [ticket.submitter_id, ticket.assigned_to].filter(Boolean);
    await NotificationService.notifyMany(
      recipients,
      {
        ticket_id: ticket.id,
        type: "ticket_comment_added",
        message: `A new comment was added to ticket ${ticket.id}.`
      },
      transaction
    );

    return comment;
  });
}

async function getComments(user, ticketId) {
  await getTicketScopedOrThrow(ticketId, user);
  const where = { ticket_id: ticketId };
  if (!OFFICER_OR_ADMIN_ROLES.includes(user.role)) {
    where.is_internal = false;
  }

  return TicketComment.findAll({
    where,
    include: [{ model: User, as: "author", attributes: ["id", "name", "role"] }],
    order: [["created_at", "ASC"]]
  });
}

async function addAttachment(user, ticketId, file) {
  await getTicketScopedOrThrow(ticketId, user);
  return TicketAttachment.create({
    ticket_id: ticketId,
    uploader_id: user.id,
    file_url: file.path,
    file_name: file.originalname,
    file_size: file.size
  });
}

async function getHistory(user, ticketId) {
  if (!OFFICER_OR_ADMIN_ROLES.includes(user.role)) {
    throw new Error("Role cannot view ticket history.");
  }
  await getTicketScopedOrThrow(ticketId, user);
  return TicketHistory.findAll({
    where: { ticket_id: ticketId },
    order: [["created_at", "ASC"]]
  });
}

async function completeChecklistItem(user, ticketId, itemId, isCompleted) {
  if (!OFFICER_OR_ADMIN_ROLES.includes(user.role)) {
    throw new Error("Role cannot update checklist items.");
  }
  await getTicketScopedOrThrow(ticketId, user);
  const item = await TicketChecklistItem.findOne({
    where: { id: itemId, ticket_id: ticketId }
  });
  if (!item) {
    throw new Error("Checklist item not found.");
  }

  item.is_completed = Boolean(isCompleted);
  item.completed_by = isCompleted ? user.id : null;
  item.completed_at = isCompleted ? new Date() : null;
  await item.save();

  return item;
}

async function submitSurvey(user, payload) {
  if (user.role !== ROLES.STUDENT) {
    throw new Error("Only students can submit surveys.");
  }

  const ticket = await Ticket.findByPk(payload.ticket_id);
  if (!ticket) {
    throw new Error("Ticket not found or inaccessible.");
  }
  if (ticket.submitter_id !== user.id) {
    throw new Error("Survey can only be submitted by the ticket submitter.");
  }
  if (![TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].includes(ticket.status)) {
    throw new Error("Survey can only be submitted for resolved or closed tickets.");
  }

  const existingSurvey = await SatisfactionSurvey.findOne({ where: { ticket_id: payload.ticket_id } });
  if (existingSurvey) {
    throw new Error("Survey already submitted for this ticket.");
  }

  return SatisfactionSurvey.create({
    ticket_id: payload.ticket_id,
    submitter_id: user.id,
    resolved_satisfactorily: payload.resolved_satisfactorily,
    response_time_score: payload.response_time_score,
    comments: payload.comments || null
  });
}

async function listCannedResponses(user, categoryId) {
  if (![...OFFICER_OR_ADMIN_ROLES].includes(user.role)) {
    throw new Error("Role cannot view canned responses.");
  }
  const where = {};
  if (categoryId) {
    where[Op.or] = [{ category_id: categoryId }, { category_id: null }];
  }
  return CannedResponse.findAll({
    where,
    order: [["created_at", "DESC"]]
  });
}

async function createCannedResponse(user, payload) {
  if (![ROLES.CAMPUS_ADMIN, ROLES.UNIVERSITY_ADMIN].includes(user.role)) {
    throw new Error("Role cannot create canned responses.");
  }

  return CannedResponse.create({
    created_by: user.id,
    title: payload.title,
    body: payload.body,
    category_id: payload.category_id || null
  });
}

async function listKnowledgeBase(user) {
  const where = OFFICER_OR_ADMIN_ROLES.includes(user.role) ? {} : { is_public: true };
  return KnowledgeBase.findAll({
    where,
    order: [["created_at", "DESC"]]
  });
}

async function createKnowledgeBase(user, payload) {
  if (!OFFICER_OR_ADMIN_ROLES.includes(user.role)) {
    throw new Error("Role cannot create knowledge base entries.");
  }

  return KnowledgeBase.create({
    created_by: user.id,
    title: payload.title,
    body: payload.body,
    category_id: payload.category_id || null,
    source_ticket_id: payload.source_ticket_id || null,
    is_public: Boolean(payload.is_public)
  });
}

async function listChecklistItems(user, ticketId) {
  await getTicketScopedOrThrow(ticketId, user);
  return TicketChecklistItem.findAll({
    where: { ticket_id: ticketId },
    include: [{ model: ResolutionChecklist, as: "checklist", attributes: ["id", "step_order", "step_text"] }],
    order: [[{ model: ResolutionChecklist, as: "checklist" }, "step_order", "ASC"]]
  });
}

module.exports = {
  createTicket,
  createAnonymousTicket,
  listTickets,
  getTicket,
  updateStatus,
  assignTicket,
  escalateTicket,
  addComment,
  getComments,
  addAttachment,
  getHistory,
  completeChecklistItem,
  submitSurvey,
  listCannedResponses,
  createCannedResponse,
  listKnowledgeBase,
  createKnowledgeBase,
  listChecklistItems
};
