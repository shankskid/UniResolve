const express = require("express");
const { body } = require("express-validator");
const { TICKET_SCOPE_VALUES, URGENCY_VALUES } = require("@uniresolve/shared");
const ticketsController = require("../controllers/ticketsController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");

const router = express.Router();

router.use(authenticate);

router.get("/admin/users", ticketsController.listManagedUsers);
router.get("/admin/officer-assignments", ticketsController.listOfficerAssignments);
router.get("/admin/overseer-assignments", ticketsController.listOverseerAssignments);
router.post(
  "/admin/officer-assignments",
  [
    body("officer_id").isUUID(),
    body("scope_type").isIn(TICKET_SCOPE_VALUES),
    body("scope_id").isUUID()
  ],
  validate,
  ticketsController.createOfficerAssignment
);
router.post(
  "/admin/overseer-assignments",
  [body("overseer_id").isUUID(), body("officer_id").isUUID()],
  validate,
  ticketsController.createOverseerAssignment
);
router.post(
  "/admin/categories",
  [
    body("name").isString().trim().isLength({ min: 2, max: 100 }),
    body("scope_type").isIn(TICKET_SCOPE_VALUES),
    body("min_urgency").optional({ nullable: true }).isIn(URGENCY_VALUES)
  ],
  validate,
  ticketsController.createCategory
);
router.get("/officer-queue-stats", ticketsController.officerQueueStats);
router.delete("/admin/officer-assignments/:id", ticketsController.deleteOfficerAssignment);
router.delete("/admin/overseer-assignments/:id", ticketsController.deleteOverseerAssignment);
router.get("/tickets/:id/attachments", ticketsController.listAttachments);

module.exports = router;
