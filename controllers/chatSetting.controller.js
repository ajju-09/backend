const logger = require("../helper/logger");
const { findChatByKey, updateChat } = require("../services/chatServices");
const { findOneChatSetting } = require("../services/chatSettingServices");
const { updateMessage } = require("../services/messageService");

// pin chat
// PATCH /api/v2/chatsetting/pin/:chatId
// private access
const pinChat = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    if (!chatId) {
      return res
        .status(404)
        .json({ message: "Chat id not found", success: false });
    }

    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "Chat not found", success: false });
    }

    if (userId !== chat.user_one && userId !== chat.user_two) {
      return res
        .status(400)
        .json({ message: "Not Authorized", success: false });
    }

    const chatsetting = await findOneChatSetting({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!chatsetting) {
      return res
        .status(404)
        .json({ message: "Chat setting not found", success: false });
    }

    chatsetting.is_pin = !chatsetting.is_pin;
    await chatsetting.save();

    res.status(200).json({
      message: chatsetting.is_pin ? "chat pin" : "chat unpin",
      success: true,
      pin: chatsetting.is_pin,
    });
  } catch (error) {
    next(error);
  }
};

// mute chat
// PATCH /api/v2/chatsetting/mute/:chatId
// private access
const muteChat = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    if (!chatId) {
      return res
        .status(404)
        .json({ message: "Chat not found", success: false });
    }

    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "chat not found", success: false });
    }

    if (userId !== chat.user_one && userId !== chat.user_two) {
      return res
        .status(400)
        .json({ message: "Not Authorized", success: false });
    }

    const chatsetting = await findOneChatSetting({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!chatsetting) {
      return res
        .status(400)
        .json({ message: "chat setting not found", success: false });
    }

    chatsetting.is_mute = !chatsetting.is_mute;
    await chatsetting.save();

    res.status(200).json({
      message: chatsetting.is_mute ? "chat mute" : "chat unmute",
      success: true,
      mute: chatsetting.is_mute,
    });
  } catch (error) {
    next(error);
  }
};

// block chat
// PATCH /api/v2/chatsetting/block/:chatId
// private access
const blockChat = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    if (!chatId) {
      return res
        .status(404)
        .json({ message: "Chat not found", success: false });
    }

    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "chat not found", success: false });
    }

    if (userId !== chat.user_one && userId !== chat.user_two) {
      return res
        .status(400)
        .json({ message: "Not Authorized", success: false });
    }

    const chatsetting = await findOneChatSetting({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!chatsetting) {
      return res
        .status(400)
        .json({ message: "chat setting not found", success: false });
    }

    chatsetting.is_block = !chatsetting.is_block;
    await chatsetting.save();

    res.status(200).json({
      message: chatsetting.is_block ? "chat block" : "chat unblock",
      success: true,
      block: chatsetting.is_block,
    });
  } catch (error) {
    next(error);
  }
};

// delete chat
// PATCH /api/v2/chatsetting/delete/:chatId
// private access
const deleteChat = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    if (!chatId) {
      return res
        .status(404)
        .json({ message: "Chat not found", success: false });
    }

    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "chat not found", success: false });
    }

    if (userId !== chat.user_one && userId !== chat.user_two) {
      return res
        .status(400)
        .json({ message: "Not Authorized", success: false });
    }

    const chatsetting = await findOneChatSetting({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!chatsetting) {
      return res
        .status(400)
        .json({ message: "chat setting not found", success: false });
    }

    chatsetting.is_delete = !chatsetting.is_delete;
    await chatsetting.save();

    await updateChat(
      { last_message: null, last_message_time: null },
      { where: { id: chatId } },
    );

    await updateMessage(
      { delete_for_all: true },
      { where: { chat_id: chatId } },
    );

    res.status(200).json({
      message: chatsetting.is_delete ? "chat delete" : "welcome",
      success: true,
      delete: chatsetting.is_delete,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { pinChat, muteChat, blockChat, deleteChat };
