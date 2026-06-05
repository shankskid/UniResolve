const { Op } = require("sequelize");
const {
  canBeAssignedRole,
  ROLES,
  TICKET_SCOPE,
  TICKET_SCOPE_VALUES,
  TICKET_STATUS,
  URGENCY
} = require("@uniresolve/shared");
const {
  sequelize,
  Category,
  OfficerAssignment,
  OverseerAssignment,
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketHistory,
  User
} = require("../models");
const TicketRouter = require("./TicketRouter");
const NotificationService = require("./NotificationService");

const TICKET_CREATOR_ROLES = [ROLES.STUDENT, ROLES.STAFF];
const OFFICER_ROLES = [ROLES.OFFICER, ROLES.OVERSEER, ROLES.SUPERADMIN];
const ACTIVE_STATUSES = [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS];

// ─────────────────────────────────────────────────────────────────────────────
// URGENCY KEYWORD CLASSIFIER
// Tier weights: urgent=3, high=2, medium=1
// Thresholds: 1+ urgent hit → urgent | 2+ high hits → urgent | 1 high hit → high
//             1+ medium hit → medium | 0 signals → low
// Category min_urgency acts as a floor.
// ─────────────────────────────────────────────────────────────────────────────
const URGENCY_KEYWORDS = Object.freeze({
  urgent: [
    // ── Fire & Smoke / Explosion ──
    "fire", "fires", "on fire", "burning", "flames", "flame", "ablaze", "smoldering",
    "smoke", "smoky", "smoke alarm", "fire alarm", "fire hazard", "blaze",
    "flammable", "combustion", "ignited", "catching fire", "heavy smoke", 
    "thick smoke", "explosion", "blast", "detonation", "fire outbreak",
    "building on fire", "room on fire", "laboratory fire", "electrical fire", "transformer explosion",

    // ── Medical & Physical Injury ──
    "injury", "injured", "hurt", "wound", "wounded", "bleeding", "blood",
    "unconscious", "unresponsive", "collapse", "collapsed", "collapsing",
    "seizure", "convulsing", "choking", "not breathing", "stopped breathing",
    "ambulance", "medical emergency", "first aid", "ems",
    "chest pain", "heart attack", "stroke", "fainted", "fainting",
    "fracture", "fractured", "broken bone", "head injury", "concussion",
    "allergic reaction", "anaphylaxis", "overdose", "poisoning",
    "hospitalized", "hospital", "critically ill", "life threatening",
    "life-threatening", "near death", "serious injury", "severe injury",
    "critical injury", "severe bleeding", "bleeding heavily", "cardiac arrest", "fatality", "death", "dead body",

    // ── Self-Harm & Mental Health Crisis ──
    "suicide attempt", "attempting suicide", "suicidal", "self harm", "self-harm",
    "overdose attempt", "jumping from building", "mental crisis", "psychiatric emergency",

    // ── Gas & Chemical Hazards ──
    "gas leak", "gas smell", "gas odor", "smell of gas", "natural gas",
    "fumes", "toxic fumes", "chemical spill", "chemical leak",
    "carbon monoxide", "co poisoning", "hazardous material", "hazmat",
    "pesticide leak", "acid spill", "radioactive", "biohazard",
    "ammonia", "chlorine", "toxic substance", "noxious",
    "toxic gas", "hazardous chemical", "contamination",

    // ── Electrical Danger ──
    "electrocution", "electric shock", "electrical shock", "shocked by electricity",
    "exposed wire", "exposed wires", "live wire", "live wires",
    "sparking", "sparks", "sparking wire", "arcing", "electrical arc",
    "short circuit", "electrical fire", "power surge overheating",
    "melting socket", "burning socket", "burning plug", "melting wire",
    "high voltage", "power surge", "electrical hazard", "electrical emergency",

    // ── Severe Flooding & Water Emergency ──
    "flooding", "flooded", "flood", "burst pipe", "pipe burst",
    "water gushing", "gushing water", "water pouring", "sewage overflow",
    "sewage spill", "sewage burst", "wastewater overflow",
    "drain overflowing", "toilet overflowing", "water rising",
    "completely submerged", "standing water", "waterlogged",
    "major flooding", "campus flooding", "dam failure",

    // ── Structural Collapse & Danger ──
    "collapse", "collapsed", "collapsing", "ceiling fell", "ceiling falling",
    "roof caving", "roof collapsed", "wall caving", "wall crack",
    "structural damage", "structural failure", "floor cracking",
    "building unsafe", "imminent collapse", "debris falling", "falling debris",
    "earthquake damage", "subsidence",
    "building collapse", "bridge collapse",

    // ── Violence, Threats & Security Emergency ──
    "assault", "assaulted", "attacked", "physical attack",
    "robbery", "robbed", "break-in", "breaking in", "intruder", "intruders",
    "weapon", "knife", "gun", "armed", "threat", "threatened",
    "violence", "violent", "fight", "brawl", "rape", "sexual assault",
    "harassment", "stalking", "intimidation", "abuse", "abusive",
    "hostage", "kidnapping", "bomb", "explosive",
    "danger", "dangerous", "life at risk", "unsafe",
    "critical", "critical situation", "extreme emergency",
    "active shooter", "shooting", "firearm", "armed attack", "stabbing", "knife attack",
    "terrorist", "bomb threat", "murder", "attempted murder", "armed robbery",

    // ── Urgent Intent Signals ──
    "emergency", "urgent", "urgently", "immediately", "right now",
    "cannot wait", "must act", "asap", "help", "sos",
    "desperate", "dire", "catastrophic",

    // ── Critical Combinations ──
    "fire + hostel", "fire + residence", "gas leak + residence",
    "weapon + student", "stabbing + student", "collapsed + unconscious",
    "electrocution + injury", "flooding + electricity", "bomb + campus",
    "active shooter + campus"
  ],

  high: [
    // ── Complete Infrastructure Failures ──
    "broken", "not working", "stopped working", "completely broken",
    "failed", "failure", "fault", "malfunction", "malfunctioning",
    "out of order", "not functioning", "inoperable", "non-functional",
    "defective", "damaged beyond use", "unusable", "non-operational",
    "ceased to work", "no longer works", "broken down",
    "campus wide outage", "major leak",

    // ── Multiple People / Widespread Impact ──
    "multiple students", "entire floor", "whole building", "all rooms",
    "many people", "several people", "many students", "all residents",
    "widespread", "everyone affected", "floor wide", "floor-wide",
    "building wide", "building-wide", "entire block", "whole hostel",
    "entire hall", "all of us", "we all", "the whole", "everyone in",
    "mass problem", "collective issue",

    // ── Electrical Problems ──
    "no power", "no electricity", "power cut", "power outage", "power failure",
    "blackout", "power down", "lights out", "electricity out",
    "flickering lights", "flickering electricity", "circuit breaker",
    "power tripping", "power keeps going", "electricity keeps cutting",
    "generator failed", "generator down",

    // ── Water & Plumbing ──
    "no water", "no running water", "water cut", "water supply cut",
    "water supply off", "water failure", "no tap water", "no water supply",
    "leak", "leaking", "leaking pipe", "water leaking", "leaking ceiling",
    "leaking roof", "water damage", "water coming in", "seepage",
    "no hot water", "hot water not working", "water pressure loss",
    "water pressure very low",

    // ── Internet & Connectivity ──
    "no internet", "no wifi", "no network", "network down", "internet down",
    "wifi down", "cannot connect", "connection lost", "internet not working",
    "no connection", "connectivity failure", "ethernet not working",
    "lan down", "campus network down", "total internet outage",

    // ── Security Failures & Misconduct ──
    "door not locking", "lock broken", "cannot lock", "door won't close",
    "lock not working", "broken lock", "security breach", "door forced open",
    "window broken", "window smashed", "gate broken",
    "access control not working", "keypad not working", "key fob not working",
    "locked out", "cannot enter", "access denied",
    "unauthorized access", "unauthorized person",
    "death threat", "harassment", "stalking", "bullying", "extortion", "blackmail", "vandalism",
    "sexual harassment", "inappropriate touching", "sexual coercion", "sexual misconduct", "predatory behavior",

    // ── Health Hazards & Residence Emergencies ──
    "mold", "mould", "mildew", "black mold", "black mould",
    "pests", "pest infestation", "rats", "rat", "mice", "mouse",
    "cockroach", "cockroaches", "roach", "infestation",
    "bed bugs", "bedbugs", "fleas", "termites",
    "rodent", "rodents", "vermin", "snake",
    "sewage smell", "sewage stench", "sewage gas",
    "foul smell", "unbearable smell", "extremely smelly",
    "contaminated water", "brown water", "dirty water from tap",
    "unsafe room", "major mold", "flooded room", "severe water leak",

    // ── Heating / Cooling Systems ──
    "no heating", "heating failed", "heating not working", "heating broken",
    "no air conditioning", "ac failed", "hvac failed", "ventilation failed",
    "extremely cold", "extremely hot", "dangerously hot", "dangerously cold",
    "pipes frozen",

    // ── Fire Safety Equipment ──
    "fire extinguisher missing", "fire extinguisher empty",
    "smoke detector not working", "fire suppression", "sprinkler broken",
    "emergency exit blocked", "fire exit locked", "fire escape blocked",

    // ── Sanitation ──
    "toilet blocked", "toilet not flushing", "toilet broken",
    "sewage backup", "drain blocked", "drain clogged", "blocked drain",
    "bathroom flooded", "bathroom not usable", "toilet out of service",

    // ── Corruption & Fraud ──
    "bribery", "bribe", "corruption", "fraud", "embezzlement", "kickback",
    "forgery", "fake transcript", "fake certificate", "grade manipulation", "academic fraud",

    // ── IT Security ──
    "hacked", "account hacked", "data breach", "database breach",
    "credential theft", "ransomware", "malware", "virus outbreak", "compromised account",

    // ── Academic Emergencies ──
    "graduation blocked", "missing grades", "lost grades", "results missing",
    "exam denied", "registration blocked", "transcript unavailable",
    "course registration failure", "clearance blocked",

    // ── High Combinations ──
    "exam + tomorrow", "graduation + blocked", "hall + blackout",
    "hostel + no water", "harassment + lecturer", "threat + violence", "results + missing"
  ],

  medium: [
    // ── Partial Functionality ──
    "partially working", "partly working", "intermittent", "on and off",
    "sometimes works", "occasionally works", "works sometimes",
    "slow", "slower than usual", "lagging", "delayed", "sluggish",
    "degraded", "poor performance", "reduced performance",
    "unstable", "unreliable", "inconsistent",

    // ── Minor Physical Damage ──
    "damaged", "cracked", "crack", "chipped", "scratched", "scratch",
    "dented", "bent", "torn", "worn", "worn out", "frayed",
    "broken handle", "handle broken", "handle loose", "loose handle",
    "hinge broken", "hinge loose", "broken hinge",
    "peeling", "peeling off", "surface damage",

    // ── Comfort & Environment ──
    "noisy", "noise", "loud", "too loud", "disturbing noise",
    "banging", "rattling", "squeaking", "creaking",
    "cold", "too cold", "cold room", "cold water",
    "hot", "too hot", "hot room", "overheating",
    "temperature issue", "temperature problem",
    "heating not adequate", "insufficient heating",
    "air conditioning weak", "ac weak", "poor ventilation",
    "stuffy", "poor air quality", "musty", "damp smell", "odor", "smell",

    // ── Lighting ──
    "light not working", "light out", "bulb blown", "blown bulb",
    "no lighting", "dark corridor", "dark stairwell", "dark hallway",
    "dim", "dim light", "flickering light", "light flickering",
    "lamp broken", "broken light", "lights off",

    // ── Minor Leaks & Water ──
    "dripping", "drip", "slow drip", "minor leak", "small leak",
    "occasional drip", "slight leak", "tap dripping", "faucet dripping",
    "slow water pressure", "low water pressure",

    // ── Maintenance & Wear ──
    "needs repair", "needs maintenance", "requires maintenance",
    "requires attention", "needs fixing", "needs to be fixed",
    "rusted", "rust", "corroded", "corrosion",
    "deteriorating", "degrading", "aging", "old and broken",
    "worn parts", "worn components",

    // ── Access Difficulties ──
    "stuck", "jammed", "hard to open", "difficult to open",
    "stiff", "door stiff", "door hard to open", "hard to close",
    "door won't open properly", "window won't open",
    "cannot open fully", "partially stuck",

    // ── Connectivity Issues ──
    "slow internet", "slow wifi", "weak signal", "poor signal",
    "poor wifi", "wifi weak", "internet slow", "buffering",
    "connection dropping", "keeps disconnecting",

    // ── Facilities & Equipment ──
    "broken chair", "broken table", "broken desk", "broken bed",
    "mattress damaged", "mattress torn", "broken shelf",
    "shower not working", "shower broken", "shower weak pressure",
    "shower cold", "bath not draining", "sink not draining",
    "washing machine broken", "dryer broken", "microwave broken",
    "fridge not cooling", "fridge broken",
    "printer not working", "projector not working",
    "whiteboard damaged", "classroom equipment broken",

    // ── Waste & Cleanliness ──
    "bins full", "garbage overflowing", "waste not collected",
    "dirty", "unclean", "hygiene issue", "cleaning needed",
    "rubbish", "garbage", "litter",

    // ── Academic Issues ──
    "wrong marks", "incorrect marks", "missing attendance", "course conflict",
    "exam clash", "timetable issue", "missing coursework",
    "supervisor unavailable", "project issue", "registration issue", "appeal pending",

    // ── Administrative Issues ──
    "clearance issue", "fee issue", "delayed approval", "application delay",
    "document delay", "lost document", "identity issue", "verification issue",

    // ── Technical Problems ──
    "system error", "website error", "portal issue", "login issue",
    "password issue", "slow network", "printer failure", "computer malfunction",
    "software issue", "email issue",

    // ── Residence Maintenance ──
    "broken window", "damaged furniture", "maintenance issue",
    "water pressure issue", "room allocation issue", "internet issue",
    "blocked drain", "faulty shower",

    // ── Staff Conduct ──
    "rude behavior", "poor service", "unprofessional conduct",
    "lack of response", "neglect", "ignored request", "delayed response",

    // ── Medium Combinations ──
    "portal + inaccessible", "marks + incorrect", "assignment + missing",
    "room + damaged", "staff + rude",

    // ── University-Specific (Medium Priority items) ──
    "missing marks", "missing grades", "hostel allocation", "room allocation",
    "water shortage", "power issue", "security concern", "hall maintenance",
    "roommate conflict", "course registration", "deferment", "transfer request",
    "credit transfer", "transcript request", "academic appeal", "graduation clearance",
    "counselling", "mental health", "financial aid", "bursary", "scholarship",
    "accommodation issue"
  ],

  low: [
    // ── Minor Facility Issues ──
    "broken chair", "broken desk", "faded paint", "minor leak",
    "dirty corridor", "unclean classroom", "poor lighting",
    "noise complaint", "damaged notice board",

    // ── Service Requests ──
    "request", "suggestion", "feedback", "recommendation", "inquiry",
    "clarification", "question", "proposal",

    // ── Minor Maintenance ──
    "replace bulb", "repair chair", "clean room", "trim grass",
    "paint wall", "fix notice board", "adjust furniture", "replace curtain",

    // ── Informational ──
    "feature request", "enhancement", "improvement", "usability suggestion",
    "new functionality", "general feedback",
    
    // ── University-Specific (Low/Informational) ──
    "exam card", "exam slip", "exam venue", "exam timetable",
    "supplementary exam", "special exam", "graduation list"
  ]
});

const URGENCY_ORDER = [
  URGENCY.LOW,
  URGENCY.MEDIUM,
  URGENCY.HIGH,
  URGENCY.URGENT
];

function urgencyRank(level) {
  return URGENCY_ORDER.indexOf(level);
}

/**
 * Classify urgency from ticket text using keyword scoring.
 * @param {string} title
 * @param {string} description
 * @param {string|null} categoryMinUrgency  min_urgency from the category row
 * @returns {string} one of URGENCY values
 */
function classifyUrgency(title, description, categoryMinUrgency) {
  const text = `${title} ${description}`.toLowerCase();

  let urgentHits = 0;
  let highHits = 0;
  let mediumHits = 0;
  let lowHits = 0;

  function countHits(phrases) {
    let hits = 0;
    for (const phrase of phrases) {
      if (phrase.includes("+")) {
        // Handle combinations like "fire + hostel"
        const parts = phrase.split("+").map((p) => p.trim());
        if (parts.every((p) => text.includes(p))) {
          hits++;
        }
      } else if (text.includes(phrase)) {
        hits++;
      }
    }
    return hits;
  }

  urgentHits = countHits(URGENCY_KEYWORDS.urgent);
  highHits = countHits(URGENCY_KEYWORDS.high);
  mediumHits = countHits(URGENCY_KEYWORDS.medium);
  lowHits = countHits(URGENCY_KEYWORDS.low || []);

  let result;
  if (urgentHits >= 1) {
    result = URGENCY.URGENT;
  } else if (highHits >= 2) {
    result = URGENCY.URGENT;
  } else if (highHits >= 1) {
    result = URGENCY.HIGH;
  } else if (mediumHits >= 1) {
    result = URGENCY.MEDIUM;
  } else {
    result = URGENCY.LOW;
  }

  // Apply category floor — the category's min_urgency can only bump UP
  if (categoryMinUrgency && urgencyRank(categoryMinUrgency) > urgencyRank(result)) {
    result = categoryMinUrgency;
  }

  return result;
}

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

async function getSuperadminIds(transaction) {
  const users = await User.findAll({
    where: { role: ROLES.SUPERADMIN, is_active: true },
    attributes: ["id"],
    transaction
  });
  return users.map((user) => user.id);
}

async function getSupervisedOfficerIds(overseerId) {
  const rows = await OverseerAssignment.findAll({
    where: { overseer_id: overseerId },
    attributes: ["officer_id"]
  });
  return rows.map((row) => row.officer_id);
}

async function getAccessibleTicketFilter(user) {
  if ([ROLES.STUDENT, ROLES.STAFF].includes(user.role)) {
    return { submitter_id: user.id };
  }

  if (user.role === ROLES.OFFICER) {
    return { assigned_to: user.id };
  }

  if (user.role === ROLES.OVERSEER) {
    const officerIds = await getSupervisedOfficerIds(user.id);
    if (!officerIds.length) {
      return { assigned_to: { [Op.in]: [] } };
    }
    return { assigned_to: { [Op.in]: officerIds } };
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
        attributes: ["id", "name", "email", "role", "department_id", "hall_id"]
      },
      { model: User, as: "assignee", attributes: ["id", "name", "email", "role"] }
    ],
    order: [["created_at", "DESC"]]
  });
  if (!ticket) {
    throw new Error("Ticket not found or inaccessible.");
  }
  return ticket;
}

function normalizeScope(payload, category) {
  const requested = payload.scope_type || payload.issue_area || category?.jurisdiction_type;
  if (!TICKET_SCOPE_VALUES.includes(requested)) {
    throw new Error("Invalid ticket issue area.");
  }
  if (category && category.jurisdiction_type !== requested) {
    throw new Error("Category does not match the selected issue area.");
  }
  return requested;
}

// urgency is now auto-classified; this stub is kept for reference only
function normalizeUrgency() {
  return URGENCY.MEDIUM;
}

async function createTicket(user, payload) {
  if (!TICKET_CREATOR_ROLES.includes(user.role)) {
    throw new Error("Only students or staff can create tickets.");
  }

  const submitter = await User.findByPk(user.id);
  const category = await Category.findByPk(payload.category_id);
  if (!submitter || !category) {
    throw new Error("Invalid submitter or category.");
  }

  const scopeType = normalizeScope(payload, category);
  const selectedUrgency = classifyUrgency(payload.title, payload.description, category.min_urgency);
  const sla_deadline = calculateSlaDeadline(selectedUrgency);

  return sequelize.transaction(async (transaction) => {
    const route = await TicketRouter.assign({ scopeType, submitter, transaction });
    const ticket = await Ticket.create(
      {
        title: payload.title,
        description: payload.description,
        status: TICKET_STATUS.OPEN,
        urgency: selectedUrgency,
        category_id: category.id,
        submitter_id: submitter.id,
        assigned_to: route.assignee.id,
        jurisdiction_type: route.scope_type,
        scope_type: route.scope_type,
        scope_id: route.scope_id,
        is_anonymous: false,
        sla_deadline
      },
      { transaction }
    );

    await writeHistory(ticket.id, "SYSTEM", "created", null, ticket.id, transaction);
    await writeHistory(ticket.id, "SYSTEM", "assigned_to", null, route.assignee.id, transaction);
    await writeHistory(ticket.id, "SYSTEM", "urgency", null, selectedUrgency, transaction);

    await NotificationService.notifyMany(
      [route.assignee.id],
      {
        ticket_id: ticket.id,
        type: "ticket_assigned",
        message: `You have been assigned ticket ${ticket.id}.`
      },
      transaction
    );

    return ticket;
  });
}

async function createAnonymousTicket() {
  throw new Error("Anonymous submission is not enabled in the simplified workflow.");
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
        attributes: ["id", "name", "email", "role", "department_id", "hall_id"]
      },
      { model: User, as: "assignee", attributes: ["id", "name", "email", "role"] }
    ],
    order: [
      ["urgency", "DESC"],
      ["created_at", "DESC"]
    ]
  });

  return tickets.map((ticket) => ticket.toJSON());
}

async function getTicket(user, ticketId) {
  const ticket = await getTicketScopedOrThrow(ticketId, user);
  return ticket.toJSON();
}

function canUpdateStatus(user, ticket, nextStatus) {
  if (user.role === ROLES.SUPERADMIN) {
    return true;
  }

  if (user.role === ROLES.OFFICER && ticket.assigned_to === user.id) {
    return [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.RESOLVED].includes(nextStatus);
  }

  if ([ROLES.STUDENT, ROLES.STAFF].includes(user.role) && ticket.submitter_id === user.id) {
    return ticket.status === TICKET_STATUS.RESOLVED && nextStatus === TICKET_STATUS.CLOSED;
  }

  return false;
}

async function updateStatus(user, ticketId, status) {
  const ticket = await getTicketScopedOrThrow(ticketId, user);
  if (!canUpdateStatus(user, ticket, status)) {
    throw new Error("Role cannot update ticket status.");
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
      [ticket.submitter_id, ticket.assigned_to],
      {
        ticket_id: ticket.id,
        type: "ticket_status_updated",
        message: `Ticket ${ticket.id} status changed from ${previous} to ${status}.`
      },
      transaction
    );

    return getTicket(user, ticket.id);
  });
}

async function canAssignToOfficer(user, ticket, officerId) {
  const assignee = await User.findByPk(officerId);
  if (!assignee || !assignee.is_active || !canBeAssignedRole(assignee.role) || assignee.role !== ROLES.OFFICER) {
    throw new Error("Assignee must be an active officer.");
  }

  if (user.role === ROLES.SUPERADMIN) {
    return assignee;
  }

  if (user.role === ROLES.OVERSEER) {
    const officerIds = await getSupervisedOfficerIds(user.id);
    if (officerIds.includes(ticket.assigned_to) && officerIds.includes(officerId)) {
      return assignee;
    }
  }

  throw new Error("Role cannot assign tickets.");
}

async function assignTicket(user, ticketId, assignedTo) {
  if (![ROLES.OVERSEER, ROLES.SUPERADMIN].includes(user.role)) {
    throw new Error("Role cannot assign tickets.");
  }

  const ticket = await getTicketScopedOrThrow(ticketId, user);
  const assignee = await canAssignToOfficer(user, ticket, assignedTo);

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

async function escalateTicket(user, ticketId, reason) {
  if (![ROLES.OFFICER, ROLES.OVERSEER].includes(user.role)) {
    throw new Error("Role cannot escalate tickets.");
  }

  const ticket = await getTicketScopedOrThrow(ticketId, user);
  const superadminIds = await getSuperadminIds();

  await NotificationService.notifyMany(superadminIds, {
    ticket_id: ticket.id,
    type: "ticket_escalated",
    message: `Ticket ${ticket.id} was escalated: ${reason}`
  });

  await writeHistory(ticket.id, user.id, "escalation", null, reason);
  return getTicket(user, ticket.id);
}

async function addComment(user, ticketId, payload) {
  const ticket = await getTicketScopedOrThrow(ticketId, user);
  const isInternal = Boolean(payload.is_internal);

  if (isInternal && !OFFICER_ROLES.includes(user.role)) {
    throw new Error("Only officers, overseers, and superadmin can create internal comments.");
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

    // Internal notes must NOT notify the submitter — they are officer-only.
    // Public comments notify both the submitter and the assigned officer.
    const recipients = isInternal
      ? [ticket.assigned_to].filter(Boolean)
      : [ticket.submitter_id, ticket.assigned_to].filter(Boolean);

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
  if (!OFFICER_ROLES.includes(user.role)) {
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
  const path = require("path");
  return TicketAttachment.create({
    ticket_id: ticketId,
    uploader_id: user.id,
    file_url: path.basename(file.path),   // disk filename only, e.g. "1717000000000-photo.jpg"
    file_name: file.originalname,          // human-readable original name
    file_size: file.size
  });
}

async function getHistory(user, ticketId) {
  if (!OFFICER_ROLES.includes(user.role)) {
    throw new Error("Role cannot view ticket history.");
  }
  await getTicketScopedOrThrow(ticketId, user);
  return TicketHistory.findAll({
    where: { ticket_id: ticketId },
    order: [["created_at", "ASC"]]
  });
}

async function listOfficerAssignments() {
  return OfficerAssignment.findAll({
    include: [{ model: User, as: "officer", attributes: ["id", "name", "email", "role"] }],
    order: [["scope_type", "ASC"]]
  });
}

async function listOverseerAssignments() {
  return OverseerAssignment.findAll({
    include: [
      { model: User, as: "overseer", attributes: ["id", "name", "email", "role"] },
      { model: User, as: "officer", attributes: ["id", "name", "email", "role"] }
    ],
    order: [["created_at", "ASC"]]
  });
}

async function listManagedUsers(user) {
  if (user.role !== ROLES.SUPERADMIN) {
    throw new Error("Only superadmin can manage users.");
  }
  return User.findAll({
    attributes: ["id", "name", "email", "role", "user_type", "department_id", "hall_id", "is_active"],
    order: [["role", "ASC"], ["name", "ASC"]]
  });
}

async function createOfficerAssignment(user, payload) {
  if (user.role !== ROLES.SUPERADMIN) {
    throw new Error("Only superadmin can manage assignments.");
  }
  if (!TICKET_SCOPE_VALUES.includes(payload.scope_type)) {
    throw new Error("Invalid assignment scope.");
  }

  const officer = await User.findByPk(payload.officer_id);
  if (!officer || !officer.is_active || officer.role !== ROLES.OFFICER) {
    throw new Error("Assignee must be an active officer.");
  }

  const existing = await OfficerAssignment.findOne({
    where: { scope_type: payload.scope_type, scope_id: payload.scope_id }
  });
  if (existing) {
    existing.officer_id = officer.id;
    await existing.save();
    return existing;
  }

  return OfficerAssignment.create({
    officer_id: officer.id,
    scope_type: payload.scope_type,
    scope_id: payload.scope_id
  });
}

async function createOverseerAssignment(user, payload) {
  if (user.role !== ROLES.SUPERADMIN) {
    throw new Error("Only superadmin can manage assignments.");
  }

  const overseer = await User.findByPk(payload.overseer_id);
  if (!overseer || !overseer.is_active || overseer.role !== ROLES.OVERSEER) {
    throw new Error("Overseer must be an active overseer.");
  }

  const officer = await User.findByPk(payload.officer_id);
  if (!officer || !officer.is_active || officer.role !== ROLES.OFFICER) {
    throw new Error("Officer must be an active officer.");
  }

  const existing = await OverseerAssignment.findOne({
    where: { overseer_id: overseer.id, officer_id: officer.id }
  });
  if (existing) {
    throw new Error("Overseer is already assigned to that officer.");
  }

  return OverseerAssignment.create({
    overseer_id: overseer.id,
    officer_id: officer.id
  });
}

async function createCategory(user, payload) {
  if (user.role !== ROLES.SUPERADMIN) {
    throw new Error("Only superadmin can manage categories.");
  }
  if (!TICKET_SCOPE_VALUES.includes(payload.scope_type)) {
    throw new Error("Invalid category scope.");
  }
  if (payload.min_urgency && !Object.values(URGENCY).includes(payload.min_urgency)) {
    throw new Error("Invalid minimum urgency.");
  }

  return Category.create({
    name: payload.name,
    jurisdiction_type: payload.scope_type,
    min_urgency: payload.min_urgency || null
  });
}

async function getOfficerQueueStats(user) {
  if (![ROLES.OVERSEER, ROLES.SUPERADMIN].includes(user.role)) {
    throw new Error("Role cannot access officer queue stats.");
  }

  const officerWhere = user.role === ROLES.SUPERADMIN
    ? { role: ROLES.OFFICER }
    : { id: { [Op.in]: await getSupervisedOfficerIds(user.id) }, role: ROLES.OFFICER };

  const officers = await User.findAll({
    where: officerWhere,
    attributes: ["id", "name", "email", "role", "is_active", "is_timed_out", "status_reason"],
    order: [["name", "ASC"]]
  });

  const output = [];
  for (const officer of officers) {
    const tickets = await Ticket.findAll({ where: { assigned_to: officer.id } });
    output.push({
      officer: officer.toJSON(),
      total: tickets.length,
      active: tickets.filter((ticket) => ACTIVE_STATUSES.includes(ticket.status)).length,
      resolved: tickets.filter((ticket) => [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].includes(ticket.status)).length,
      urgent: tickets.filter((ticket) => ticket.urgency === URGENCY.URGENT && ACTIVE_STATUSES.includes(ticket.status)).length
    });
  }
  return output;
}

async function updateUrgency(user, ticketId, newUrgency) {
  if (!OFFICER_ROLES.includes(user.role)) {
    throw new Error("Only officers, overseers, and superadmin can adjust urgency.");
  }
  if (!Object.values(URGENCY).includes(newUrgency)) {
    throw new Error("Invalid urgency level.");
  }

  const ticket = await getTicketScopedOrThrow(ticketId, user);
  const previous = ticket.urgency;

  if (previous === newUrgency) {
    return ticket.toJSON();
  }

  return sequelize.transaction(async (transaction) => {
    ticket.urgency = newUrgency;
    // Recalculate SLA deadline from the new urgency level
    ticket.sla_deadline = calculateSlaDeadline(newUrgency);
    await ticket.save({ transaction });
    await writeHistory(ticket.id, user.id, "urgency", previous, newUrgency, transaction);
    return getTicket(user, ticket.id);
  });
}

async function deleteOfficerAssignment(user, assignmentId) {
  if (user.role !== ROLES.SUPERADMIN) {
    throw new Error("Only superadmin can delete assignments.");
  }
  const row = await OfficerAssignment.findByPk(assignmentId);
  if (!row) {
    throw new Error("Ticket not found or inaccessible.");
  }
  await row.destroy();
}

async function deleteOverseerAssignment(user, assignmentId) {
  if (user.role !== ROLES.SUPERADMIN) {
    throw new Error("Only superadmin can delete assignments.");
  }
  const row = await OverseerAssignment.findByPk(assignmentId);
  if (!row) {
    throw new Error("Ticket not found or inaccessible.");
  }
  await row.destroy();
}

async function listAttachments(user, ticketId) {
  await getTicketScopedOrThrow(ticketId, user);
  return TicketAttachment.findAll({
    where: { ticket_id: ticketId },
    order: [["created_at", "ASC"]]
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
  listAttachments,
  getHistory,
  listOfficerAssignments,
  listOverseerAssignments,
  listManagedUsers,
  createOfficerAssignment,
  deleteOfficerAssignment,
  createOverseerAssignment,
  deleteOverseerAssignment,
  createCategory,
  getOfficerQueueStats,
  updateUrgency
};
