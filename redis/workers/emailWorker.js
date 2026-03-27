const { Worker } = require("bullmq");
const { bullMqConnection } = require("../../config/redis");
const sendEmail = require("../../helper/sendMail");

const emailWorker = new Worker(
  "emails",
  async (job) => {
    const { to, subject, html } = job.data;
    console.log(`[EmailWorker] Sending email to ${to}`);

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
  console.log("Email worker error:", error);
});

emailWorker.on("failed", (job, error) => {
  console.log("Email worker failed:", job.id, error);
});

emailWorker.on("completed", (job) => {
  console.log("Email worker completed:", job.id);
});

module.exports = { emailWorker };
