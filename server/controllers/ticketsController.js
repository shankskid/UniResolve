const TicketService = require("../services/TicketService");

function mapServiceError(error, res, next) {
  if (
    error.message === "Ticket not found or inaccessible." ||
    error.message === "Invalid submitter or category." ||
    error.message === "Assignee does not exist or is inactive." ||
    error.message === "Checklist item not found." ||
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
    error.message.includes("limited")
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

async function updateChecklistItem(req, res, next) {
  try {
    const item = await TicketService.completeChecklistItem(req.user, req.params.id, req.params.itemId, req.body.is_completed);
    return res.status(200).json({ item });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function listChecklist(req, res, next) {
  try {
    const items = await TicketService.listChecklistItems(req.user, req.params.id);
    return res.status(200).json({ items });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function submitSurvey(req, res, next) {
  try {
    const survey = await TicketService.submitSurvey(req.user, req.body);
    return res.status(201).json({ survey });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function listCannedResponses(req, res, next) {
  try {
    const responses = await TicketService.listCannedResponses(req.user, req.query.category_id);
    return res.status(200).json({ responses });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function createCannedResponse(req, res, next) {
  try {
    const response = await TicketService.createCannedResponse(req.user, req.body);
    return res.status(201).json({ response });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function listKnowledgeBase(req, res, next) {
  try {
    const articles = await TicketService.listKnowledgeBase(req.user);
    return res.status(200).json({ articles });
  } catch (error) {
    return mapServiceError(error, res, next);
  }
}

async function createKnowledgeBase(req, res, next) {
  try {
    const article = await TicketService.createKnowledgeBase(req.user, req.body);
    return res.status(201).json({ article });
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
  getHistory,
  updateChecklistItem,
  listChecklist,
  submitSurvey,
  listCannedResponses,
  createCannedResponse,
  listKnowledgeBase,
  createKnowledgeBase
};
