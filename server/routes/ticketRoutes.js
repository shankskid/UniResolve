const express = require("express");
const { body, param } = require("express-validator");
const { TICKET_STATUS_VALUES, URGENCY_VALUES } = require("@uniresolve/shared");
const ticketsController = require("../controllers/ticketsController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  [
    body("title").isString().trim().isLength({ min: 3, max: 300 }),
    body("description").isString().trim().isLength({ min: 10 }),
    body("category_id").isUUID(),
    body("urgency").isIn(URGENCY_VALUES),
    body("is_anonymous").optional().isBoolean()
  ],
  validate,
  ticketsController.createTicket
);

router.get("/", ticketsController.listTickets);

router.get("/:id", [param("id").isUUID()], validate, ticketsController.getTicket);

router.patch(
  "/:id/status",
  [param("id").isUUID(), body("status").isIn(TICKET_STATUS_VALUES)],
  validate,
  ticketsController.updateStatus
);

router.patch(
  "/:id/assign",
  [param("id").isUUID(), body("assigned_to").isUUID()],
  validate,
  ticketsController.assignTicket
);

router.post(
  "/:id/escalate",
  [param("id").isUUID(), body("reason").isString().trim().isLength({ min: 5, max: 2000 })],
  validate,
  ticketsController.escalateTicket
);

module.exports = router;
