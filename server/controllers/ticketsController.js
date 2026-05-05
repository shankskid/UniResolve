const TicketService = require("../services/TicketService");

function mapServiceError(error, res, next) {
  if (
    error.message === "Ticket not found or inaccessible." ||
    error.message === "Invalid submitter or category." ||
    error.message === "Assignee does not exist or is inactive."
  ) {
    return res.status(404).json({ message: error.message });
  }
  if (
    error.message.includes("cannot") ||
    error.message.includes("must") ||
    error.message.includes("Invalid") ||
    error.message.includes("in use") ||
    error.message.includes("inactive") ||
    error.message.includes("urgent")
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

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateStatus,
  assignTicket,
  escalateTicket
};
