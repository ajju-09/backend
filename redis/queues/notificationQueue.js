const { Queue } = require("bullmq");
const { bullMqConnection } = require("../../config/redis");

const notificationQueue = new Queue("notifications", {
  connection: bullMqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: true,
  },
});

module.exports = { notificationQueue };
