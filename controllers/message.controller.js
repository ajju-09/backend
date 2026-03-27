const { Op, where } = require("sequelize");
const { logger } = require("../helper/logger");
const {
  findChatByKey,
  updateChat,
  findOneChat,
} = require("../services/chatServices");
const { Users, findUserByKey } = require("../services/userServices");
const { getIo } = require("../socket");
const uploadToCloudinary = require("../helper/uploadToCloudinary");
const {
  findOneMessage,
  createMessage,
  findAllMessage,
  updateMessage,
  findMessageByKey,
  countMessages,
} = require("../services/messageService");
const db = require("../models");
const {
  createNotification,
  updateNotification,
} = require("../services/notificationServices");
const {
  bulkCreateMessageSetting,
  MessageSetting,
} = require("../services/messageSettingServices");
const { encryptMessage, decryptMessage } = require("../helper/cipherMessage");
const {
  incrementChatSetting,
  findOneChatSetting,
} = require("../services/chatSettingServices");
const {
  getCacheData,
  increment,
  expireKey,
  clearCacheData,
} = require("../redis/redis.client");
const { findOneSubscription } = require("../services/subscriptionService");
const { Plans, findOnePlan } = require("../services/planServices");
const { publisher } = require("../config/redis");
const sendFCMNotification = require("../helper/sendFCM");
const MESSAGES = require("../helper/messages");
const { Reaction } = require("../services/reactionServices");

// send message
// POST /api/v1/message/send
// private access
const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.id;
    const { chatId, text, replyTo } = req.body;
    const io = getIo();

    logger.info(`${req.method} ${req.url}`);

    // check chat and sender existence
    const [chat, user] = await Promise.all([
      findChatByKey(chatId),
      findUserByKey(senderId),
    ]);

    if (!chat) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.CHAT_NOT_FOUND, success: false });
    }

    // check user is a part of chat or not
    if (chat.user_one !== senderId && chat.user_two !== senderId) {
      return res
        .status(403)
        .json({ message: MESSAGES.ERROR.USER_UNAUTHORIZED, success: false });
    }

    // check if blocked
    const chatSetting = await findOneChatSetting({
      where: { user_id: { [Op.ne]: senderId }, chat_id: chatId },
    });

    if (chatSetting?.is_block) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.USER_BLOCKED, success: false });
    }

    const receiverId =
      chat.user_one === senderId ? chat.user_two : chat.user_one;
    const [receiver, subscription] = await Promise.all([
      findUserByKey(receiverId),
      findOneSubscription({
        where: {
          user_id: senderId,
          status: "Active",
          end_date: { [Op.gt]: new Date() },
        },
        include: [
          { model: Plans, attributes: ["id", "type", "daily_message_limit"] },
        ],
      }),
    ]);

    // Daily message limit logic
    let dailyLimit = 10;
    if (subscription?.Plan) {
      dailyLimit = subscription.Plan.daily_message_limit;
    } else {
      const freePlan = await findOnePlan({ where: { type: "Free" } });
      dailyLimit = freePlan?.daily_message_limit ?? 10;
    }

    const today = new Date().toISOString().split("T")[0];
    const tempKey = `user:${senderId}:chat:${chatId}:${today}`;
    const currCount = await increment(tempKey);

    if (currCount === 1) await expireKey(tempKey, 86400);

    if (dailyLimit !== null && currCount > dailyLimit) {
      return res
        .status(403)
        .json({ message: MESSAGES.ERROR.DAILY_MESSAGE_LIMIT, success: false });
    }

    // Handle attachments
    let images = [];
    if (req.files && req.files.length > 0) {
      const uploads = await Promise.all(
        req.files.map(async (file) => await uploadToCloudinary(file)),
      );
      images = uploads.map((img) => img.secure_url);

      await createNotification({
        sender_id: senderId,
        receiver_id: receiverId,
        chat_id: chatId,
        title: encryptMessage("Sent File"),
        message: `${user.name} sent you a file`,
        seen: false,
      });
    }

    // Validate reply
    if (replyTo) {
      const parentMsg = await findOneMessage({
        where: { id: replyTo, chat_id: chatId },
      });
      if (!parentMsg) {
        return res.status(400).json({
          message: MESSAGES.ERROR.INVALID_REPLY_MESSAGE,
          success: false,
        });
      }
    }

    const encryptedText = encryptMessage(text);

    // Create message
    const msg = await createMessage({
      sender_id: senderId,
      receiver_id: receiverId,
      chat_id: chatId,
      text: encryptedText,
      image_url: images.length > 0 ? JSON.stringify(images) : null,
      reply_to: Number(replyTo) || null,
    });

    if (!msg) throw new Error("Failed to create message");

    // Side effects & Updates
    const unreadCount = await increment(`unread:${receiverId}:${chatId}`);

    const [chatData] = await Promise.all([
      findOneChat({
        where: { id: chatId },
        include: [
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
      }),
      updateChat(
        {
          last_message: encryptedText,
          last_message_time: new Date(),
          updatedAt: new Date(),
        },
        { where: { id: chatId } },
      ),
      incrementChatSetting(
        { unread_count: 1 },
        { where: { chat_id: chatId, user_id: receiverId } },
      ),
      bulkCreateMessageSetting([
        { msg_id: msg.id, chat_id: chatId, user_id: msg.sender_id },
        { msg_id: msg.id, chat_id: chatId, user_id: msg.receiver_id },
      ]),
    ]);

    // Socket & Notification emits
    io.to(receiverId.toString()).emit("unread_count", {
      chatId,
      unread_count: Number(unreadCount),
    });

    if (chatData) {
      chatData.last_message = decryptMessage(chatData.last_message);
      io.to(receiverId.toString()).emit("chat_update", {
        chat: chatData,
        unread_count: Number(unreadCount),
      });
    }

    const responseMsg = {
      ...msg.toJSON(),
      text: decryptMessage(msg.text),
      image_url: msg.image_url ? JSON.parse(msg.image_url) : [],
    };

    await publisher.publish("MESSAGES", JSON.stringify(responseMsg));
    io.to(receiverId.toString()).emit("new_noti", {
      message: `${user.name} sent you a message`,
      chatId,
    });

    if (receiver?.fcm_token) {
      await sendFCMNotification(
        receiver.fcm_token,
        `New message from ${user.name}`,
        text ? text.substring(0, 50) : "Sent a file",
        { chatId: chatId.toString(), path: "chat" },
      );
    }

    if (text) {
      await createNotification({
        sender_id: senderId,
        receiver_id: receiverId,
        chat_id: chatId,
        title: msg.text,
        message: `You have a new message from ${user.name}`,
        seen: false,
      });
    }

    return res.status(200).json({
      message: MESSAGES.MESSAGE.SEND_MESSAGE_SUCCESS,
      success: true,
      msg: responseMsg,
    });
  } catch (error) {
    next(error);
  }
};

// get messages
// GET /api/v1/message/:chatId
// private access
const getMessage = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    logger.info(`${req.method} ${req.url}`);

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const PageOffset = (pageNumber - 1) * pageSize;

    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.CHAT_NOT_FOUND, success: false });
    }

    // valid user or not
    if (chat.user_one !== userId && chat.user_two !== userId) {
      return res
        .status(403)
        .json({ message: MESSAGES.ERROR.USER_UNAUTHORIZED, success: false });
    }

    await updateNotification(
      { seen: true },
      {
        where: { receiver_id: userId },
      },
    );

    // using chat id fetch all messages
    const { count, rows } = await db.Message.findAndCountAll({
      where: {
        chat_id: chatId,
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
          // db.sequelize.literal(`
          //     NOT EXISTS (
          //       SELECT 1 FROM chat_settings
          //       WHERE chat_id = ${chatId}
          //       AND user_id = ${userId}
          //       AND is_block = true
          //     )
          //   `),
        ],
      },
      include: [
        {
          model: Users,
          as: "sender",
          attributes: ["id", "name", "photo"],
        },
        {
          model: MessageSetting,
          as: "setting",
          where: { user_id: userId },
          attributes: ["is_star"],
        },
        {
          model: Reaction,
          as: "reactions",
          attributes: ["id", "user_id", "emoji"],
          include: [
            {
              model: Users,
              as: "reactor",
              attributes: ["id", "name", "photo"],
            },
          ],
        },
      ],

      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: PageOffset,
    });

    rows.forEach((item) => {
      if (item.text && !item.delete_for_all) {
        try {
          item.text = decryptMessage(item.text);
        } catch (error) {
          item.text = "Error decrypting message";
        }
      } else if (item.delete_for_all) {
        item.text = "This message was deleted";
      }
    });

    await updateMessage(
      { status: "seen" },
      { where: { chat_id: chatId, receiver_id: userId } },
    );

    await clearCacheData(`unread:${userId}:${chatId}`);

    return res.status(200).json({
      message: MESSAGES.MESSAGE.GET_ALL_MESSAGES_SUCCESS,
      success: true,
      messages: rows.reverse(),
      totalMessages: count,
      currentPage: pageNumber,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    next(error);
  }
};

// pin message
// PATCH /api/v1/message/pin/:msgId
// private access
const pinMessage = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId } = req.body;
    const { msgId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    if (!chatId) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.CHAT_ID_REQUIRED, success: false });
    }

    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.CHAT_NOT_FOUND, success: false });
    }

    const msg = await findMessageByKey(msgId);

    if (!msg) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.MESSAGE_NOT_FOUND, success: false });
    }

    if (msg.sender_id !== userId && msg.receiver_id !== userId) {
      return res
        .status(401)
        .json({ message: MESSAGES.ERROR.USER_UNAUTHORIZED, success: false });
    }

    const subscription = await findOneSubscription({
      where: { user_id: userId },
    });

    if (!subscription) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.YOUR_ARE_NOT_SUB, success: false });
    }

    if (msg.is_pin === true) {
      await updateMessage(
        { is_pin: false },
        {
          where: {
            id: msgId,
            chat_id: chatId,
          },
        },
      );

      return res.status(200).json({
        message: MESSAGES.MESSAGE.MESSAGE_UNPIN_SUCCESS,
        success: true,
      });
    }

    const pinLimit = subscription.plan_id === 2 ? 3 : 1;

    const pinCount = await countMessages({
      where: {
        chat_id: chatId,
        is_pin: true,
        delete_for_all: false,
      },
    });

    if (pinCount >= pinLimit) {
      return res.status(400).json({
        message: `You can only pin ${pinLimit} messages`,
        success: false,
      });
    }

    await updateMessage(
      { is_pin: true },
      {
        where: {
          id: msgId,
          chat_id: chatId,
          delete_for_all: false,
        },
      },
    );

    return res.status(200).json({
      message: MESSAGES.MESSAGE.MESSAGE_PIN_SUCCESS,
      success: true,
      data: msg,
    });
  } catch (error) {
    next(error);
  }
};

// delete message for all
// PATCH /api/v1/message/delete/all/:msgId
// private access
const deleteForAll = async (req, res, next) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    const msg = await findMessageByKey(msgId);

    if (!msg) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.MESSAGE_NOT_FOUND, success: false });
    }

    if (msg.sender_id !== userId) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.USER_UNAUTHORIZED, success: false });
    }

    msg.delete_for_all = true;
    await msg.save();

    const lastMsg = await findOneMessage({
      where: { chat_id: msg.chat_id, delete_for_all: false },
      order: [["createdAt", "DESC"]],
    });

    if (lastMsg) {
      await updateChat(
        { last_message: lastMsg.text, last_message_time: lastMsg.createdAt },
        { where: { id: msg.chat_id } },
      );
    } else {
      await updateChat(
        { last_message: null, last_message_time: new Date() },
        { where: { id: msg.chat_id } },
      );
    }

    return res.status(200).json({
      message: MESSAGES.MESSAGE.MESSAGE_DELETE_FOR_EVERYONE,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// search message with in chat
// GET /api/v1/message/search/msg
// private access
const searchMessageInChat = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId, text, limit = 20 } = req.query;

    logger.info(`${req.method} ${req.url}`);

    if (!chatId) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.CHAT_ID_REQUIRED, success: false });
    }

    if (!text) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.TEXT_REQUIRED, success: false });
    }

    const pageSize = parseInt(limit);

    const msg = await findAllMessage({
      where: {
        chat_id: chatId,
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
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
      attributes: ["id", "text", "delete_for_all"],
    });

    const results = [];

    msg.forEach((message, idx) => {
      if (message.delete_for_all) return;
      if (!message.text) return;

      const decrypted = decryptMessage(message.text);

      if (decrypted.toLowerCase().includes(text.toLowerCase())) {
        const pageNumber = Math.floor(idx / pageSize) + 1;

        results.push({
          msgId: message.id,
          text: decrypted,
          page: pageNumber,
        });
      }
    });

    return res.status(200).json({
      message: MESSAGES.MESSAGE.SEARCH_MESSAGE_SUCCESS,
      success: true,
      msg: results,
      totalResults: results.length,
      totalPages: Math.ceil(results.length / pageSize),
    });
  } catch (error) {
    next(error);
  }
};

// get all star messages
// GET /api/v2/message/get-star-message
// private access
const getAllStarMessages = async (req, res, next) => {
  try {
    const userId = req.id;

    const { page = 1, limit = 10 } = req.query;

    logger.info(`${req.method} ${req.url}`);

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const PageOffset = (pageNumber - 1) * pageSize;

    const starMsg = await findAllMessage({
      where: { delete_for_all: false },
      include: [
        {
          model: MessageSetting,
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
      order: [["id", "DESC"]],
      limit: Number(pageSize),
      offset: PageOffset,
    });

    if (!starMsg) {
      return res
        .status(400)
        .json({ message: MESSAGES.MESSAGE.NO_STAR_MESSAGE, success: false });
    }

    starMsg.forEach((item) => {
      item.text = decryptMessage(item.text);
    });

    return res.status(200).json({
      message: MESSAGES.MESSAGE.GEL_ALL_STAR_MSG,
      success: true,
      data: starMsg,
    });
  } catch (error) {
    next(error);
  }
};

// get all star messages with in chat
// GET /api/v1/message/get-star-message-in-chat/:chatId
// private access
const getAllStarMessageWithInChat = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId, page = 1, limit = 10 } = req.params;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const PageOffset = (pageNumber - 1) * pageSize;

    logger.info(`${req.method} ${req.url}`);

    if (!chatId) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.CHAT_ID_REQUIRED, success: false });
    }

    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.CHAT_NOT_FOUND, success: false });
    }

    const starMsg = await findAllMessage({
      where: { chat_id: chatId, delete_for_all: false },
      include: [
        {
          model: MessageSetting,
          as: "setting",
          where: {
            user_id: userId,
            chat_id: chatId,
            is_star: true,
            delete_for_me: false,
          },
          attributes: ["id", "is_star"],
        },
        {
          model: Users,
          as: "sender",
          attributes: ["id", "name", "photo"],
        },
      ],
      attributes: ["id", "text"],
      limit: pageSize,
      offset: PageOffset,
      order: [["id", "DESC"]],
    });

    starMsg.forEach((msg) => {
      msg.text = decryptMessage(msg.text);
    });

    if (!starMsg) {
      return res
        .status(400)
        .json({ message: MESSAGES.MESSAGE.NO_STAR_MESSAGE, success: false });
    }

    return res.status(200).json({
      message: MESSAGES.MESSAGE.GEL_ALL_STAR_MSG,
      success: true,
      data: starMsg,
    });
  } catch (error) {
    next(error);
  }
};

// edit message text
// PATCH /api/v1/message/chat/:chatId/edit-message/:msgId
// private access
const editMessage = async (req, res, next) => {
  try {
    const userId = req.id;
    const { text } = req.body;
    const { chatId, msgId } = req.params;
    const io = getIo();

    logger.info(`${req.method} ${req.url}`);

    if (!msgId && !chatId) {
      return res.status(400).json({
        message: MESSAGES.ERROR.CHAT_AND_MESSAGE_ID_REQUIRED,
        success: false,
      });
    }

    const chat = await findChatByKey(chatId);
    const msg = await findMessageByKey(msgId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.CHAT_NOT_FOUND, success: false });
    }

    if (!msg) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.MESSAGE_NOT_FOUND, success: false });
    }

    if (userId !== msg.sender_id) {
      return res
        .status(401)
        .json({ message: MESSAGES.ERROR.NOT_AUTHORIZED, success: false });
    }

    const updatedMsg = await updateMessage(
      { text: encryptMessage(text) },
      { where: { id: msgId, sender_id: userId, chat_id: chatId } },
    );

    if (updatedMsg.length > 0) {
      const updatedMessage = await findOneMessage({
        where: {
          id: msgId,
          chat_id: chatId,
        },
      });

      io.to(msg.receiver_id.toString()).emit("edit_msg", {
        id: msg.id,
        text: text,
      });

      return res.status(200).json({
        message: MESSAGES.MESSAGE.MESSAGE_UPDATE_SUCCESS,
        success: true,
        data: {
          id: updatedMessage.id,
          text: decryptMessage(updatedMessage.text),
        },
      });
    }

    return res
      .status(400)
      .json({ message: MESSAGES.ERROR.SOMETHING_WENT_WRONG, success: false });
  } catch (error) {
    next(error);
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
  editMessage,
};
