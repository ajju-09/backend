const { Op } = require("sequelize");
const { findUserByKey, Users } = require("../services/userServices");
const {
  findOneChat,
  createChats,
  findAllChat,
} = require("../services/chatServices");
const { logger } = require("../helper/logger");

const {
  updateChatSetting,
  BulkCreateChatSetting,
  ChatSetting,
} = require("../services/chatSettingServices");
const { decryptMessage } = require("../helper/cipherMessage");
const { getCacheData } = require("../redis/redis.client");

// create chat
// POST /api/v1/chat/create
// private access
const createChat = async (req, res, next) => {
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
      await updateChatSetting(
        { is_delete: false },
        { where: { chat_id: existingChat.id, user_id: senderId } },
      );

      // find chat
      const updatedChat = await findOneChat({
        where: {
          id: existingChat.id,
        },
      });

      return res.status(200).json({
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

    await BulkCreateChatSetting([
      {
        chat_id: chat.id,
        user_id: chat.user_one,
      },
      {
        chat_id: chat.id,
        user_id: chat.user_two,
      },
    ]);

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
    next(error);
  }
};

// get all my chats
// GET /api/v1/chat/my-chats
// private access
const getMyChats = async (req, res, next) => {
  try {
    const userId = req.id;
    const { page = 1, limit = 10 } = req.query;

    logger.info(`${req.method} ${req.url}`);

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const PageOffset = (pageNumber - 1) * pageSize;

    const chats = await findAllChat({
      where: {
        [Op.or]: [{ user_one: userId }, { user_two: userId }],
      },
      // attributes: {
      //   include: [
      //     [
      //       db.sequelize.literal(
      //         `(SELECT text FROM messages m where m.chat_id = \`Chat\`.id order by createdAt DESC LIMIT 1)`,
      //       ),
      //       "llll",
      //     ],
      //   ],
      // },
      include: [
        {
          model: ChatSetting,
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
      limit: pageSize,
      offset: PageOffset,
      order: [["last_message_time", "DESC"]],
    });

    const decryptedChat = await Promise.all(
      chats.map(async (item) => {
        const chat = item.toJSON();

        const decryptedText = decryptMessage(chat.last_message || "");

        const unreadCount =
          (await getCacheData(`unread:${userId}:${chat.id}`)) || 0;

        return {
          ...chat,
          last_message: decryptedText,
          unread_count: Number(unreadCount),
        };
      }),
    );

    // const decryptedChat = chats.map((item) => {
    //   const decryptedText = decryptMessage(item.last_message || "");
    //   return { ...item.toJSON(), last_message: decryptedText };
    // });

    // const count = await getCacheData(`unread:${userId}:${decryptedChat.id}`);
    // console.log("get unread count from chat controller", count);

    res
      .status(200)
      .json({ message: "My chats", success: true, data: decryptedChat });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createChat,
  getMyChats,
};
