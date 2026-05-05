const NotificationService = require("../services/NotificationService");

async function listUnread(req, res, next) {
  try {
    const notifications = await NotificationService.listUnreadForUser(req.user.id);
    return res.status(200).json({ notifications });
  } catch (error) {
    return next(error);
  }
}

async function markRead(req, res, next) {
  try {
    await NotificationService.markRead(req.user.id, req.params.id);
    return res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    if (error.message === "Notification not found.") {
      return res.status(404).json({ message: error.message });
    }
    return next(error);
  }
}

async function markAllRead(req, res, next) {
  try {
    const updated = await NotificationService.markAllRead(req.user.id);
    return res.status(200).json({ message: "Notifications marked as read.", updated });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUnread,
  markRead,
  markAllRead
};
