const express = require("express");
const referenceController = require("../controllers/referenceController");

const router = express.Router();

router.get("/departments", referenceController.listDepartments);
router.get("/halls", referenceController.listHalls);
router.get("/categories", referenceController.listCategories);

module.exports = router;
