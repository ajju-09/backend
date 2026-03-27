const { Queue } = require("bullmq");
const { bullMqConnection } = require("../../config/redis");

const emailQueue = new Queue("emails", {
  connection: bullMqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
});

module.exports = { emailQueue };
