const express = require("express");
const { body } = require("express-validator");
const AuthController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");

const router = express.Router();

const registerValidation = [
  body("name").isString().trim().isLength({ min: 2, max: 200 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }),
  body("user_type").isIn(["student", "staff", "lecturer"]),
  body("faculty_id").isUUID(),
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

router.post("/register", registerValidation, validate, AuthController.register);
router.post("/login", loginValidation, validate, AuthController.login);
router.get("/me", authenticate, AuthController.me);
router.post("/forgot-password", forgotPasswordValidation, validate, AuthController.forgotPassword);
router.post("/reset-password", resetPasswordValidation, validate, AuthController.resetPassword);

module.exports = router;
