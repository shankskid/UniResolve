const AuthService = require("../services/AuthService");

function badRequestResponse(res, error) {
  return res.status(400).json({ message: error.message });
}

async function register(req, res, next) {
  try {
    const user = await AuthService.register(req.body);
    return res.status(201).json({ user });
  } catch (error) {
    if (error.message) {
      return badRequestResponse(res, error);
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await AuthService.login(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === "Invalid credentials.") {
      return res.status(401).json({ message: error.message });
    }
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await AuthService.me(req.user.id);
    return res.status(200).json({ user });
  } catch (error) {
    if (error.message === "User not found.") {
      return res.status(404).json({ message: error.message });
    }
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await AuthService.forgotPassword(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await AuthService.resetPassword(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === "Invalid or expired reset token.") {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword
};
