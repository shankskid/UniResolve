const { Op } = require("sequelize");
const { ROLES, TICKET_STATUS } = require("@uniresolve/shared");
const { Campus, Category, Department, Faculty, SatisfactionSurvey, Ticket, TicketHistory, User } = require("../models");

const ADMIN_ROLES = [ROLES.CAMPUS_ADMIN, ROLES.UNIVERSITY_ADMIN];
const OVERSIGHT_ROLES = [ROLES.HALL_OVERSEER, ROLES.FACULTY_OVERSEER, ...ADMIN_ROLES];

function ensureAdmin(user) {
  if (!ADMIN_ROLES.includes(user.role)) {
    throw new Error("Role cannot access admin analytics.");
  }
}

function ensureOversight(user) {
  if (!OVERSIGHT_ROLES.includes(user.role)) {
    throw new Error("Role cannot access officer analytics.");
  }
}

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

async function getScopedTickets(user, filters = {}) {
  const where = { ...filters };
  if (user.role === ROLES.CAMPUS_ADMIN) {
    where.campus_id = user.campus_id;
  }
  return Ticket.findAll({
    where,
    include: [
      { model: User, as: "submitter", attributes: ["id", "department_id"] },
      { model: Category, attributes: ["id", "name"] }
    ]
  });
}

async function getOverview(user) {
  ensureAdmin(user);
  const tickets = await getScopedTickets(user);
  const total = tickets.length;
  const statusCount = {
    open: 0,
    in_progress: 0,
    pending_review: 0,
    resolved: 0,
    closed: 0
  };
  let breached = 0;
  const resolutionDurations = [];

  for (const ticket of tickets) {
    statusCount[ticket.status] = (statusCount[ticket.status] || 0) + 1;
    if (ticket.sla_breached) {
      breached += 1;
    }
    const duration = resolutionHours(ticket);
    if (duration != null && duration >= 0) {
      resolutionDurations.push(duration);
    }
  }

  const slaCompliancePct = total === 0 ? 100 : ((total - breached) / total) * 100;

  return {
    total_tickets: total,
    status_breakdown: statusCount,
    sla_compliance_pct: Number(slaCompliancePct.toFixed(2)),
    avg_resolution_hours: Number(average(resolutionDurations).toFixed(2))
  };
}

async function getOfficerAnalytics(user, officerId) {
  ensureOversight(user);
  const officer = await User.findByPk(officerId);
  if (!officer) {
    throw new Error("Officer not found.");
  }

  if (user.role === ROLES.CAMPUS_ADMIN && officer.campus_id !== user.campus_id) {
    throw new Error("Officer not found.");
  }
  if (user.role === ROLES.HALL_OVERSEER && (officer.role !== ROLES.HALL_GRIEVANCE_OFFICER || officer.campus_id !== user.campus_id)) {
    throw new Error("Officer not found.");
  }
  if (user.role === ROLES.FACULTY_OVERSEER && officer.role !== ROLES.DEPT_GRIEVANCE_OFFICER) {
    throw new Error("Officer not found.");
  }

  const tickets = await Ticket.findAll({ where: { assigned_to: officer.id } });
  const resolvedTickets = tickets.filter((ticket) => [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].includes(ticket.status));
  const durations = resolvedTickets.map(resolutionHours).filter((value) => value != null && value >= 0);
  const surveys = await SatisfactionSurvey.findAll({
    include: [{ model: Ticket, required: true, where: { assigned_to: officer.id }, attributes: [] }]
  });

  return {
    officer: {
      id: officer.id,
      name: officer.name,
      role: officer.role
    },
    assigned_count: tickets.length,
    resolved_count: resolvedTickets.length,
    avg_resolution_hours: Number(average(durations).toFixed(2)),
    avg_survey_score: Number(average(surveys.map((survey) => survey.response_time_score)).toFixed(2))
  };
}

async function getByCategory(user, campusFilter) {
  ensureAdmin(user);
  const where = {};
  if (campusFilter) {
    if (user.role === ROLES.CAMPUS_ADMIN && campusFilter !== user.campus_id) {
      throw new Error("Campus admin can only query their campus.");
    }
    where.campus_id = campusFilter;
  } else if (user.role === ROLES.CAMPUS_ADMIN) {
    where.campus_id = user.campus_id;
  }

  const tickets = await Ticket.findAll({
    where,
    include: [{ model: Category, attributes: ["id", "name"] }]
  });

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
  ensureAdmin(user);
  const tickets = await getScopedTickets(user);
  const users = await User.findAll({ attributes: ["id", "name"] });
  const departments = await Department.findAll({ attributes: ["id", "name", "faculty_id", "campus_id"] });
  const faculties = await Faculty.findAll({ attributes: ["id", "name"] });
  const campuses = await Campus.findAll({ attributes: ["id", "name"] });

  const userMap = new Map(users.map((entry) => [entry.id, entry.name]));
  const departmentMap = new Map(departments.map((entry) => [entry.id, entry]));
  const facultyMap = new Map(faculties.map((entry) => [entry.id, entry.name]));
  const campusMap = new Map(campuses.map((entry) => [entry.id, entry.name]));

  const officerStats = new Map();
  const departmentStats = new Map();
  const facultyStats = new Map();
  const campusStats = new Map();

  const upsert = (map, key, name, breached) => {
    if (!key) {
      return;
    }
    if (!map.has(key)) {
      map.set(key, { id: key, name, total: 0, breached: 0 });
    }
    const row = map.get(key);
    row.total += 1;
    if (breached) {
      row.breached += 1;
    }
  };

  for (const ticket of tickets) {
    const breached = Boolean(ticket.sla_breached);
    upsert(officerStats, ticket.assigned_to, userMap.get(ticket.assigned_to), breached);
    upsert(campusStats, ticket.campus_id, campusMap.get(ticket.campus_id), breached);

    const dept = departmentMap.get(ticket.submitter?.department_id);
    if (dept) {
      upsert(departmentStats, dept.id, dept.name, breached);
      upsert(facultyStats, dept.faculty_id, facultyMap.get(dept.faculty_id), breached);
    }
  }

  const format = (map) =>
    Array.from(map.values()).map((item) => ({
      id: item.id,
      name: item.name || "Unknown",
      total: item.total,
      breached: item.breached,
      breach_rate_pct: Number(((item.breached / item.total) * 100).toFixed(2))
    }));

  return {
    by_officer: format(officerStats),
    by_department: format(departmentStats),
    by_faculty: format(facultyStats),
    by_campus: format(campusStats)
  };
}

async function getCampusComparison(user) {
  if (user.role !== ROLES.UNIVERSITY_ADMIN) {
    throw new Error("Only university admin can access campus comparison.");
  }

  const campuses = await Campus.findAll({ attributes: ["id", "name"] });
  const output = [];
  for (const campus of campuses) {
    const tickets = await Ticket.findAll({ where: { campus_id: campus.id } });
    const total = tickets.length;
    const breached = tickets.filter((ticket) => ticket.sla_breached).length;
    const resolved = tickets.filter((ticket) => [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].includes(ticket.status));
    const durations = resolved.map(resolutionHours).filter((value) => value != null && value >= 0);

    output.push({
      campus_id: campus.id,
      campus_name: campus.name,
      total_tickets: total,
      resolved_tickets: resolved.length,
      sla_compliance_pct: total === 0 ? 100 : Number((((total - breached) / total) * 100).toFixed(2)),
      avg_resolution_hours: Number(average(durations).toFixed(2))
    });
  }

  return output.sort((a, b) => a.campus_name.localeCompare(b.campus_name));
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
  ensureAdmin(user);
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

  if (user.role === ROLES.CAMPUS_ADMIN) {
    if (filters.campus_id && filters.campus_id !== user.campus_id) {
      throw new Error("Campus admin can only export their campus.");
    }
    where.campus_id = user.campus_id;
  } else if (filters.campus_id) {
    where.campus_id = filters.campus_id;
  }

  const tickets = await Ticket.findAll({
    where,
    include: [
      { model: Category, attributes: ["name"] },
      { model: Campus, attributes: ["name"] },
      { model: User, as: "submitter", attributes: ["email"] },
      { model: User, as: "assignee", attributes: ["email"] }
    ],
    order: [["created_at", "DESC"]]
  });

  const header = [
    "ticket_id",
    "title",
    "status",
    "urgency",
    "category",
    "campus",
    "submitter_email",
    "assignee_email",
    "sla_breached",
    "created_at",
    "resolved_at",
    "closed_at"
  ];

  const rows = tickets.map((ticket) => [
    ticket.id,
    ticket.title,
    ticket.status,
    ticket.urgency,
    ticket.Category?.name || "",
    ticket.Campus?.name || "",
    ticket.submitter?.email || "",
    ticket.assignee?.email || "",
    ticket.sla_breached,
    ticket.created_at,
    ticket.resolved_at,
    ticket.closed_at
  ]);

  const csv = [header, ...rows].map((line) => line.map(escapeCsv).join(",")).join("\n");
  return csv;
}

async function getAuditLog(user, filters) {
  ensureAdmin(user);
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
  if (filters.from || filters.to) {
    where.created_at = {};
    if (filters.from) {
      where.created_at[Op.gte] = new Date(filters.from);
    }
    if (filters.to) {
      where.created_at[Op.lte] = new Date(filters.to);
    }
  }

  const include = [{ model: Ticket, attributes: ["id", "campus_id"], required: true }];
  if (user.role === ROLES.CAMPUS_ADMIN) {
    include[0].where = { campus_id: user.campus_id };
  }

  return TicketHistory.findAll({
    where,
    include,
    order: [["created_at", "DESC"]],
    limit: 1000
  });
}

module.exports = {
  getOverview,
  getOfficerAnalytics,
  getByCategory,
  getSlaCompliance,
  getCampusComparison,
  exportTicketsCsv,
  getAuditLog
};
