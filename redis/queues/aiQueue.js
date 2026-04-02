const { Queue } = require("bullmq");
const { bullMqConnection } = require("../../config/redis");

const aiQueue = new Queue("ai-suggestions", {
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

module.exports = { aiQueue };
