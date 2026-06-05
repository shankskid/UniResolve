const { Op } = require("sequelize");
const { ROLES, TICKET_STATUS } = require("@uniresolve/shared");
const { Category, OverseerAssignment, Ticket, TicketHistory, User } = require("../models");

const ACTIVE_STATUSES = [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS];

function resolutionHours(ticket) {
  const created = ticket.createdAt || ticket.created_at;
  const ended = ticket.resolved_at || ticket.closed_at;
  if (!created || !ended) {
    return null;
  }
  return (new Date(ended).getTime() - new Date(created).getTime()) / (1000 * 60 * 60);
}

function average(numbers) {
  if (!numbers.length) {
    return 0;
  }
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

async function getSupervisedOfficerIds(user) {
  if (user.role === ROLES.SUPERADMIN) {
    const officers = await User.findAll({ where: { role: ROLES.OFFICER, is_active: true }, attributes: ["id"] });
    return officers.map((officer) => officer.id);
  }

  if (user.role !== ROLES.OVERSEER) {
    return [];
  }

  const rows = await OverseerAssignment.findAll({
    where: { overseer_id: user.id },
    attributes: ["officer_id"]
  });
  return rows.map((row) => row.officer_id);
}

async function getScopedTickets(user, filters = {}) {
  const where = { ...filters };

  if ([ROLES.STUDENT, ROLES.STAFF].includes(user.role)) {
    where.submitter_id = user.id;
  } else if (user.role === ROLES.OFFICER) {
    where.assigned_to = user.id;
  } else if (user.role === ROLES.OVERSEER) {
    where.assigned_to = { [Op.in]: await getSupervisedOfficerIds(user) };
  } else if (user.role !== ROLES.SUPERADMIN) {
    throw new Error("Role cannot access analytics.");
  }

  return Ticket.findAll({
    where,
    include: [
      { model: Category, attributes: ["id", "name", "jurisdiction_type"] },
      { model: User, as: "submitter", attributes: ["id", "department_id", "hall_id"] },
      { model: User, as: "assignee", attributes: ["id", "name", "email"] }
    ]
  });
}

async function getOverview(user) {
  const tickets = await getScopedTickets(user);
  const statusCount = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0
  };
  const urgencyCount = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0
  };
  const resolutionDurations = [];

  for (const ticket of tickets) {
    if (Object.prototype.hasOwnProperty.call(statusCount, ticket.status)) {
      statusCount[ticket.status] += 1;
    }
    urgencyCount[ticket.urgency] = (urgencyCount[ticket.urgency] || 0) + 1;
    const duration = resolutionHours(ticket);
    if (duration != null && duration >= 0) {
      resolutionDurations.push(duration);
    }
  }

  return {
    total_tickets: tickets.length,
    active_tickets: tickets.filter((ticket) => ACTIVE_STATUSES.includes(ticket.status)).length,
    status_breakdown: statusCount,
    urgency_breakdown: urgencyCount,
    avg_resolution_hours: Number(average(resolutionDurations).toFixed(2))
  };
}

async function getOfficerAnalytics(user, officerId) {
  if (![ROLES.OVERSEER, ROLES.SUPERADMIN].includes(user.role)) {
    throw new Error("Role cannot access officer analytics.");
  }

  const allowedOfficerIds = await getSupervisedOfficerIds(user);
  if (!allowedOfficerIds.includes(officerId)) {
    throw new Error("Officer not found.");
  }

  const officer = await User.findByPk(officerId, { attributes: ["id", "name", "email", "role"] });
  if (!officer || officer.role !== ROLES.OFFICER) {
    throw new Error("Officer not found.");
  }

  const tickets = await Ticket.findAll({ where: { assigned_to: officer.id } });
  const resolvedTickets = tickets.filter((ticket) => [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].includes(ticket.status));
  const durations = resolvedTickets.map(resolutionHours).filter((value) => value != null && value >= 0);

  return {
    officer,
    assigned_count: tickets.length,
    active_count: tickets.filter((ticket) => ACTIVE_STATUSES.includes(ticket.status)).length,
    resolved_count: resolvedTickets.length,
    urgent_active_count: tickets.filter((ticket) => ticket.urgency === "urgent" && ACTIVE_STATUSES.includes(ticket.status)).length,
    avg_resolution_hours: Number(average(durations).toFixed(2))
  };
}

async function getByCategory(user) {
  const tickets = await getScopedTickets(user);
  const summary = new Map();

  for (const ticket of tickets) {
    const key = ticket.Category?.id || "unknown";
    if (!summary.has(key)) {
      summary.set(key, {
        category_id: ticket.Category?.id || null,
        category_name: ticket.Category?.name || "Unknown",
        ticket_count: 0
      });
    }
    summary.get(key).ticket_count += 1;
  }

  return Array.from(summary.values()).sort((a, b) => b.ticket_count - a.ticket_count);
}

async function getSlaCompliance(user) {
  const tickets = await getScopedTickets(user);
  const officerStats = new Map();

  for (const ticket of tickets) {
    const key = ticket.assigned_to;
    if (!key) {
      continue;
    }
    if (!officerStats.has(key)) {
      officerStats.set(key, {
        id: key,
        name: ticket.assignee?.name || "Unknown",
        total: 0,
        breached: 0
      });
    }
    const row = officerStats.get(key);
    row.total += 1;
    if (ticket.sla_breached) {
      row.breached += 1;
    }
  }

  const byOfficer = Array.from(officerStats.values()).map((item) => ({
    ...item,
    breach_rate_pct: item.total === 0 ? 0 : Number(((item.breached / item.total) * 100).toFixed(2))
  }));

  return {
    by_officer: byOfficer,
    by_department: [],
    by_campus: []
  };
}

function escapeCsv(value) {
  if (value == null) {
    return "";
  }
  const string = String(value);
  if (/[",\n]/.test(string)) {
    return `"${string.replace(/"/g, '""')}"`;
  }
  return string;
}

async function exportTicketsCsv(user, filters) {
  if (![ROLES.OVERSEER, ROLES.SUPERADMIN].includes(user.role)) {
    throw new Error("Role cannot export reports.");
  }

  const where = {};
  if (filters.from || filters.to) {
    where.created_at = {};
    if (filters.from) {
      where.created_at[Op.gte] = new Date(filters.from);
    }
    if (filters.to) {
      where.created_at[Op.lte] = new Date(filters.to);
    }
  }
  if (filters.category_id) {
    where.category_id = filters.category_id;
  }

  const tickets = await getScopedTickets(user, where);
  const header = [
    "ticket_id",
    "title",
    "status",
    "urgency",
    "scope_type",
    "category",
    "submitter_id",
    "assignee",
    "created_at",
    "resolved_at",
    "closed_at"
  ];

  const rows = tickets.map((ticket) => [
    ticket.id,
    ticket.title,
    ticket.status,
    ticket.urgency,
    ticket.scope_type || ticket.jurisdiction_type,
    ticket.Category?.name || "",
    ticket.submitter_id,
    ticket.assignee?.name || "",
    ticket.created_at,
    ticket.resolved_at,
    ticket.closed_at
  ]);

  return [header, ...rows].map((line) => line.map(escapeCsv).join(",")).join("\n");
}

async function getAuditLog(user, filters) {
  if (user.role !== ROLES.SUPERADMIN) {
    throw new Error("Only superadmin can access audit logs.");
  }

  const where = {};
  if (filters.user) {
    where.changed_by = filters.user;
  }
  if (filters.ticket_id) {
    where.ticket_id = filters.ticket_id;
  }
  if (filters.action) {
    where.field_changed = filters.action;
  }

  return TicketHistory.findAll({
    where,
    include: [{ model: Ticket, attributes: ["id"], required: true }],
    order: [["created_at", "DESC"]],
    limit: 1000
  });
}

module.exports = {
  getOverview,
  getOfficerAnalytics,
  getByCategory,
  getSlaCompliance,
  exportTicketsCsv,
  getAuditLog
};
