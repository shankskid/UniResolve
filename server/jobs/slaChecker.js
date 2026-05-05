require("dotenv").config();
const cron = require("node-cron");
const { Op } = require("sequelize");
const { JURISDICTIONS, ROLES, TICKET_STATUS } = require("@uniresolve/shared");
const { sequelize, Department, OfficerScope, Ticket, TicketEscalation, TicketHistory, User } = require("../models");
const NotificationService = require("../services/NotificationService");

const ACTIVE_STATUSES = [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.PENDING_REVIEW];

async function historyExists(ticketId, fieldChanged, transaction) {
  const row = await TicketHistory.findOne({
    where: {
      ticket_id: ticketId,
      changed_by: "SYSTEM",
      field_changed: fieldChanged
    },
    transaction
  });
  return Boolean(row);
}

async function writeSystemHistory(ticketId, fieldChanged, oldValue, newValue, transaction) {
  await TicketHistory.create(
    {
      ticket_id: ticketId,
      changed_by: "SYSTEM",
      field_changed: fieldChanged,
      old_value: oldValue == null ? null : String(oldValue),
      new_value: newValue == null ? null : String(newValue)
    },
    { transaction }
  );
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

async function getOverseerRecipients(ticket, transaction) {
  if (ticket.jurisdiction_type === JURISDICTIONS.HALL) {
    const users = await User.findAll({
      where: {
        role: ROLES.HALL_OVERSEER,
        campus_id: ticket.campus_id,
        is_active: true
      },
      attributes: ["id"],
      transaction
    });
    return users.map((row) => row.id);
  }

  if (ticket.jurisdiction_type === JURISDICTIONS.DEPARTMENT) {
    if (!ticket.submitter?.department_id) {
      return [];
    }
    return getFacultyOverseersForDepartment(ticket.submitter.department_id, transaction);
  }

  if (ticket.jurisdiction_type === JURISDICTIONS.CAMPUS) {
    const scopes = await OfficerScope.findAll({
      where: { scope_type: "campus", scope_id: ticket.campus_id },
      include: [
        {
          model: User,
          required: true,
          where: { role: ROLES.CAMPUS_ADMIN, is_active: true }
        }
      ],
      attributes: ["user_id"],
      transaction
    });
    return scopes.map((scope) => scope.user_id);
  }

  const users = await User.findAll({
    where: { role: ROLES.UNIVERSITY_ADMIN, is_active: true },
    attributes: ["id"],
    transaction
  });
  return users.map((row) => row.id);
}

async function handleWarning(ticket, elapsedPct, transaction) {
  if (!ticket.assigned_to) {
    return;
  }
  const alreadyWarned = await historyExists(ticket.id, "sla_warning_75", transaction);
  if (alreadyWarned) {
    return;
  }

  await NotificationService.notifyMany(
    [ticket.assigned_to],
    {
      ticket_id: ticket.id,
      type: "sla_warning_75",
      message: `Ticket ${ticket.id} is at ${Math.round(elapsedPct)}% of SLA time.`
    },
    transaction
  );

  const assignee = await User.findByPk(ticket.assigned_to, { attributes: ["email"], transaction });
  if (assignee?.email) {
    await NotificationService.sendEmail({
      to: assignee.email,
      subject: `UniResolve SLA Warning - ${ticket.id}`,
      text: `Ticket ${ticket.id} has reached 75% of SLA elapsed time.`
    });
  }

  await writeSystemHistory(ticket.id, "sla_warning_75", null, "triggered", transaction);
}

async function handleBreach(ticket, transaction) {
  const alreadyBreachedHistory = await historyExists(ticket.id, "sla_breach", transaction);
  if (alreadyBreachedHistory) {
    return;
  }

  const priorBreached = ticket.sla_breached;
  ticket.sla_breached = true;
  await ticket.save({ transaction });

  await writeSystemHistory(ticket.id, "sla_breach", priorBreached, true, transaction);

  const overseerRecipients = await getOverseerRecipients(ticket, transaction);
  await NotificationService.notifyMany(
    overseerRecipients,
    {
      ticket_id: ticket.id,
      type: "sla_breach",
      message: `Ticket ${ticket.id} has breached SLA.`
    },
    transaction
  );

  if (ticket.status === TICKET_STATUS.OPEN) {
    const targetRole = getEscalationTargetRole(ticket);
    await TicketEscalation.create(
      {
        ticket_id: ticket.id,
        escalated_by: ticket.submitter_id,
        escalated_to_role: targetRole,
        reason: "Automatic escalation on SLA breach."
      },
      { transaction }
    );
    await writeSystemHistory(ticket.id, "sla_auto_escalation", null, targetRole, transaction);
  }
}

async function processTicket(ticket) {
  const now = Date.now();
  const createdSource = ticket.createdAt || ticket.created_at;
  const deadlineSource = ticket.sla_deadline || ticket.slaDeadline;
  const created = new Date(createdSource).getTime();
  const deadline = new Date(deadlineSource).getTime();

  if (!Number.isFinite(created) || !Number.isFinite(deadline) || deadline <= created) {
    return;
  }

  const elapsedPct = ((now - created) / (deadline - created)) * 100;

  await sequelize.transaction(async (transaction) => {
    if (elapsedPct >= 75 && elapsedPct < 100) {
      await handleWarning(ticket, elapsedPct, transaction);
    }
    if (elapsedPct >= 100) {
      await handleBreach(ticket, transaction);
    }
  });
}

async function runSlaCheckOnce() {
  const tickets = await Ticket.findAll({
    where: {
      status: { [Op.in]: ACTIVE_STATUSES },
      sla_deadline: { [Op.ne]: null }
    },
    include: [
      {
        model: User,
        as: "submitter",
        attributes: ["id", "department_id"]
      }
    ],
    order: [["created_at", "ASC"]]
  });

  let processed = 0;
  let failed = 0;

  for (const ticket of tickets) {
    try {
      await processTicket(ticket);
      processed += 1;
    } catch (error) {
      failed += 1;
      // eslint-disable-next-line no-console
      console.error(`slaChecker failed for ticket ${ticket.id}:`, error);
    }
  }

  return { processed, failed };
}

function startSlaChecker() {
  return cron.schedule("*/15 * * * *", async () => {
    const result = await runSlaCheckOnce();
    // eslint-disable-next-line no-console
    console.log(`slaChecker run complete: processed=${result.processed}, failed=${result.failed}`);
  });
}

if (require.main === module) {
  startSlaChecker();
  // eslint-disable-next-line no-console
  console.log("slaChecker started: schedule */15 * * * *");
}

module.exports = {
  runSlaCheckOnce,
  startSlaChecker
};
