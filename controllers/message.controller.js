const { Op, where } = require("sequelize");
const logger = require("../helper/logger");
const db = require("../models");
const { findChatByKey, updateChat } = require("../services/chatServices");
const { Users, findUserByKey } = require("../services/userServices");
const { getIo, getUserSocketMap } = require("../socket");
const uploadToCloudinary = require("../helper/uploadToCloudinary");

// send message
// POST /api/v1/message/send
// private access
const sendMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const { chatId, text, replyTo } = req.body;
    const io = getIo();
    // const userSocketMap = getUserSocketMap();

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
    }

    if (replyTo) {
      const parentMsg = await db.Message.findOne({
        where: { id: replyTo, chat_id: chatId },
      });

      if (!parentMsg) {
        return res
          .status(400)
          .json({ message: "Invalid reply message", success: false });
      }
    }

    // create new message
    const msg = await db.Message.create({
      sender_id: senderId,
      receiver_id: receiverId,
      chat_id: chatId,
      text,
      image_url: images.length > 0 ? JSON.stringify(images) : null,
      reply_to: replyTo || null,
      is_send: true,
    });

    const responseMsg = {
      ...msg.toJSON(),
      image_url: msg.image_url ? JSON.parse(msg.image_url) : [],
    };

    // const receiverSocketId = userSocketMap.get(receiverId.toString());
    // console.log("===================================");
    // console.log("Receiver Socket Id", receiverSocketId);
    // console.log("===================================");

    // checking online users
    // if (receiverSocketId) {
    if (receiver && receiver.is_online > 0) {
      await db.Message.update({ is_received: true }, { where: { id: msg.id } });

      console.log("==============================");
      console.log("receiver id", receiverId);
      console.log("==============================");
      io.to(receiverId.toString()).emit("new_message", {
        msg: responseMsg,
        is_received: true,
        reply_to: msg.reply_to,
      });

      io.to(receiverId.toString()).emit("new_noti", {
        message: `${user.name} sent you a message`,
        chatId: chatId,
      });
    }

    // }

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

    logger.info(`${req.method} ${req.url}`);

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
    const messages = await db.Message.findAll({
      where: {
        chat_id: chatId,
        [Op.and]: [
          {
            delete_for_all: false,
          },
          {
            [Op.or]: [
              {
                sender_id: userId,
                delete_for_sender: false,
              },
              {
                sender_id: {
                  [Op.ne]: userId,
                },
                delete_for_receiver: false,
              },
            ],
          },
        ],
      },
      include: {
        model: Users,
        attributes: ["id", "name", "photo"],
      },
      order: [["createdAt", "ASC"]],
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

// read message
// PATCH /api/v1/message/read/:msgId
// private access
const readMessage = async (req, res) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;
    const io = getIo();

    logger.info(`${req.method} ${req.url}`);

    const msg = await db.Message.findByPk(msgId);

    if (!msg) {
      return res
        .status(404)
        .json({ message: "Message not found ", success: false });
    }

    if (msg.sender_id === userId) {
      return res
        .status(400)
        .json({ message: "can't read msg yourself ", success: false });
    }

    await db.Message.update(
      { is_received: true, is_read: true },
      { where: { id: msgId, receiver_id: userId } },
    );

    // notify sender
    io.to(msg.sender_id).emit("seen_message", {
      msgId,
      chatId: msg.chat_id,
    });

    res
      .status(200)
      .json({ message: "message read successfully", success: true });
  } catch (error) {
    console.log("Error in read message controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// star message
// PATCH /api/v1/message/star/:msgId
// private access
const starMessage = async (req, res) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    const msg = await db.Message.findByPk(msgId);

    if (!msg) {
      return res.status(404).json({ message: "Msg not found", success: false });
    }

    // cannot star own message
    if (msg.sender_id === userId) {
      return res
        .status(403)
        .json({ message: "Not Authorized", success: false });
    }

    msg.is_star = !msg.is_star;
    await msg.save();

    res
      .status(200)
      .json({ message: msg.is_star ? "Message star" : "Message unstar" });
  } catch (error) {
    console.log("Error in star message controller", error.message);
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

    const msg = await db.Message.findByPk(msgId);

    if (!msg) {
      return res.status(404).json({ message: "Msg not found", success: false });
    }

    // cannot pin own message
    if (msg.sender_id === userId) {
      return res.status(403).json({ message: "Not Authorized" });
    }

    msg.is_pin = !msg.is_pin;
    await msg.save();

    res
      .status(200)
      .json({ message: msg.is_pin ? "Message pin" : "Message unpin" });
  } catch (error) {
    console.log("Error in pin message controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// delete message for me
// PATCH /api/v1/message/delete/me/:msgId
// private access
const deleteForMe = async (req, res) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;

    if (!msgId) {
      return res
        .status(404)
        .json({ message: "Message not found", success: false });
    }

    const msg = await db.Message.findByPk(msgId);

    if (msg.sender_id === userId) {
      await db.Message.update(
        { delete_for_sender: true },
        { where: { id: msgId } },
      );
    } else if (msg.receiver_id === userId) {
      await db.Message.update(
        { delete_for_receiver: true },
        { where: { id: msgId } },
      );
    } else {
      return res
        .status(400)
        .json({ message: "Not Authorized", success: false });
    }

    res.status(200).json({ message: "Message delete for you ", success: true });
  } catch (error) {
    console.log("Error in delete for me message controller", error.message);
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

    const msg = await db.Message.findByPk(msgId);

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

    res.status(200).json({ message: "Delete for all message", success: true });
  } catch (error) {
    console.log("Error in delete for all message controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

module.exports = {
  sendMessage,
  getMessage,
  readMessage,
  starMessage,
  pinMessage,
  deleteForMe,
  deleteForAll,
};
