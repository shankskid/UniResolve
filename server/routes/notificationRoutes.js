const express = require("express");
const { param } = require("express-validator");
const notificationsController = require("../controllers/notificationsController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");

const router = express.Router();

router.use(authenticate);

router.get("/", notificationsController.listUnread);
router.patch("/:id/read", [param("id").isUUID()], validate, notificationsController.markRead);
router.patch("/read-all", notificationsController.markAllRead);

module.exports = router;
