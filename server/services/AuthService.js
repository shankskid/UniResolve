const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { ROLES } = require("@uniresolve/shared");
const { sequelize, User, Department, Hall, OfficerScope, PasswordResetToken } = require("../models");

const PUBLIC_USER_TYPES = [ROLES.STUDENT, ROLES.STAFF, ROLES.LECTURER];
const DEFAULT_RESET_EXPIRY_MINUTES = Number(process.env.RESET_TOKEN_EXPIRY_MINUTES || 60);

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    user_type: user.user_type,
    registration_number: user.registration_number,
    department_id: user.department_id,
    hall_id: user.hall_id,
    campus_id: user.campus_id,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

function createJwtPayload(user, scopes) {
  return {
    id: user.id,
    role: user.role,
    campus_id: user.campus_id,
    scope: scopes.map((scope) => ({
      type: scope.scope_type,
      id: scope.scope_id
    }))
  };
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || "7d"
  });
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function register(input) {
  const {
    name,
    email,
    password,
    user_type,
    faculty_id,
    department_id,
    hall_id,
    registration_number,
    lives_in_hall
  } = input;

  if (!PUBLIC_USER_TYPES.includes(user_type)) {
    throw new Error("Invalid user_type.");
  }

  if (Object.hasOwn(input, "campus_id")) {
    throw new Error("campus_id must not be provided.");
  }

  const department = await Department.findByPk(department_id);
  if (!department) {
    throw new Error("Selected department does not exist.");
  }

  if (department.faculty_id !== faculty_id) {
    throw new Error("Department does not belong to the selected faculty.");
  }

  let hall = null;
  if (user_type === ROLES.STUDENT) {
    if (!registration_number || !String(registration_number).trim()) {
      throw new Error("Students must provide a registration number.");
    }

    const isResidential = Boolean(lives_in_hall) || Boolean(hall_id);
    if (isResidential) {
      if (!hall_id) {
        throw new Error("Hall is required when lives_in_hall is true.");
      }
      hall = await Hall.findByPk(hall_id);
      if (!hall) {
        throw new Error("Selected hall does not exist.");
      }
      if (hall.campus_id !== department.campus_id) {
        throw new Error("Students cannot register with a hall from a different campus.");
      }
    }
  } else if (hall_id) {
    throw new Error("Only students can register with a hall.");
  } else if (lives_in_hall) {
    throw new Error("Only students can use lives_in_hall.");
  } else if (registration_number) {
    throw new Error("Only students can provide a registration number.");
  }

  const emailToUse = email.toLowerCase();
  const registrationNumberToUse = registration_number ? String(registration_number).trim() : null;

  const existingUser = await User.findOne({ where: { email: emailToUse } });
  if (existingUser) {
    throw new Error("Email is already in use.");
  }
  if (registrationNumberToUse) {
    const existingRegistration = await User.findOne({ where: { registration_number: registrationNumberToUse } });
    if (existingRegistration) {
      throw new Error("Registration number is already in use.");
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await sequelize.transaction(async (transaction) =>
    User.create(
      {
        name,
        email: emailToUse,
        password_hash: passwordHash,
        role: user_type,
        user_type,
        registration_number: registrationNumberToUse,
        department_id,
        hall_id: hall ? hall.id : null,
        campus_id: department.campus_id
      },
      { transaction }
    )
  );

  return sanitizeUser(user);
}

async function login({ email, password }) {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user || !user.is_active) {
    throw new Error("Invalid credentials.");
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new Error("Invalid credentials.");
  }

  const scopes = await OfficerScope.findAll({ where: { user_id: user.id } });
  const tokenPayload = createJwtPayload(user, scopes);
  const token = signToken(tokenPayload);

  return {
    token,
    user: sanitizeUser(user)
  };
}

async function me(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found.");
  }
  return sanitizeUser(user);
}

async function forgotPassword({ email }) {
  const user = await User.findOne({ where: { email: email.toLowerCase(), is_active: true } });
  if (!user) {
    return { message: "If an account exists, password reset instructions have been sent." };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(resetToken);
  const expiresAt = new Date(Date.now() + DEFAULT_RESET_EXPIRY_MINUTES * 60 * 1000);

  await sequelize.transaction(async (transaction) => {
    await PasswordResetToken.update(
      { used_at: new Date() },
      { where: { user_id: user.id, used_at: null }, transaction }
    );
    await PasswordResetToken.create(
      {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt
      },
      { transaction }
    );
  });

  return {
    message: "If an account exists, password reset instructions have been sent.",
    reset_token: process.env.NODE_ENV === "production" ? undefined : resetToken
  };
}

async function resetPassword({ token, new_password }) {
  const tokenHash = hashResetToken(token);
  const resetRecord = await PasswordResetToken.findOne({
    where: {
      token_hash: tokenHash,
      used_at: null,
      expires_at: { [Op.gt]: new Date() }
    }
  });

  if (!resetRecord) {
    throw new Error("Invalid or expired reset token.");
  }

  const passwordHash = await bcrypt.hash(new_password, 12);

  await sequelize.transaction(async (transaction) => {
    await User.update(
      { password_hash: passwordHash },
      { where: { id: resetRecord.user_id }, transaction }
    );
    await PasswordResetToken.update(
      { used_at: new Date() },
      { where: { id: resetRecord.id }, transaction }
    );
  });

  return { message: "Password reset successful." };
}

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword
};
