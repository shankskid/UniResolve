const express = require("express");
const { param } = require("express-validator");
const analyticsController = require("../controllers/analyticsController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");

const router = express.Router();

router.use(authenticate);

router.get("/overview", analyticsController.overview);
router.get("/officer/:id", [param("id").isUUID()], validate, analyticsController.officer);
router.get("/by-category", analyticsController.byCategory);
router.get("/sla-compliance", analyticsController.slaCompliance);
router.get("/campus-comparison", analyticsController.campusComparison);

module.exports = router;
