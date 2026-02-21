const { Op } = require("sequelize");
const logger = require("../helper/logger");
const { findChatByKey, updateChat } = require("../services/chatServices");
const { Users, findUserByKey } = require("../services/userServices");
const { getIo } = require("../socket");
const uploadToCloudinary = require("../helper/uploadToCloudinary");
const {
  findOneMessage,
  createMessage,
  findAllMessage,
  findMessageByKey,
  updateMessage,
} = require("../services/messageService");
const db = require("../models");

// send message
// POST /api/v1/message/send
// private access
const sendMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const { chatId, text, replyTo } = req.body;
    const io = getIo();

    logger.info(`${req.method} ${req.url}`);

    // check chat exists
    const chat = await findChatByKey(chatId);
    const user = await findUserByKey(senderId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "Chat not found", success: false });
    }

    // check user is a part of chat or not
    if (chat.user_one !== senderId && chat.user_two !== senderId) {
      return res
        .status(403)
        .json({ message: "Sender is not Authorized", success: false });
    }

    // check for receiverId
    const receiverId =
      chat.user_one === senderId ? chat.user_two : chat.user_one;

    const receiver = await findUserByKey(receiverId);

    let images = [];

    if (req.files && req.files.length > 0) {
      const uploads = await Promise.all(
        req.files.map(async (file) => await uploadToCloudinary(file)),
      );

      images = uploads.map((img) => img.secure_url);

      await db.Notification.create({
        sender_id: senderId,
        receiver_id: receiverId,
        title: "Sent File",
        message: `${user.name} sent you a file`,
      });
    }

    if (replyTo) {
      const parentMsg = await findOneMessage({
        where: { id: replyTo, chat_id: chatId },
      });

      if (!parentMsg) {
        return res
          .status(400)
          .json({ message: "Invalid reply message", success: false });
      }
    }

    // create new message
    const msg = await createMessage({
      sender_id: senderId,
      receiver_id: receiverId,
      chat_id: chatId,
      text,
      image_url: images.length > 0 ? JSON.stringify(images) : null,
      reply_to: Number(replyTo) || null,
    });

    await db.MessageSetting.bulkCreate([
      { msg_id: msg.id, chat_id: chatId, user_id: msg.sender_id },
      { msg_id: msg.id, chat_id: chatId, user_id: msg.receiver_id },
    ]);

    const responseMsg = {
      ...msg.toJSON(),
      image_url: msg.image_url ? JSON.parse(msg.image_url) : [],
    };

    // checking online users
    if (receiver && receiver.is_online > 0) {
      console.log("==============================");
      console.log("receiver id", receiverId);
      console.log("==============================");

      io.to(receiverId.toString()).emit("new_message", {
        msg: responseMsg,
        reply_to: msg.reply_to,
      });

      io.to(receiverId.toString()).emit("new_noti", {
        message: `${user.name} sent you a message`,
        chatId: chatId,
      });

      if (text !== null && text !== "") {
        await db.Notification.create({
          sender_id: senderId,
          receiver_id: receiverId,
          title: "New message",
          message: `${user.name} sent you a new message`,
        });
      }
    }

    await updateChat({ updatedAt: new Date() }, { where: { id: chatId } });

    res.status(200).json({
      message: "Message created ",
      success: true,
      msg: responseMsg,
    });
  } catch (error) {
    console.log("Error in send message controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// get messages
// GET /api/v1/message/:chatId
// private access
const getMessage = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;
    // const { page = 1, limit = 20 } = req.query;

    logger.info(`${req.method} ${req.url}`);
    // const pageNumber = parseInt(page);
    // const pageSize = parseInt(limit);

    // const PageOffset = (pageNumber - 1) * pageSize;
    // console.log("============================");
    // console.log("offset", PageOffset);
    // console.log("============================");

    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "Chat not found ", success: false });
    }

    // valid user or not
    if (chat.user_one !== userId && chat.user_two !== userId) {
      return res
        .status(403)
        .json({ message: "User not Authorized", success: false });
    }

    // using chat id fetch all messages
    const messages = await findAllMessage({
      where: {
        chat_id: chatId,
        delete_for_all: false,
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
        [Op.and]: [
          db.sequelize.literal(`
              NOT EXISTS (
                SELECT 1 FROM message_settings 
                WHERE msg_id = Message.id 
                AND user_id  = ${userId} 
                AND delete_for_me = true
              )
            `),
        ],
      },
      include: [
        {
          model: Users,
          as: "sender",
          attributes: ["id", "name", "photo"],
        },
        {
          model: db.MessageSetting,
          as: "setting",
          where: { user_id: userId },
          attributes: ["is_star"],
        },
      ],

      order: [["createdAt", "DESC"]],
      // limit: pageSize,
      // offset: PageOffset,
    });

    res.status(200).json({
      message: "Fetched all messages ",
      success: true,
      messages: messages,
    });
  } catch (error) {
    console.log("Error in receive message controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// pin message
// PATCH /api/v1/message/pin/:msgId
// private access
const pinMessage = async (req, res) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    const msg = await findMessageByKey(msgId);

    if (!msg) {
      return res.status(404).json({ message: "Msg not found", success: false });
    }

    if (msg.sender_id !== userId && msg.receiver_id !== userId) {
      return res
        .status(401)
        .json({ message: "Your not authorized", success: false });
    }

    // unpin any existing message
    await updateMessage(
      { is_pin: false },
      {
        where: { chat_id: msg.chat_id, is_pin: true },
      },
    );

    // pin message
    msg.is_pin = true;
    await msg.save();

    res.status(200).json({ message: "Msg pinned successfully", success: true });
  } catch (error) {
    console.log("Error in pin message controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// delete message for all
// DELETE /api/v1/message/delete/all/:msgId
// private access
const deleteForAll = async (req, res) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;
    const io = getIo();

    const msg = await findMessageByKey(msgId);

    if (!msg) {
      return res
        .status(404)
        .json({ message: "Message not found", success: false });
    }

    if (msg.sender_id !== userId) {
      return res
        .status(400)
        .json({ message: "Sender can delete for everyone", success: false });
    }

    msg.delete_for_all = true;
    await msg.save();

    io.to(msg.sender_id.toString()).emit("msg_delete_for_all", {
      msgId,
    });

    io.to(msg.receiver_id.toString()).emit("msg_delete_for_all", {
      msgId,
    });

    res
      .status(200)
      .json({ message: "Message delete for everyone", success: true });
  } catch (error) {
    console.log("Error in delete for all message controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// search message with in chat
// GET /api/v1/message/search/msg
// private access
const searchMessageInChat = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId, text, limit = 10 } = req.query;

    logger.info(`${req.method} ${req.url}`);

    if (!chatId) {
      return res
        .status(400)
        .json({ message: "Chat id required", success: false });
    }

    if (!text) {
      return res.status(400).json({ message: "Text required", success: false });
    }

    const msg = await findAllMessage({
      where: {
        chat_id: chatId,
        delete_for_all: false,
        text: {
          [Op.like]: `%${text}%`,
        },
        [Op.and]: [
          db.sequelize.literal(`
            NOT EXISTS (
            SELECT 1 FROM message_settings ms
            WHERE ms.msg_id = Message.id
            AND ms.user_id = ${userId}
            AND ms.delete_for_me = true
          )`),
        ],
      },
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
    });

    res
      .status(200)
      .json({ message: "search message", success: true, msg: msg });
  } catch (error) {
    console.log("Error in search message controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// get all star messages
// GET /api/v2/message/get-star-message
// private access
const getAllStarMessages = async (req, res) => {
  try {
    const userId = req.id;
    const starMsg = await findAllMessage({
      where: { delete_for_all: false },
      include: [
        {
          model: db.MessageSetting,
          as: "setting",
          where: { user_id: userId, is_star: true, delete_for_me: false },
          attributes: ["chat_id"],
        },
        {
          model: Users,
          as: "sender",
          attributes: ["id", "name", "photo"],
        },
      ],
      attributes: ["id", "text"],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      message: "Started messages fetch successfully",
      success: true,
      data: starMsg,
    });
  } catch (error) {
    console.log("Error in get all star messges", error.message);
    req
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// get all star messages with in chat
// GET /api/v1/message/get-star-message-in-chat/:chatId
// private access
const getAllStarMessageWithInChat = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;
    // const { page = 1, limit = 10 } = req.query;

    // const pageNumber = parseInt(page);
    // const pageSize = parseInt(limit);

    // const starOffset = (pageNumber - 1) * pageSize;

    if (!chatId) {
      return res
        .status(400)
        .json({ message: "Chat id required", success: false });
    }

    const starMsg = await findAllMessage({
      where: { chat_id: chatId, delete_for_all: false },
      include: [
        {
          model: db.MessageSetting,
          as: "setting",
          where: { user_id: userId, is_star: true, delete_for_me: false },
          attributes: ["id", "is_star"],
        },
        {
          model: Users,
          as: "sender",
          attributes: ["id", "name", "photo"],
        },
      ],
      attributes: ["id", "text"],
      // limit: pageSize,
      // offset: starOffset,
      order: [["id", "DESC"]],
    });

    if (!starMsg) {
      return res
        .status(400)
        .json({ message: "There is not star message for you", success: false });
    }

    res.status(200).json({
      message: "Fetch all star message in chat successfully",
      success: true,
      data: starMsg,
    });
  } catch (error) {
    console.log("Error in get all star message with in chat", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessage,
  pinMessage,
  deleteForAll,
  searchMessageInChat,
  getAllStarMessages,
  getAllStarMessageWithInChat,
};
