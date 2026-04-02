const { Worker } = require("bullmq");
const { bullMqConnection } = require("../../config/redis");
const sendEmail = require("../../helper/sendMail");

const emailWorker = new Worker(
  "emails",
  async (job) => {
    const { to, subject, html } = job.data;

    await sendEmail({
      to,
      subject,
      html,
    });
  },
  {
    connection: bullMqConnection,
    concurrency: 5,
  },
);

emailWorker.on("error", (error) => {
  console.log("Email worker error:", error.message);
});

emailWorker.on("failed", (job, error) => {
  console.log("Email worker failed:", error.message);
});

emailWorker.on("completed", (job) => {
  console.log("Email worker completed:");
});

module.exports = { emailWorker };
