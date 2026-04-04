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
const { updateNotification } = require("../services/notificationServices");
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
const { notificationQueue, aiQueue } = require("../redis/queues");

// send message
// POST /api/v1/message/send
// private access
const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.id;
    const { chatId, text, replyTo, gif_url } = req.body;
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

    // check if chat is blocked by either user
    const chatSetting = await findOneChatSetting({
      where: { chat_id: chatId, is_block: true },
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

    // Validate gif_url if provided — must be a valid HTTP/HTTPS URL
    if (gif_url) {
      try {
        const parsed = new URL(gif_url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return res.status(400).json({
            message: MESSAGES.ERROR.INVALID_GIF_URL,
            success: false,
          });
        }
      } catch {
        return res
          .status(400)
          .json({ message: MESSAGES.ERROR.INVALID_GIF_URL, success: false });
      }
    }

    // Handle file attachments — stored as [{ url, type, name }]
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = await Promise.all(
        req.files.map(async (file) => await uploadToCloudinary(file)),
      );

      await notificationQueue.add("sent-file-notification", {
        sender_id: senderId,
        receiver_id: receiverId,
        chat_id: chatId,
        title: encryptMessage("Sent File"),
        message: `${user.name} sent you a file`,
        seen: false,
      });
    }

    // Derive last-message preview from the first attachment type
    const getAttachmentPreview = (attachments) => {
      if (!attachments.length) return "Sent a file";
      const t = attachments[0].type;
      if (t === "image") return "📷 Photo";
      if (t === "video") return "🎥 Video";
      if (t === "audio") return "🎧 Audio";
      if (t === "pdf") return "📄 PDF";
      if (t === "document") return "📎 Document";
      return "📎 File";
    };

    // Validate reply
    let parentMsgData = null;
    if (replyTo) {
      const parentMsg = await findOneMessage({
        where: { id: replyTo, chat_id: chatId },
        include: [{ model: Users, as: "sender", attributes: ["id", "name"] }],
        attributes: ["id", "text", "delete_for_all", "image_url", "gif_url"],
      });
      parentMsgData = parentMsg;
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
      image_url: attachments.length > 0 ? JSON.stringify(attachments) : null,
      gif_url: gif_url || null,
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
          last_message: encryptMessage(
            text
              ? text
              : gif_url
                ? "🎬 GIF"
                : getAttachmentPreview(attachments),
          ),
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
      // Overwrite fetched stale data with the new message we just sent
      chatData.last_message = text
        ? text
        : gif_url
          ? "🎬 GIF"
          : getAttachmentPreview(attachments);
      chatData.last_message_time = new Date();

      // Update receiver's chat list (with their unread count)
      io.to(receiverId.toString()).emit("chat_update", {
        chat: chatData,
        unread_count: Number(unreadCount),
      });

      // Update sender's chat list in real time (unread_count is 0 for sender)
      io.to(senderId.toString()).emit("chat_update", {
        chat: chatData,
        unread_count: 0,
      });
    }

    const responseMsg = {
      ...msg.toJSON(),
      text: decryptMessage(msg.text),
      // image_url is now [{url, type, name}] — parse if present
      image_url: msg.image_url ? JSON.parse(msg.image_url) : [],
      gif_url: msg.gif_url || null,
    };

    if (parentMsgData) {
      responseMsg.replyMessage = parentMsgData.toJSON();

      if (
        chatSetting?.is_block &&
        responseMsg.replyMessage.sender &&
        responseMsg.replyMessage.sender.id !== senderId
      ) {
        responseMsg.replyMessage.sender.name = "Instagrammer";
      }

      if (
        responseMsg.replyMessage.text &&
        !responseMsg.replyMessage.delete_for_all
      ) {
        try {
          responseMsg.replyMessage.text = decryptMessage(
            responseMsg.replyMessage.text,
          );
        } catch (error) {
          responseMsg.replyMessage.text = "Error decrypting message";
        }
      } else if (responseMsg.replyMessage.delete_for_all) {
        responseMsg.replyMessage.text = "This message was deleted";
      }
    }

    await publisher.publish("MESSAGES", JSON.stringify(responseMsg));

    if (!receiver?.is_online) {
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
        await notificationQueue.add("new-message-notification", {
          sender_id: senderId,
          receiver_id: receiverId,
          chat_id: chatId,
          title: msg.text,
          message: `You have a new message from ${user.name}`,
          seen: false,
          msg_id: msg.id,
        });

        const isValidLength = text.length >= 0 && text.length < 80;
        const tenMinutes = 10 * 60 * 1000;
        const isFirstOrInactive =
          !chat.last_message_time ||
          new Date() - new Date(chat.last_message_time) > tenMinutes;

        if (isValidLength && isFirstOrInactive) {
          await aiQueue.add("reply-suggestions", {
            chatId,
            messageId: msg.id,
            receiverId,
            text,
          });
        }
      }
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
        {
          model: db.Message,
          as: "replyMessage",
          attributes: ["id", "text", "delete_for_all", "image_url", "gif_url"],
          include: [
            {
              model: Users,
              as: "sender",
              attributes: ["id", "name"],
            },
          ],
        },
      ],

      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: PageOffset,
    });

    const otherUserId =
      chat.user_one === userId ? chat.user_two : chat.user_one;

    // Check if the other user has blocked the current user to mask their profile
    const otherUserChatSetting = await findOneChatSetting({
      where: { chat_id: chatId, user_id: otherUserId, is_block: true },
    });
    const isBlockedByThem = !!otherUserChatSetting;

    rows.forEach((item) => {
      // Mask sender if blocked by them
      if (isBlockedByThem && item.sender && item.sender.id === otherUserId) {
        item.sender.name = "Instagrammer";
        item.sender.photo =
          "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
      }

      // Mask reactors if blocked by them
      if (isBlockedByThem && item.reactions && item.reactions.length > 0) {
        item.reactions.forEach((reaction) => {
          if (reaction.reactor && reaction.reactor.id === otherUserId) {
            reaction.reactor.name = "Instagrammer";
            reaction.reactor.photo =
              "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
          }
        });
      }

      if (item.text && !item.delete_for_all) {
        try {
          item.text = decryptMessage(item.text);
        } catch (error) {
          item.text = "Error decrypting message";
        }
      } else if (item.delete_for_all) {
        item.text = "This message was deleted";
      }

      if (item.replyMessage) {
        // Mask replied message sender if blocked by them
        if (
          isBlockedByThem &&
          item.replyMessage.sender &&
          item.replyMessage.sender.id === otherUserId
        ) {
          item.replyMessage.sender.name = "Instagrammer";
        }
        if (item.replyMessage.text && !item.replyMessage.delete_for_all) {
          try {
            item.replyMessage.text = decryptMessage(item.replyMessage.text);
          } catch (error) {
            item.replyMessage.text = "Error decrypting message";
          }
        } else if (item.replyMessage.delete_for_all) {
          item.replyMessage.text = "This message was deleted";
        }
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

    // check if chat is blocked by either user
    const chatSetting = await findOneChatSetting({
      where: { chat_id: chatId, is_block: true },
    });

    if (chatSetting?.is_block) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.USER_BLOCKED, success: false });
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

// get pin messages
// GET /api/v1/message/get-pin-messages/:chatId
// private access
const getPinMessages = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;
    const { limit = 10 } = req.query;

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

    // check if user is part of this chat
    if (chat.user_one !== userId && chat.user_two !== userId) {
      return res
        .status(403)
        .json({ message: MESSAGES.ERROR.USER_UNAUTHORIZED, success: false });
    }

    // check if chat is blocked by either user
    const chatSetting = await findOneChatSetting({
      where: { chat_id: chatId, is_block: true },
    });

    if (chatSetting?.is_block) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.USER_BLOCKED, success: false });
    }

    const pageSize = parseInt(limit);

    const pinMessages = await findAllMessage({
      where: {
        chat_id: chatId,
        is_pin: true,
        delete_for_all: false,
        [Op.and]: [
          db.sequelize.literal(`
            NOT EXISTS (
              SELECT 1 FROM message_settings ms
              WHERE ms.msg_id = Message.id
              AND ms.user_id = ${userId}
              AND ms.delete_for_me = true
            )
          `),
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    const data = await Promise.all(
      pinMessages.map(async (msg) => {
        const newerCount = await countMessages({
          where: {
            chat_id: chatId,
            createdAt: { [Op.gt]: msg.createdAt },
            [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
            [Op.and]: [
              db.sequelize.literal(`
                NOT EXISTS (
                  SELECT 1 FROM message_settings ms
                  WHERE ms.msg_id = Message.id
                  AND ms.user_id = ${userId}
                  AND ms.delete_for_me = true
                )
              `),
            ],
          },
        });

        const page = Math.floor(newerCount / pageSize) + 1;

        let decryptedText = null;
        if (msg.text) {
          try {
            decryptedText = decryptMessage(msg.text);
          } catch {
            decryptedText = "Error decrypting message";
          }
        }

        return {
          id: msg.id,
          chat_id: msg.chat_id,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          text: decryptedText,
          image_url: msg.image_url ? JSON.parse(msg.image_url) : [],
          is_pin: msg.is_pin,
          is_edited: msg.is_edited,
          createdAt: msg.createdAt,
          page,
        };
      }),
    );

    return res.status(200).json({
      message: MESSAGES.MESSAGE.GET_PIN_MESSAGES_SUCCESS,
      success: true,
      data,
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
    msg.text = null;
    msg.image_url = null;
    msg.gif_url = null;
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
      attributes: ["id", "text", "delete_for_all", "is_edited"],
    });

    const results = [];

    msg.forEach((message, idx) => {
      if (message.delete_for_all) return;
      if (!message.text) return;

      const decrypted = decryptMessage(message.text);

      if (decrypted.includes(text)) {
        const pageNumber = Math.floor(idx / pageSize) + 1;

        results.push({
          msgId: message.id,
          text: decrypted,
          is_edited: message.is_edited,
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
          attributes: ["chat_id", "updatedAt"],
        },
        {
          model: Users,
          as: "sender",
          attributes: ["id", "name", "photo"],
        },
      ],
      attributes: ["id", "text"],
      order: [[{ model: MessageSetting, as: "setting" }, "updatedAt", "DESC"]],
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
          attributes: ["id", "is_star", "updatedAt"],
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
      order: [[{ model: MessageSetting, as: "setting" }, "updatedAt", "DESC"]],
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

    // check if chat is blocked by either user
    const chatSetting = await findOneChatSetting({
      where: { chat_id: chatId, is_block: true },
    });

    if (chatSetting?.is_block) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.USER_BLOCKED, success: false });
    }

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

    // const subscription = await findOneSubscription({
    //   where: {
    //     user_id: userId,
    //     status: "Active",
    //     end_date: { [Op.gt]: new Date() },
    //   },
    // });

    // if (!subscription) {
    //   return res
    //     .status(404)
    //     .json({ message: MESSAGES.ERROR.YOUR_ARE_NOT_SUB, success: false });
    // }

    const updatedMsg = await updateMessage(
      { text: encryptMessage(text), is_edited: true },
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
        is_edited: true,
      });

      io.to(msg.sender_id.toString()).emit("edit_msg", {
        id: msg.id,
        text: text,
        is_edited: true,
      });

      return res.status(200).json({
        message: MESSAGES.MESSAGE.MESSAGE_UPDATE_SUCCESS,
        success: true,
        data: {
          id: updatedMessage.id,
          text: decryptMessage(updatedMessage.text),
          is_edited: updatedMessage.is_edited,
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

// forward message
// POST /api/v1/message/forward
// private access
const forwardMessage = async (req, res, next) => {
  try {
    const senderId = req.id;
    const { msgId, chatIds } = req.body;
    const io = getIo();

    logger.info(`${req.method} ${req.url}`);

    // Guard: msgId required
    if (!msgId) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.MESSAGE_ID_REQUIRED, success: false });
    }

    // Guard: chatIds must be a non-empty array
    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({
        message: MESSAGES.ERROR.CHAT_IDS_MUST_BE_ARRAY,
        success: false,
      });
    }

    // Guard: max 5 chats per forward
    if (chatIds.length > 5) {
      return res.status(400).json({
        message: MESSAGES.ERROR.FORWARD_LIMIT_EXCEEDED,
        success: false,
      });
    }

    // Fetch the source message
    const sourceMsg = await findMessageByKey(msgId);

    if (!sourceMsg) {
      return res
        .status(404)
        .json({ message: MESSAGES.ERROR.MESSAGE_NOT_FOUND, success: false });
    }

    // Guard: cannot forward a deleted message
    if (sourceMsg.delete_for_all) {
      return res.status(400).json({
        message: MESSAGES.ERROR.CANNOT_FORWARD_DELETED,
        success: false,
      });
    }

    // Guard: source must have actual content
    const hasText = !!sourceMsg.text;
    const hasImage = !!sourceMsg.image_url;
    const hasGif = !!sourceMsg.gif_url;

    if (!hasText && !hasImage && !hasGif) {
      return res.status(400).json({
        message: MESSAGES.ERROR.NO_CONTENT_TO_FORWARD,
        success: false,
      });
    }

    // Decrypt source text once — re-encrypt per new message below
    let plainText = null;
    if (hasText) {
      try {
        plainText = decryptMessage(sourceMsg.text);
      } catch {
        plainText = null;
      }
    }

    const [senderUser, subscription] = await Promise.all([
      findUserByKey(senderId),
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

    // Determine daily limit for sender (same logic as sendMessage)
    let dailyLimit = 10;
    if (subscription?.Plan) {
      dailyLimit = subscription.Plan.daily_message_limit;
    } else {
      const freePlan = await findOnePlan({ where: { type: "Free" } });
      dailyLimit = freePlan?.daily_message_limit ?? 10;
    }

    const forwarded = [];
    const failed = [];

    // Process each target chat
    for (const chatId of chatIds) {
      try {
        // 1. Chat must exist
        const chat = await findChatByKey(chatId);
        if (!chat) {
          failed.push({ chatId, reason: "Chat not found" });
          continue;
        }

        // 2. Sender must be a member of the target chat
        if (chat.user_one !== senderId && chat.user_two !== senderId) {
          failed.push({ chatId, reason: "You are not a member of this chat" });
          continue;
        }

        // 3. Target chat must not be blocked
        const chatSetting = await findOneChatSetting({
          where: { chat_id: chatId, is_block: true },
        });
        if (chatSetting?.is_block) {
          failed.push({ chatId, reason: "Chat is blocked" });
          continue;
        }

        const receiverId =
          chat.user_one === senderId ? chat.user_two : chat.user_one;

        // 4. Daily message limit per target chat
        const today = new Date().toISOString().split("T")[0];
        const tempKey = `user:${senderId}:chat:${chatId}:${today}`;
        const currCount = await increment(tempKey);
        if (currCount === 1) await expireKey(tempKey, 86400);

        if (dailyLimit !== null && currCount > dailyLimit) {
          failed.push({ chatId, reason: "Daily message limit reached" });
          continue;
        }

        // 5. Create the forwarded message
        const newMsg = await createMessage({
          sender_id: senderId,
          receiver_id: receiverId,
          chat_id: chatId,
          text: plainText ? encryptMessage(plainText) : null,
          image_url: sourceMsg.image_url || null,
          gif_url: sourceMsg.gif_url || null,
          reply_to: null,
          is_forwarded: true,
        });

        if (!newMsg) {
          failed.push({ chatId, reason: "Failed to create message" });
          continue;
        }

        // 6. Build last message preview text
        const lastMsgPreview = plainText
          ? plainText
          : hasGif
            ? "🎬 GIF"
            : "📷 Photo";

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
              last_message: encryptMessage(lastMsgPreview),
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
            { msg_id: newMsg.id, chat_id: chatId, user_id: newMsg.sender_id },
            { msg_id: newMsg.id, chat_id: chatId, user_id: newMsg.receiver_id },
          ]),
        ]);

        // 7. Socket: unread count to receiver
        io.to(receiverId.toString()).emit("unread_count", {
          chatId,
          unread_count: Number(unreadCount),
        });

        // 8. Socket: chat_update to both sender and receiver
        if (chatData) {
          chatData.last_message = lastMsgPreview;
          chatData.last_message_time = new Date();

          io.to(receiverId.toString()).emit("chat_update", {
            chat: chatData,
            unread_count: Number(unreadCount),
          });
          io.to(senderId.toString()).emit("chat_update", {
            chat: chatData,
            unread_count: 0,
          });
        }

        // 9. Publish to Redis → delivered as new_message via socket subscriber
        const responseMsg = {
          ...newMsg.toJSON(),
          text: plainText,
          image_url: newMsg.image_url ? JSON.parse(newMsg.image_url) : [],
          gif_url: newMsg.gif_url || null,
          is_forwarded: true,
        };
        await publisher.publish("MESSAGES", JSON.stringify(responseMsg));

        // 10. Offline notifications (FCM + socket new_noti)
        const receiver = await findUserByKey(receiverId);
        if (!receiver?.is_online) {
          io.to(receiverId.toString()).emit("new_noti", {
            message: `${senderUser.name} forwarded you a message`,
            chatId,
          });

          if (receiver?.fcm_token) {
            await sendFCMNotification(
              receiver.fcm_token,
              `Forwarded message from ${senderUser.name}`,
              plainText ? plainText.substring(0, 50) : lastMsgPreview,
              { chatId: chatId.toString(), path: "chat" },
            );
          }
        }

        forwarded.push({ chatId, msgId: newMsg.id });
      } catch (err) {
        // Per-chat errors must not abort the entire request
        console.error(`Forward failed for chatId ${chatId}:`, err.message);
        failed.push({ chatId, reason: "Internal error" });
      }
    }

    return res.status(200).json({
      message: MESSAGES.MESSAGE.FORWARD_MESSAGE_SUCCESS,
      success: true,
      forwarded,
      failed,
    });
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
  getPinMessages,
  forwardMessage,
};
