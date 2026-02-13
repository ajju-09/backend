const { Op } = require("sequelize");
const { findUserByKey, Users } = require("../services/userServices");
const {
  findOneChat,
  updateChat,
  createChats,
  findAllChat,
  findChatByKey,
} = require("../services/chatServices");

// create chat
// POST /api/v1/chat/create
// private access
const createChat = async (req, res) => {
  try {
    const senderId = req.id;
    const { receiverId } = req.body;

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
      await updateChat(
        { isDeleted: false },
        {
          where: {
            [Op.and]: [{ user_one: senderId }, { user_two: receiverId }],
          },
        },
      );

      // find chat
      const updatedChat = await findOneChat({
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
      return res.json({
        message: "Chat already exist",
        data: updatedChat,
      });
    }

    // create new chat
    const chat = await createChats({
      user_one: senderId,
      user_two: receiverId,
    });

    res.status(200).json({
      message: "Chat created successfully ",
      success: true,
      data: chat,
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
    const senderId = req.id;

    const chats = await findAllChat({
      // where: {
      //   [Op.or]: [{ user_one: senderId }, { user_two: senderId }],
      // },

      where: {
        user_one: senderId,
      },

      include: [
        {
          model: Users,
          attributes: ["id", "name", "photo", "is_online"],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    res.status(200).json({ message: "My chats", success: true, data: chats });
  } catch (error) {
    console.log("Error in get chat controller", error.message);
    res.status(500).json({ message: "SERVER ERROR" });
  }
};

// toggle block
// PATCH /api/v1/chat/block/:chatId
// private access
const toggleBlock = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

    // check for chat in DB
    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "chat not found ", success: false });
    }

    if (chat.user_one !== userId && chat.user_two !== userId) {
      return res
        .status(403)
        .json({ message: "User is not Authorized", success: false });
    }

    chat.is_blocked = !chat.is_blocked;
    await chat.save();

    res.status(200).json({
      message: chat.is_blocked ? "Chat Blocked" : "Chat Unblocked",
      success: true,
      isBlocked: chat.is_blocked,
    });
  } catch (error) {
    console.log("Error in block chat controller", error.message);
    res.status(500).json({ message: "SERVER ERROR" });
  }
};

// toggle pin
// PATCH /api/v1/chat/pin/:chatId
// private access
const togglePin = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

    // find chat in db
    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "chat not found ", success: false });
    }

    // only memebers can pin it
    if (chat.user_one !== userId && chat.user_two !== userId) {
      return res
        .status(403)
        .json({ message: "You are not Authorized ", success: false });
    }

    // toggle pin
    chat.is_pin = !chat.is_pin;
    await chat.save();

    res.status(200).json({
      message: chat.is_pin ? "Chat pin " : "Chat unpin",
      success: true,
      isPin: chat.is_pin,
    });
  } catch (error) {
    console.log("Error in create chat controller", error.message);
    res.status(500).json({ message: "SERVER ERROR" });
  }
};

// toggle mute
// PATCH /api/v1/chat/mute/:chatId
// private access
const toggleMute = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

    // find chat in db
    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "chat not found ", success: false });
    }

    // only memebers can pin it
    if (chat.user_one !== userId && chat.user_two !== userId) {
      return res
        .status(403)
        .json({ message: "You are not Authorized ", success: false });
    }

    chat.is_muted = !chat.is_muted;
    await chat.save();

    res.status(200).json({
      message: chat.is_muted ? "chat mute" : "chat unmute",
      success: true,
      isMute: chat.is_muted,
    });
  } catch (error) {
    console.log("Error in create chat controller", error.message);
    res.status(500).json({ message: "SERVER ERROR" });
  }
};

// delete chat
// DELETE /api/v1/chat/:chatId
// private access
const deleteChat = async (req, res) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

    // find for chat
    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "chat not found ", success: false });
    }

    if (chat.user_one !== userId && chat.user_two !== userId) {
      return res
        .status(403)
        .json({ message: "Not Authorized ", success: false });
    }

    // soft delete
    await updateChat({ isDeleted: true }, { where: { id: chatId } });

    res.status(200).json({ message: "Chat deleted ", success: true });
  } catch (error) {
    console.log("Error in create chat controller", error.message);
    res.status(500).json({ message: "SERVER ERROR" });
  }
};

module.exports = {
  createChat,
  getMyChats,
  toggleBlock,
  toggleMute,
  togglePin,
  deleteChat,
};
