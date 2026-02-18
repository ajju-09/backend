const { Op, where } = require("sequelize");
const { findUserByKey, Users } = require("../services/userServices");
const {
  findOneChat,
  updateChat,
  createChats,
  findAllChat,
} = require("../services/chatServices");
const logger = require("../helper/logger");
const { getIo } = require("../socket");
const db = require("../models");

// create chat
// POST /api/v1/chat/create
// private access
const createChat = async (req, res) => {
  try {
    const senderId = req.id;
    const { receiverId } = req.body;

    logger.info(`${req.method} ${req.url}`);

    if (!receiverId) {
      return res
        .status(404)
        .json({ message: "Receiver id is not found", success: false });
    }

    // prevent self chat
    if (senderId === receiverId) {
      return res
        .status(400)
        .json({ message: "Cannot chat with yourself", success: false });
    }

    // check for receiver
    const recevier = await findUserByKey(receiverId);

    if (!recevier) {
      return res
        .status(404)
        .json({ message: "recevier not found ", success: false });
    }

    // check if chat already existed
    const existingChat = await findOneChat({
      where: {
        [Op.or]: [
          {
            user_one: senderId,
            user_two: receiverId,
          },
          {
            user_one: receiverId,
            user_two: senderId,
          },
        ],
      },
    });

    if (existingChat) {
      await db.ChatSetting.update(
        { is_delete: false },
        { where: { chat_id: existingChat.id, user_id: senderId } },
      );
      // find chat
      const updatedChat = await findOneChat({
        where: {
          id: existingChat.id,
        },
      });
      // const io = getIo();
      // io.to(`user_${receiverId}`).emit("new_chat", updatedChat);

      return res.json({
        message: "Chat already exist",
        data: updatedChat,
        receiver: {
          id: recevier.id,
          name: recevier.name,
          imageUrl: recevier.photo,
        },
      });
    }

    // create new chat
    const chat = await createChats({
      user_one: senderId,
      user_two: receiverId,
    });

    await db.ChatSetting.bulkCreate([
      {
        chat_id: chat.id,
        user_id: chat.user_one,
      },
      {
        chat_id: chat.id,
        user_id: chat.user_two,
      },
    ]);

    // const io = getIo();
    // io.to(`user_${receiverId}`).emit("new_chat", chat);

    res.status(200).json({
      message: "Chat created successfully ",
      success: true,
      data: chat,
      receiver: {
        id: recevier.id,
        name: recevier.name,
        imageUrl: recevier.photo,
      },
    });
  } catch (error) {
    console.log("Error in create chat controller", error.message);
    res.status(500).json({ message: "SERVER ERROR" });
  }
};

// get all my chats
// GET /api/v1/chat/my-chats
// private access
const getMyChats = async (req, res) => {
  try {
    const userId = req.id;
    const { limit = 10 } = req.params;

    logger.info(`${req.method} ${req.url}`);

    const chats = await findAllChat({
      where: {
        [Op.or]: [{ user_one: userId }, { user_two: userId }],
      },

      include: [
        {
          model: db.ChatSetting,
          where: { user_id: userId, is_delete: false },
          attributes: ["user_id", "is_pin", "is_mute", "is_block", "is_delete"],
        },
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
      limit: Number(limit),
      order: [
        // [db.ChatSetting, "is_pin", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });

    res.status(200).json({ message: "My chats", success: true, data: chats });
  } catch (error) {
    console.log("Error in get chat controller", error.message);
    res.status(500).json({ message: "SERVER ERROR" });
  }
};

module.exports = {
  createChat,
  getMyChats,
};
