const { Worker } = require("bullmq");
const { bullMqConnection } = require("../../config/redis");
const { createNotification } = require("../../services/notificationServices");

const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    const data = job.data;
    console.log(`[NotificationWorker] Processing job ${job.id}`);

    await createNotification(data);

    console.log(`[NotificationWorker] Job ${job.id} completed`);
  },
  {
    connection: bullMqConnection,
    concurrency: 5,
  },
);

notificationWorker.on("error", (error) => {
  console.log("Notification worker error:", error);
});

notificationWorker.on("failed", (job, error) => {
  console.log("Notification worker failed:", job.id, error);
});

notificationWorker.on("completed", (job) => {
  console.log("Notification worker completed:", job.id);
});

module.exports = { notificationWorker };
