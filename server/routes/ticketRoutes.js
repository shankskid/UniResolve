const express = require("express");
const { body, param } = require("express-validator");
const { TICKET_SCOPE_VALUES, TICKET_STATUS_VALUES, URGENCY_VALUES } = require("@uniresolve/shared");
const ticketsController = require("../controllers/ticketsController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const upload = require("../middleware/upload");

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  [
    body("title").isString().trim().isLength({ min: 3, max: 300 }),
    body("description").isString().trim().isLength({ min: 10 }),
    body("category_id").isUUID(),
    body("scope_type").isIn(TICKET_SCOPE_VALUES)
    // urgency is intentionally omitted — it is auto-classified server-side
  ],
  validate,
  ticketsController.createTicket
);

router.get("/", ticketsController.listTickets);

router.get("/:id", [param("id").isUUID()], validate, ticketsController.getTicket);
router.get("/:id/comments", [param("id").isUUID()], validate, ticketsController.listComments);
router.get("/:id/history", [param("id").isUUID()], validate, ticketsController.getHistory);

router.post(
  "/:id/comments",
  [
    param("id").isUUID(),
    body("body").isString().trim().isLength({ min: 1, max: 5000 }),
    body("is_internal").optional().isBoolean()
  ],
  validate,
  ticketsController.addComment
);

router.post(
  "/:id/attachments",
  [param("id").isUUID()],
  validate,
  upload.imageOnly.single("file"),
  ticketsController.addAttachment
);

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

router.patch(
  "/:id/escalate",
  [param("id").isUUID(), body("reason").isString().trim().isLength({ min: 5, max: 2000 })],
  validate,
  ticketsController.escalateTicket
);

router.patch(
  "/:id/urgency",
  [param("id").isUUID(), body("urgency").isIn(URGENCY_VALUES)],
  validate,
  ticketsController.updateUrgency
);

module.exports = router;
