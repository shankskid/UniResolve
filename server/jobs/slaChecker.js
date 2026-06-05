require("dotenv").config();
const cron = require("node-cron");
const { Op } = require("sequelize");
const { ROLES, TICKET_STATUS } = require("@uniresolve/shared");
const { sequelize, OverseerAssignment, Ticket, TicketHistory, User } = require("../models");
const NotificationService = require("../services/NotificationService");

const ACTIVE_STATUSES = [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS];

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

async function getEscalationRecipients(ticket, transaction) {
  const overseerRows = ticket.assigned_to
    ? await OverseerAssignment.findAll({
      where: { officer_id: ticket.assigned_to },
      attributes: ["overseer_id"],
      transaction
    })
    : [];
  const superadmins = await User.findAll({
    where: { role: ROLES.SUPERADMIN, is_active: true },
    attributes: ["id"],
    transaction
  });

  return [
    ...overseerRows.map((row) => row.overseer_id),
    ...superadmins.map((row) => row.id)
  ];
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

  const recipients = await getEscalationRecipients(ticket, transaction);
  await NotificationService.notifyMany(
    recipients,
    {
      ticket_id: ticket.id,
      type: "sla_breach",
      message: `Ticket ${ticket.id} has breached SLA.`
    },
    transaction
  );
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
