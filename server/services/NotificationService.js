const nodemailer = require("nodemailer");
const { Notification } = require("../models");

function buildTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
}

async function createInAppNotification({ user_id, ticket_id, type, message }, transaction) {
  return Notification.create(
    {
      user_id,
      ticket_id: ticket_id || null,
      type,
      message
    },
    { transaction }
  );
}

async function notifyMany(userIds, payload, transaction) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  for (const userId of uniqueUserIds) {
    await createInAppNotification(
      {
        user_id: userId,
        ticket_id: payload.ticket_id || null,
        type: payload.type,
        message: payload.message
      },
      transaction
    );
  }
}

async function listUnreadForUser(userId) {
  return Notification.findAll({
    where: { user_id: userId, is_read: false },
    order: [["created_at", "DESC"]]
  });
}

async function markRead(userId, notificationId) {
  const [updated] = await Notification.update(
    { is_read: true },
    {
      where: {
        id: notificationId,
        user_id: userId
      }
    }
  );
  if (!updated) {
    throw new Error("Notification not found.");
  }
}

async function markAllRead(userId) {
  const [updated] = await Notification.update(
    { is_read: true },
    {
      where: {
        user_id: userId,
        is_read: false
      }
    }
  );
  return updated;
}

async function sendEmail({ to, subject, text }) {
  const transporter = buildTransporter();
  if (!transporter) {
    return { skipped: true, reason: "Email transport not configured." };
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text
  });

  return { skipped: false, messageId: info.messageId };
}

module.exports = {
  createInAppNotification,
  notifyMany,
  listUnreadForUser,
  markRead,
  markAllRead,
  sendEmail
};
