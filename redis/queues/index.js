const { emailQueue } = require("./emailQueue");
const { notificationQueue } = require("./notificationQueue");
const { userCleanupQueue } = require("./userCleanupQueue");
const { aiQueue } = require("./aiQueue");

module.exports = {
  emailQueue,
  notificationQueue,
  userCleanupQueue,
  aiQueue,
};
