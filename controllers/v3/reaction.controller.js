const { logger } = require("../../helper/logger");
const { findMessageByKey } = require("../../services/messageService");
const {
  findOneReaction,
  destroyReaction,
  updateReaction,
  createReaction,
} = require("../../services/reactionServices");
const { notificationQueue } = require("../../redis/queues");
const MESSAGES = require("../../helper/messages");
const { getIo } = require("../../socket");
const { encryptMessage } = require("../../helper/cipherMessage");
const { findOneChatSetting } = require("../../services/chatSettingServices");
const { updateChat, findOneChat } = require("../../services/chatServices");
const { Users } = require("../../services/userServices");

const notifyChatUpdate = async (chatId, emoji, io, senderId, receiverId) => {
  const chatStr = `Reacted ${emoji} to message`;
  await updateChat(
    {
      last_message: encryptMessage(chatStr),
      last_message_time: new Date(),
      updatedAt: new Date(),
    },
    { where: { id: chatId } },
  );

  const chatData = await findOneChat({
    where: { id: chatId },
    include: [
      {
        model: Users,
        as: "UserOne",
        attributes: ["id", "name", "photo", "is_online"],
      },
      {
        model: Users,
        as: "UserTwo",
        attributes: ["id", "name", "photo", "is_online"],
      },
    ],
  });

  if (chatData) {
    chatData.last_message = chatStr;
    chatData.last_message_time = new Date();

    const receiverSetting = await findOneChatSetting({
      where: { chat_id: chatId, user_id: receiverId },
    });
    const senderSetting = await findOneChatSetting({
      where: { chat_id: chatId, user_id: senderId },
    });

    io.to(receiverId.toString()).emit("chat_update", {
      chat: chatData,
      unread_count: receiverSetting ? receiverSetting.unread_count : 0,
    });
    io.to(senderId.toString()).emit("chat_update", {
      chat: chatData,
      unread_count: senderSetting ? senderSetting.unread_count : 0,
    });
  }
};

// Add or remove a reaction (toggle)
// POST /api/v3/message/react
// private access
const reactToMessage = async (req, res, next) => {
  try {
    const userId = req.id;
    const { msgId, emoji } = req.body;

    logger.info(`${req.method} ${req.url}`);

    if (!msgId || !emoji) {
      return res.status(400).json({
        message: MESSAGES.ERROR.MESSAGE_ID_REQUIRED,
        success: false,
      });
    }

    const msg = await findMessageByKey(msgId);
    if (!msg) {
      return res.status(404).json({
        message: MESSAGES.ERROR.MESSAGE_NOT_FOUND,
        success: false,
      });
    }

    if (msg.delete_for_all) {
      return res.status(400).json({
        message: "Cannot react to a deleted message",
        success: false,
      });
    }

    // check if chat is blocked by either user
    const chatSetting = await findOneChatSetting({
      where: { chat_id: msg.chat_id, is_block: true },
    });

    if (chatSetting?.is_block) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.USER_BLOCKED, success: false });
    }

    // Check if the user already reacted to this message
    const existingReaction = await findOneReaction({
      where: { msg_id: msgId, user_id: userId },
    });

    const io = getIo();

    // Toggle logic
    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        // Same emoji — remove reaction
        await destroyReaction({ where: { id: existingReaction.id } });

        io.to(msg.sender_id.toString()).emit("reaction_removed", {
          msgId,
          userId,
          emoji,
          chatId: msg.chat_id,
        });

        io.to(msg.receiver_id.toString()).emit("reaction_removed", {
          msgId,
          userId,
          emoji,
          chatId: msg.chat_id,
        });

        return res.status(200).json({
          message: "Reaction removed successfully",
          success: true,
          action: "removed",
        });
      } else {
        // Different emoji — update reaction
        await updateReaction(
          { emoji: emoji },
          { where: { id: existingReaction.id } },
        );

        io.to(msg.sender_id.toString()).emit("reaction_updated", {
          msgId,
          userId,
          emoji,
          chatId: msg.chat_id,
        });

        io.to(msg.receiver_id.toString()).emit("reaction_updated", {
          msgId,
          userId,
          emoji,
          chatId: msg.chat_id,
        });

        await notifyChatUpdate(
          msg.chat_id,
          emoji,
          io,
          msg.sender_id,
          msg.receiver_id,
        );

        return res.status(200).json({
          message: "Reaction updated successfully",
          success: true,
          action: "updated",
          emoji,
        });
      }
    }

    // No existing reaction — add new one
    const reaction = await createReaction({
      msg_id: msgId,
      user_id: userId,
      emoji: emoji,
    });

    io.to(msg.sender_id.toString()).emit("new_reaction", {
      msgId,
      userId,
      emoji,
      chatId: msg.chat_id,
      reactionId: reaction.id,
    });

    io.to(msg.receiver_id.toString()).emit("new_reaction", {
      msgId,
      userId,
      emoji,
      chatId: msg.chat_id,
      reactionId: reaction.id,
    });

    await notifyChatUpdate(
      msg.chat_id,
      emoji,
      io,
      msg.sender_id,
      msg.receiver_id,
    );

    const targetUserId =
      msg.sender_id === userId ? msg.receiver_id : msg.sender_id;

    await notificationQueue.add("reaction-notification", {
      sender_id: userId,
      receiver_id: targetUserId,
      chat_id: msg.chat_id,
      title: encryptMessage("New Reaction"),
      message: `Someone reacted to a message with ${emoji}`,
      seen: false,
      msg_id: msgId,
    });

    return res.status(200).json({
      message: "Reaction added successfully",
      success: true,
      action: "added",
      data: reaction,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { reactToMessage };
