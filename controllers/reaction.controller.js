const { logger } = require("../helper/logger");
const { findMessageByKey } = require("../services/messageService");
const {
  findOneReaction,
  createReaction,
  destroyReaction,
  updateReaction,
} = require("../services/reactionServices");
const MESSAGES = require("../helper/messages");
const { getIo } = require("../socket");

// Add or remove a reaction (toggle)
// POST /api/v1/message/react
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
