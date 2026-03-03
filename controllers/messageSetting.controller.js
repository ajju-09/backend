const logger = require("../helper/logger");
const { clearCacheData } = require("../redis/redis.cache");
const { findMessageByKey } = require("../services/messageService");
const {
  findOneMessageSetting,
  updateMessageSetting,
} = require("../services/messageSettingServices");

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

    const messagesetting = await findOneMessageSetting({
      where: { msg_id: msgId, user_id: userId },
    });

    if (!messagesetting) {
      return res
        .status(404)
        .json({ message: "Message setting not found", success: false });
    }

    await clearCacheData(`star:${userId}`);
    await clearCacheData(`starInChat:${messagesetting.chat_id}:${userId}`);
    await clearCacheData(`media:${userId}`);
    await clearCacheData(`docs:${userId}`);
    await clearCacheData(`mediaInChat:${messagesetting.chat_id}:${userId}`);
    await clearCacheData(`docsInChat:${messagesetting.chat_id}:${userId}`);

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

    await clearCacheData(`star:${userId}`);
    await clearCacheData(`starInChat:${msg.chat_id}:${userId}`);
    await clearCacheData(`media:${userId}`);
    await clearCacheData(`docs:${userId}`);
    await clearCacheData(`mediaInChat:${msg.chat_id}:${userId}`);
    await clearCacheData(`docsInChat:${msg.chat_id}:${userId}`);

    await updateMessageSetting(
      { delete_for_me: true },
      {
        where: { msg_id: msgId, user_id: userId },
      },
    );
    res.status(200).json({ message: "Msg delete for me", success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { starMessage, deleteMessageForMe };
