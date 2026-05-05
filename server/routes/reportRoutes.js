const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.use(authenticate);

router.get("/reports/export", analyticsController.exportReport);
router.get("/audit-log", analyticsController.auditLog);

module.exports = router;
