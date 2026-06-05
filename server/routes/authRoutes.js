const express = require("express");
const { body } = require("express-validator");
const AuthController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");
const checkRole = require("../middleware/checkRole");
const validate = require("../middleware/validate");

const router = express.Router();

const registerValidation = [
  body("name").isString().trim().isLength({ min: 2, max: 200 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }),
  body("user_type").isIn(["student", "staff"]),
  body("department_id").isUUID(),
  body("registration_number").optional({ nullable: true }).isString().trim().isLength({ min: 2, max: 100 }),
  body("lives_in_hall").optional().isBoolean(),
  body("hall_id").optional({ nullable: true }).isUUID()
];

const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 })
];

const forgotPasswordValidation = [body("email").isEmail().normalizeEmail()];

const resetPasswordValidation = [
  body("token").isString().isLength({ min: 32 }),
  body("new_password").isString().isLength({ min: 8, max: 128 })
];

const officerRegistrationValidation = [
  body("name").isString().trim().isLength({ min: 2, max: 200 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }),
  body("scope_type").isIn(["department", "hall"]),
  body("scope_ids").isArray({ min: 2, max: 2 }),
  body("scope_ids.*").isUUID()
];

const officerStatusValidation = [
  body("status").isIn(["active", "timeout", "discontinue"]),
  body("reason").optional({ nullable: true }).isString()
];

router.post("/register", registerValidation, validate, AuthController.register);
router.post(
  "/register-officer",
  authenticate,
  checkRole(["overseer"]),
  officerRegistrationValidation,
  validate,
  AuthController.registerOfficer
);
router.patch(
  "/officer/:id/status",
  authenticate,
  checkRole(["overseer", "superadmin"]),
  officerStatusValidation,
  validate,
  AuthController.updateOfficerStatus
);
router.post("/login", loginValidation, validate, AuthController.login);
router.get("/me", authenticate, AuthController.me);
router.post("/forgot-password", forgotPasswordValidation, validate, AuthController.forgotPassword);
router.post("/reset-password", resetPasswordValidation, validate, AuthController.resetPassword);

module.exports = router;
