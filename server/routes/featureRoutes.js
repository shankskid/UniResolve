const express = require("express");
const { body } = require("express-validator");
const ticketsController = require("../controllers/ticketsController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");

const router = express.Router();

router.use(authenticate);

router.post(
  "/surveys",
  [
    body("ticket_id").isUUID(),
    body("resolved_satisfactorily").isBoolean(),
    body("response_time_score").isInt({ min: 1, max: 5 }),
    body("comments").optional().isString().trim().isLength({ max: 5000 })
  ],
  validate,
  ticketsController.submitSurvey
);

router.get("/canned-responses", ticketsController.listCannedResponses);
router.post(
  "/canned-responses",
  [
    body("title").isString().trim().isLength({ min: 2, max: 200 }),
    body("body").isString().trim().isLength({ min: 2, max: 10000 }),
    body("category_id").optional({ nullable: true }).isUUID()
  ],
  validate,
  ticketsController.createCannedResponse
);

router.get("/knowledge-base", ticketsController.listKnowledgeBase);
router.post(
  "/knowledge-base",
  [
    body("title").isString().trim().isLength({ min: 2, max: 200 }),
    body("body").isString().trim().isLength({ min: 2, max: 20000 }),
    body("category_id").optional({ nullable: true }).isUUID(),
    body("source_ticket_id").optional({ nullable: true }).isUUID(),
    body("is_public").optional().isBoolean()
  ],
  validate,
  ticketsController.createKnowledgeBase
);

module.exports = router;
