const db = require("../models");
const { findChatByKey } = require("../services/chatServices");

// pin chat
// PATCH /api/v2/chatsetting/pin/:chatId
// private access
const pinChat = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

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

    const chatsetting = await db.ChatSetting.findOne({
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
    console.log("Error in pin chat controller", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// mute chat
// PATCH /api/v2/chatsetting/mute/:chatId
// private access
const muteChat = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

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

    const chatsetting = await db.ChatSetting.findOne({
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
    console.log("Error in mute chat controller", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// block chat
// PATCH /api/v2/chatsetting/block/:chatId
// private access
const blockChat = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

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

    const chatsetting = await db.ChatSetting.findOne({
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
    console.log("Error in block chat controller", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// delete chat
// PATCH /api/v2/chatsetting/delete/:chatId
// private access
const deleteChat = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

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

    const chatsetting = await db.ChatSetting.findOne({
      where: { chat_id: chatId, user_id: userId },
    });

    if (!chatsetting) {
      return res
        .status(400)
        .json({ message: "chat setting not found", success: false });
    }

    chatsetting.is_delete = !chatsetting.is_delete;
    await chatsetting.save();

    await db.Message.update(
      { delete_for_all: true },
      { where: { chat_id: chatId } },
    );

    res.status(200).json({
      message: chatsetting.is_delete ? "chat delete" : "welcome",
      success: true,
      delete: chatsetting.is_delete,
    });
  } catch (error) {
    console.log("Error in delete chat controller", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

module.exports = { pinChat, muteChat, blockChat, deleteChat };
