const { Worker } = require("bullmq");
const { bullMqConnection } = require("../../config/redis");
const { createNotification } = require("../../services/notificationServices");

const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    const data = job.data;

    await createNotification(data);
  },
  {
    connection: bullMqConnection,
    concurrency: 5,
  },
);

notificationWorker.on("error", (error) => {
  console.log("Notification worker error:", error.message);
});

notificationWorker.on("failed", (job, error) => {
  console.log("Notification worker failed:", error.message);
});

notificationWorker.on("completed", () => {
  console.log("Notification worker completed:");
});

module.exports = { notificationWorker };
