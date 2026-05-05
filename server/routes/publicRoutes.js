const express = require("express");
const { body } = require("express-validator");
const ticketsController = require("../controllers/ticketsController");
const validate = require("../middleware/validate");

const router = express.Router();

router.post(
  "/submit-anonymous",
  [
    body("title").isString().trim().isLength({ min: 3, max: 300 }),
    body("description").isString().trim().isLength({ min: 10 }),
    body("category_id").isUUID(),
    body("department_id").isUUID(),
    body("hall_id").optional({ nullable: true }).isUUID(),
    body("contact_email").optional().isEmail().normalizeEmail()
  ],
  validate,
  ticketsController.createAnonymousTicket
);

module.exports = router;
