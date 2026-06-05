const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { ROLES } = require("@uniresolve/shared");
const {
  sequelize,
  Department,
  Hall,
  OfficerAssignment,
  OverseerAssignment,
  PasswordResetToken,
  User
} = require("../models");

const PUBLIC_USER_TYPES = [ROLES.STUDENT, ROLES.STAFF];
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
    is_active: user.is_active,
    is_timed_out: user.is_timed_out,
    status_reason: user.status_reason,
    timeout_until: user.timeout_until,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

function createJwtPayload(user, scopes) {
  return {
    id: user.id,
    role: user.role,
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
    department_id,
    hall_id,
    registration_number,
    lives_in_hall
  } = input;

  if (!PUBLIC_USER_TYPES.includes(user_type)) {
    throw new Error("Invalid user_type.");
  }

  const department = await Department.findByPk(department_id);
  if (!department) {
    throw new Error("Selected department does not exist.");
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
        hall_id: hall ? hall.id : null
      },
      { transaction }
    )
  );

  return sanitizeUser(user);
}

async function registerOfficer(overseer, input) {
  if (!overseer || overseer.role !== ROLES.OVERSEER) {
    throw new Error("Only overseer can register officers.");
  }

  const { name, email, password, scope_type, scope_ids } = input;
  if (!["department", "hall"].includes(scope_type)) {
    throw new Error("Officer assignments must be scoped to departments or halls.");
  }
  if (!Array.isArray(scope_ids) || scope_ids.length !== 2) {
    throw new Error("Officers must be assigned exactly two scopes.");
  }
  const uniqueScopeIds = [...new Set(scope_ids)];
  if (uniqueScopeIds.length !== 2) {
    throw new Error("Officer assignments must be two distinct scopes.");
  }

  if (scope_type === "department") {
    const departments = await Department.findAll({ where: { id: uniqueScopeIds } });
    if (departments.length !== 2) {
      throw new Error("Selected departments do not exist.");
    }
  }

  if (scope_type === "hall") {
    const halls = await Hall.findAll({ where: { id: uniqueScopeIds } });
    if (halls.length !== 2) {
      throw new Error("Selected halls do not exist.");
    }
  }

  const existingAssignments = await OfficerAssignment.findAll({
    where: { scope_type, scope_id: uniqueScopeIds },
    attributes: ["scope_id"]
  });
  if (existingAssignments.length) {
    throw new Error("One or more selected scopes are already assigned to another officer.");
  }

  const emailToUse = email.toLowerCase();
  const existingUser = await User.findOne({ where: { email: emailToUse } });
  if (existingUser) {
    throw new Error("Email is already in use.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await sequelize.transaction(async (transaction) => {
    const created = await User.create(
      {
        name,
        email: emailToUse,
        password_hash: passwordHash,
        role: ROLES.OFFICER,
        user_type: null,
        registration_number: null,
        department_id: null,
        hall_id: null
      },
      { transaction }
    );

    await OverseerAssignment.create(
      { overseer_id: overseer.id, officer_id: created.id },
      { transaction }
    );
    await OfficerAssignment.bulkCreate(
      uniqueScopeIds.map((scope_id) => ({
        officer_id: created.id,
        scope_type,
        scope_id
      })),
      { transaction }
    );

    return created;
  });

  return sanitizeUser(user);
}

async function login({ email, password }) {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw new Error("Invalid credentials.");
  }
  if (!user.is_active) {
    throw new Error(`Account discontinued: ${user.status_reason || 'Administrative action'}`);
  }

  if (user.is_timed_out) {
    if (user.timeout_until && new Date() > new Date(user.timeout_until)) {
      // Timeout has expired. Auto-restore.
      user.is_timed_out = false;
      user.status_reason = null;
      user.timeout_until = null;
      await user.save();
    } else {
      throw new Error(`Account suspended: ${user.status_reason || 'Administrative action'}. Timeout active until ${user.timeout_until ? new Date(user.timeout_until).toLocaleString() : 'lifted by an overseer'}.`);
    }
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new Error("Invalid credentials.");
  }

  const tokenPayload = createJwtPayload(user, []);
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

async function updateOfficerStatus(managerId, officerId, payload) {
  const manager = await User.findByPk(managerId);
  if (!manager || !["overseer", "superadmin"].includes(manager.role)) {
    throw new Error("Unauthorized.");
  }

  const officer = await User.findByPk(officerId);
  if (!officer || officer.role !== "officer") {
    throw new Error("Officer not found.");
  }

  if (manager.role === "overseer") {
    const isSupervised = await OverseerAssignment.findOne({
      where: { overseer_id: manager.id, officer_id: officer.id }
    });
    if (!isSupervised) {
      throw new Error("You do not supervise this officer.");
    }
  }

  const { status, reason } = payload;
  let updateData = {};

  if (status === "active") {
    updateData = { is_active: true, is_timed_out: false, status_reason: null, timeout_until: null };
  } else if (status === "timeout") {
    if (!reason || !reason.trim()) throw new Error("Reason is required to timeout an officer.");
    // 12 hours from now
    const timeoutUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
    updateData = { is_active: true, is_timed_out: true, status_reason: reason.trim(), timeout_until: timeoutUntil };
  } else if (status === "discontinue") {
    if (!reason || !reason.trim()) throw new Error("Reason is required to discontinue an officer.");
    updateData = { is_active: false, is_timed_out: false, status_reason: reason.trim(), timeout_until: null };
  } else {
    throw new Error("Invalid status update.");
  }

  await officer.update(updateData);
  return sanitizeUser(officer);
}

module.exports = {
  register,
  registerOfficer,
  login,
  me,
  forgotPassword,
  resetPassword,
  updateOfficerStatus
};
