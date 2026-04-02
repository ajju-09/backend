const { logger } = require("../helper/logger");
const { findMessageByKey } = require("../services/messageService");
const {
  findOneMessageSetting,
  updateMessageSetting,
} = require("../services/messageSettingServices");
const MESSAGES = require("../helper/messages");
const { findOneChatSetting } = require("../services/chatSettingServices");

// star message
// /api/v2/messagesetting/star/:msgId
// private access
const starMessage = async (req, res, next) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    if (!msgId) {
      return res
        .status(404)
        .json({ message: "Msg id required", success: false });
    }

    const msg = await findMessageByKey(msgId);
    if (!msg) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.MESSAGE_NOT_FOUND, success: false });
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

    const messagesetting = await findOneMessageSetting({
      where: { msg_id: msgId, user_id: userId },
    });

    if (!messagesetting) {
      return res
        .status(404)
        .json({ message: "Message setting not found", success: false });
    }

    messagesetting.is_star = !messagesetting.is_star;
    await messagesetting.save();

    res.status(200).json({
      message: messagesetting.is_star ? "Msg star" : "Msg Unstar",
      success: true,
      star: messagesetting.is_star,
    });
  } catch (error) {
    next(error);
  }
};

// delete message for me
// /api/v2/messagesetting/delete-for-me/:msgId
// private access
const deleteMessageForMe = async (req, res, next) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    if (!msgId) {
      return res
        .status(401)
        .json({ message: "Msg id required", success: false });
    }

    const msg = await findMessageByKey(msgId);

    if (!msg) {
      return res
        .status(404)
        .json({ message: "Message not found", success: false });
    }

    await updateMessageSetting(
      { delete_for_me: true },
      {
        where: { msg_id: msgId, user_id: userId },
      },
    );

    return res
      .status(200)
      .json({ message: "Msg delete for me", success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { starMessage, deleteMessageForMe };
