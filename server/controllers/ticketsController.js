const TicketService = require("../services/TicketService");

function mapServiceError(error, res, next) {
  if (
    error.message === "Ticket not found or inaccessible." ||
    error.message === "Invalid submitter or category." ||
    error.message === "Assignee does not exist or is inactive." ||
    error.message === "Notification not found."
  ) {
    return res.status(404).json({ message: error.message });
  }
  if (
    error.message.includes("cannot") ||
    error.message.includes("must") ||
    error.message.includes("Invalid") ||
    error.message.includes("in use") ||
    error.message.includes("inactive") ||
    error.message.includes("urgent") ||
    error.message.includes("only") ||
    error.message.includes("already") ||
    error.message.includes("limited") ||
    error.message.includes("assigned") ||
    error.message.includes("enabled")
  ) {
    return res.status(400).json({ message: error.message });
  }
  return next(error);
}

async function createTicket(req, res, next) {
  try {
    const ticket = await TicketService.createTicket(req.user, req.body);
    return res.status(201).json({ ticket });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function createAnonymousTicket(req, res, next) {
  try {
    const ticket = await TicketService.createAnonymousTicket(req.body);
    return res.status(201).json({ ticket });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function listTickets(req, res, next) {
  try {
    const tickets = await TicketService.listTickets(req.user);
    return res.status(200).json({ tickets });
  } catch (error) {
    return next(error);
  }
}

async function getTicket(req, res, next) {
  try {
    const ticket = await TicketService.getTicket(req.user, req.params.id);
    return res.status(200).json({ ticket });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function updateStatus(req, res, next) {
  try {
    const ticket = await TicketService.updateStatus(req.user, req.params.id, req.body.status);
    return res.status(200).json({ ticket });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function assignTicket(req, res, next) {
  try {
    const ticket = await TicketService.assignTicket(req.user, req.params.id, req.body.assigned_to);
    return res.status(200).json({ ticket });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function escalateTicket(req, res, next) {
  try {
    const ticket = await TicketService.escalateTicket(req.user, req.params.id, req.body.reason);
    return res.status(200).json({ ticket });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function addComment(req, res, next) {
  try {
    const comment = await TicketService.addComment(req.user, req.params.id, req.body);
    return res.status(201).json({ comment });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function listComments(req, res, next) {
  try {
    const comments = await TicketService.getComments(req.user, req.params.id);
    return res.status(200).json({ comments });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function addAttachment(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required." });
    }
    const attachment = await TicketService.addAttachment(req.user, req.params.id, req.file);
    return res.status(201).json({ attachment });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function getHistory(req, res, next) {
  try {
    const history = await TicketService.getHistory(req.user, req.params.id);
    return res.status(200).json({ history });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function listOfficerAssignments(req, res, next) {
  try {
    const assignments = await TicketService.listOfficerAssignments(req.user);
    return res.status(200).json({ assignments });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function listOverseerAssignments(req, res, next) {
  try {
    const assignments = await TicketService.listOverseerAssignments(req.user);
    return res.status(200).json({ assignments });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function listManagedUsers(req, res, next) {
  try {
    const users = await TicketService.listManagedUsers(req.user);
    return res.status(200).json({ users });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function officerQueueStats(req, res, next) {
  try {
    const items = await TicketService.getOfficerQueueStats(req.user);
    return res.status(200).json({ items });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function createOfficerAssignment(req, res, next) {
  try {
    const assignment = await TicketService.createOfficerAssignment(req.user, req.body);
    return res.status(201).json({ assignment });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function createOverseerAssignment(req, res, next) {
  try {
    const assignment = await TicketService.createOverseerAssignment(req.user, req.body);
    return res.status(201).json({ assignment });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await TicketService.createCategory(req.user, req.body);
    return res.status(201).json({ category });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function deleteOfficerAssignment(req, res, next) {
  try {
    await TicketService.deleteOfficerAssignment(req.user, req.params.id);
    return res.status(200).json({ message: "Officer assignment deleted." });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function deleteOverseerAssignment(req, res, next) {
  try {
    await TicketService.deleteOverseerAssignment(req.user, req.params.id);
    return res.status(200).json({ message: "Overseer assignment deleted." });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function listAttachments(req, res, next) {
  try {
    const attachments = await TicketService.listAttachments(req.user, req.params.id);
    return res.status(200).json({ attachments });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function updateUrgency(req, res, next) {
  try {
    const ticket = await TicketService.updateUrgency(req.user, req.params.id, req.body.urgency);
    return res.status(200).json({ ticket });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
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
  listComments,
  addAttachment,
  listAttachments,
  getHistory,
  listOfficerAssignments,
  listOverseerAssignments,
  listManagedUsers,
  officerQueueStats,
  createOfficerAssignment,
  deleteOfficerAssignment,
  createOverseerAssignment,
  deleteOverseerAssignment,
  createCategory,
  updateUrgency
};
