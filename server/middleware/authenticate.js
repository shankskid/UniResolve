const jwt = require("jsonwebtoken");
const { User } = require("../models");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid authorization header." });
    }

    const token = authHeader.slice("Bearer ".length);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ message: "Authentication failed." });
    }

    req.user = {
      id: user.id,
      role: user.role
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Authentication failed." });
  }
}

module.exports = authenticate;
