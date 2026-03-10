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
const { incrementChatSetting } = require("../services/chatSettingServices");
const {
  clearCacheData,
  setCacheData,
  getCacheData,
  increment,
  expireKey,
} = require("../redis/redis.client");
const { findOneSubscription } = require("../services/subscriptionService");
const { Plans, findOnePlan } = require("../services/planServices");
const { publisher } = require("../config/redis");

// send message
// POST /api/v1/message/send
// private access
const sendMessage = async (req, res, next) => {
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

    const subscription = await findOneSubscription({
      where: {
        user_id: senderId,
        status: "Active",
        end_date: { [Op.gt]: new Date() },
      },
      include: [
        { model: Plans, attributes: ["id", "type", "daily_message_limit"] },
      ],
    });

    let dailyMessage = 10;

    const freePlan = await findOnePlan({ where: { type: "Free" } });

    if (
      !subscription ||
      subscription.status !== "Active" ||
      !subscription.end_date ||
      new Date(subscription.end_date) <= new Date()
    ) {
      dailyMessage = freePlan?.daily_message_limit ?? 10;
    } else if (subscription.Plan) {
      dailyMessage = subscription.Plan.daily_message_limit;
    }

    const tempKey = `user:${senderId}:${new Date().toISOString().split("T")[0]}`;

    const currCount = await increment(tempKey);

    if (currCount === 1) {
      await expireKey(tempKey, 86400);
    }

    if (dailyMessage !== null && currCount > dailyMessage) {
      return res
        .status(403)
        .json({ message: "Daily message limit reached.", success: false });
    }

    let images = [];

    if (req.files && req.files.length > 0) {
      await clearCacheData(`noti:${receiverId}`);
      await clearCacheData(`media:${senderId}`);
      await clearCacheData(`docs:${senderId}`);
      await clearCacheData(`mediaInChat:${chatId}:${senderId}`);
      await clearCacheData(`docsInChat:${chatId}:${senderId}`);

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

    const encryptedText = encryptMessage(text);

    // create new message
    const msg = await createMessage({
      sender_id: senderId,
      receiver_id: receiverId,
      chat_id: chatId,
      text: encryptedText,
      image_url: images.length > 0 ? JSON.stringify(images) : null,
      reply_to: Number(replyTo) || null,
    });

    if (msg) {
      await increment(`unread:${receiverId}:${chatId}`);
      console.log(
        "Set cache for unread count",
        "receiver",
        receiverId,
        "chat id",
        chatId,
      );

      const unreadCount = await getCacheData(`unread:${receiverId}:${chatId}`);

      io.to(receiverId.toString()).emit("unread_count", {
        chatId: chatId,
        unread_count: Number(unreadCount),
      });

      const chatData = await findOneChat({
        where: {
          [Op.or]: [{ user_one: senderId }, { user_two: senderId }],
          id: chatId,
        },
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
      });

      const decryptedText = decryptMessage(chatData.last_message);

      chatData.last_message = decryptedText;

      io.to(receiverId.toString()).emit("chat_update", {
        chat: chatData,
        unread_count: Number(unreadCount),
      });
    }

    await updateChat(
      { last_message: msg.text, last_message_time: new Date() },
      { where: { id: chatId } },
    );

    if (msg) {
      await incrementChatSetting(
        { unread_count: 1 },
        { where: { chat_id: chatId, user_id: receiverId } },
      );
    }

    await bulkCreateMessageSetting([
      { msg_id: msg.id, chat_id: chatId, user_id: msg.sender_id },
      { msg_id: msg.id, chat_id: chatId, user_id: msg.receiver_id },
    ]);

    const responseMsg = {
      ...msg.toJSON(),
      text: decryptMessage(msg.text),
      image_url: msg.image_url ? JSON.parse(msg.image_url) : [],
    };

    console.log("==============================");
    console.log("receiver id", receiverId);
    console.log("==============================");

    await publisher.publish("MESSAGES", JSON.stringify(responseMsg));
    console.log("Message publish on redis");

    io.to(receiverId.toString()).emit("new_noti", {
      message: `${user.name} sent you a message`,
      chatId: chatId,
    });

    if (text !== null && text !== "") {
      await clearCacheData(`noti:${receiverId}`);
      await createNotification({
        sender_id: senderId,
        receiver_id: receiverId,
        chat_id: chatId,
        title: msg.text,
        message: `You have a new message from ${user.name}`,
        seen: false,
      });
    }

    await updateChat({ updatedAt: new Date() }, { where: { id: chatId } });

    res.status(200).json({
      message: "Message created ",
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
    const { page = 1, limit = 10 } = req.query;

    logger.info(`${req.method} ${req.url}`);

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const PageOffset = (pageNumber - 1) * pageSize;

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
          db.sequelize.literal(`
              NOT EXISTS (
                SELECT 1 FROM chat_settings
                WHERE chat_id = ${chatId}
                AND user_id = ${userId}
                AND is_block = true
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
          model: MessageSetting,
          as: "setting",
          where: { user_id: userId },
          attributes: ["is_star"],
        },
      ],

      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: PageOffset,
    });

    rows.forEach((item) => {
      item.text = decryptMessage(item.text);
    });

    res.status(200).json({
      message: "Fetched all messages ",
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
        .json({ message: "Chat id required", success: false });
    }

    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "Chat not found", success: false });
    }

    const msg = await findMessageByKey(msgId);

    if (!msg) {
      return res.status(404).json({ message: "Msg not found", success: false });
    }

    if (msg.sender_id !== userId && msg.receiver_id !== userId) {
      return res
        .status(401)
        .json({ message: "Your not authorized", success: false });
    }

    await clearCacheData(`star:${userId}`);
    await clearCacheData(`starInChat:${msg.chat_id}:${userId}`);
    await clearCacheData(`media:${userId}`);
    await clearCacheData(`docs:${userId}`);
    await clearCacheData(`mediaInChat:${msg.chat_id}:${userId}`);
    await clearCacheData(`docsInChat:${msg.chat_id}:${userId}`);

    const subscription = await findOneSubscription({
      where: { user_id: userId },
    });

    if (!subscription) {
      return res
        .status(404)
        .json({ message: "There no subscription for you", success: false });
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
        message: "Message unpinned successfully",
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

    return res
      .status(200)
      .json({ message: "Msg pinned successfully", success: true });
  } catch (error) {
    next(error);
  }
};

// delete message for all
// DELETE /api/v1/message/delete/all/:msgId
// private access
const deleteForAll = async (req, res, next) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;
    const io = getIo();

    logger.info(`${req.method} ${req.url}`);

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

    await clearCacheData(`star:${userId}`);
    await clearCacheData(`starInChat:${msg.chat_id}:${userId}`);
    await clearCacheData(`media:${userId}`);
    await clearCacheData(`docs:${userId}`);
    await clearCacheData(`mediaInChat:${msg.chat_id}:${userId}`);
    await clearCacheData(`docsInChat:${msg.chat_id}:${userId}`);

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
    next(error);
  }
};

// search message with in chat
// GET /api/v1/message/search/msg
// private access
const searchMessageInChat = async (req, res, next) => {
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
    });

    const filtered = msg
      .filter((msg) => msg.text)
      .map((msg) => {
        const decryptedText = decryptMessage(msg.text);
        return { ...msg.toJSON(), text: decryptedText };
      })
      .filter((msg) => msg.text.toLowerCase().includes(text.toLowerCase()))
      .slice(0, Number(limit));

    res
      .status(200)
      .json({ message: "search message", success: true, msg: filtered });
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

    logger.info(`${req.method} ${req.url}`);

    const cacheData = await getCacheData(`star:${userId}`);

    if (cacheData) {
      cacheData.forEach((item) => {
        item.text = decryptMessage(item.text);
      });

      return res.status(200).json({
        message: "Started messages fetch successfully",
        success: true,
        data: cacheData,
      });
    }

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
      order: [["createdAt", "DESC"]],
    });

    await setCacheData(`star:${userId}`, starMsg);

    starMsg.forEach((item) => {
      item.text = decryptMessage(item.text);
    });

    res.status(200).json({
      message: "Started messages fetch successfully",
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
    const { chatId } = req.params;
    // const { page = 1, limit = 10 } = req.query;

    // const pageNumber = parseInt(page);
    // const pageSize = parseInt(limit);

    // const starOffset = (pageNumber - 1) * pageSize;

    logger.info(`${req.method} ${req.url}`);

    if (!chatId) {
      return res
        .status(400)
        .json({ message: "Chat id required", success: false });
    }

    const chat = await findChatByKey(chatId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "chat not found", success: false });
    }

    const cacheData = await getCacheData(`starInChat:${chatId}:${userId}`);

    if (cacheData) {
      cacheData.forEach((item) => {
        cacheData.text = decryptMessage(item.text);
      });

      return res.status(200).json({
        message: "Fetch all star message in chat successfully",
        success: true,
        data: cacheData,
      });
    }

    const starMsg = await findAllMessage({
      where: { chat_id: chatId, delete_for_all: false },
      include: [
        {
          model: MessageSetting,
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

    await setCacheData(`starInChat:${chatId}:${userId}`, starMsg);

    starMsg.forEach((msg) => {
      msg.text = decryptMessage(msg.text);
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

    logger.info(`${req.method} ${req.url}`);

    if (!msgId && !chatId) {
      return res
        .status(400)
        .json({ message: "Chat and Message Id required", success: false });
    }

    const chat = await findChatByKey(chatId);
    const msg = await findMessageByKey(msgId);

    if (!chat) {
      return res
        .status(404)
        .json({ message: "Chat not found", success: false });
    }

    if (!msg) {
      return res.status(404).json({ message: "Msg not found", success: false });
    }

    if (userId !== msg.sender_id) {
      return res
        .status(401)
        .json({ message: "Not Authorized", success: false });
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

      return res.status(200).json({
        message: "Message updated successfully",
        success: true,
        data: {
          id: updatedMessage.id,
          text: decryptMessage(updatedMessage.text),
        },
      });
    }

    res.status(400).json({ message: "Something went wrong", success: false });
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
