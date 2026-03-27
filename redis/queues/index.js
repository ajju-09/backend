const { emailQueue } = require("./emailQueue");
const { notificationQueue } = require("./notificationQueue");
const { userCleanupQueue } = require("./userCleanupQueue");

module.exports = {
  emailQueue,
  notificationQueue,
  userCleanupQueue,
};
