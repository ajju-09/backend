const { Worker } = require("bullmq");
const { bullMqConnection } = require("../../config/redis");
const { Op } = require("sequelize");

const { findUserByKey, destroyUser } = require("../../services/userServices");
const { destroyMessageSetting } = require("../../services/messageSettingServices");
const { destroyChatSetting } = require("../../services/chatSettingServices");
const { destroyTransaction } = require("../../services/transactionServices");
const { destroyAllNotification } = require("../../services/notificationServices");
const { destroyMessage } = require("../../services/messageService");
const { destroyChat } = require("../../services/chatServices");
const { destroySubscription } = require("../../services/subscriptionService");

const userCleanupWorker = new Worker(
  "userCleanup",
  async (job) => {
    const { userId } = job.data;
    console.log(`[UserCleanupWorker] Checking user ${userId} for 30-day deletion`);

    const user = await findUserByKey(userId);

    // If perfectly hard deleted already or doesn't exist
    if (!user) {
        console.log(`[UserCleanupWorker] User ${userId} already non-existent, skipping.`);
        return;
    }

    // Checking if the user revived the account (isDeleted is false)
    if (user.isDeleted === false) {
        console.log(`[UserCleanupWorker] User ${userId} was revived. Cancelling hard deletion.`);
        return;
    }

    console.log(`[UserCleanupWorker] User ${userId} is still flagged as deleted after 30 days. Hard deleting...`);

    // Perform the permanent purges
    await destroyMessageSetting({ where: { user_id: userId } });
    await destroyChatSetting({ where: { user_id: userId } });
    await destroyTransaction({ where: { user_id: userId } });
    await destroyAllNotification({
      where: { [Op.or]: [{ sender_id: userId }, { receiver_id: userId }] },
    });

    await destroyMessage({
      where: { [Op.or]: [{ sender_id: userId }, { receiver_id: userId }] },
    });

    await destroyChat({
      where: { [Op.or]: [{ user_one: userId }, { user_two: userId }] },
    });

    await destroySubscription({ where: { user_id: userId } });
    
    // Hard delete user
    await destroyUser({ where: { id: userId } });
    
    console.log(`[UserCleanupWorker] Job ${job.id} - successfully fully purged data of user ${userId}`);
  },
  {
    connection: bullMqConnection,
    concurrency: 2,
  },
);

userCleanupWorker.on("error", (error) => {
  console.log("User Cleanup worker error:", error);
});

userCleanupWorker.on("failed", (job, error) => {
  console.log("User Cleanup worker failed:", job.id, error);
});

module.exports = { userCleanupWorker };
