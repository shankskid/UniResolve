const { Notification } = require("../models");

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

module.exports = {
  createInAppNotification
};
