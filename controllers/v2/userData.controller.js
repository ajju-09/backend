const { Op } = require("sequelize");
const { findAllMessage } = require("../../services/messageService");
const { decryptMessage } = require("../../helper/cipherMessage");
const { findChatByKey } = require("../../services/chatServices");
const { logger } = require("../../helper/logger");
const { setCacheData, getCacheData } = require("../../redis/redis.client");

// get all media
// GET /api/v2/user-data/get-media
// private access
const getAllMedia = async (req, res, next) => {
  try {
    const userId = req.id;

    logger.info(`${req.method} ${req.url}`);

    const cacheData = await getCacheData(`media:${userId}`);

    if (cacheData) {
      console.log("Cached Hits here in get all media");
      return res
        .status(200)
        .json({ message: "get all media", success: true, data: cacheData });
    }

    const allMedia = await findAllMessage({
      where: {
        [Op.and]: [
          { [Op.or]: [{ sender_id: userId }, { receiver_id: userId }] },
          {
            [Op.or]: [
              { image_url: { [Op.like]: "%.jpg%" } },
              { image_url: { [Op.like]: "%.jpeg%" } },
              { image_url: { [Op.like]: "%.png%" } },
              { image_url: { [Op.like]: "%.mp4%" } },
            ],
          },
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!allMedia) {
      return res
        .status(400)
        .json({ message: "No media found", success: false });
    }

    await setCacheData(`media:${userId}`, allMedia);

    res
      .status(200)
      .json({ message: "get all media", success: true, data: allMedia });
  } catch (error) {
    next(error);
  }
};

// get all docs
// GET /api/v2/user-data/get-docs
// private access
const getAllDocs = async (req, res, next) => {
  try {
    const userId = req.id;

    logger.info(`${req.method} ${req.url}`);

    const cacheData = await getCacheData(`docs:${userId}`);

    if (cacheData) {
      console.log("Cached Hits here in get all docs");
      return res
        .status(200)
        .json({ message: "get all docs", success: true, data: cacheData });
    }

    const allDocs = await findAllMessage({
      where: {
        [Op.and]: [
          { [Op.or]: [{ sender_id: userId }, { receiver_id: userId }] },
          {
            [Op.or]: [
              { image_url: { [Op.like]: "%.docx%" } },
              { image_url: { [Op.like]: "%.doc%" } },
              { image_url: { [Op.like]: "%.ppt%" } },
              { image_url: { [Op.like]: "%.pdf%" } },
              { image_url: { [Op.like]: "%.mp3%" } },
            ],
          },
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!allDocs) {
      return res.status(400).json({ message: "No docs found", success: false });
    }

    await setCacheData(`docs:${userId}`, allDocs);

    res
      .status(200)
      .json({ message: "get all docs", success: true, data: allDocs });
  } catch (error) {
    next(error);
  }
};

// get all links
// GET /api/v2/user-data/get-links
// private access
const getAllLinks = async (req, res, next) => {
  try {
    const userId = req.id;

    logger.info(`${req.method} ${req.url}`);

    const msg = await findAllMessage({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
        text: {
          [Op.ne]: null,
        },
        delete_for_all: false,
      },
      order: [["createdAt", "DESC"]],
    });

    const filtered = msg
      .map((item) => {
        const decryptedText = decryptMessage(item.text);
        return { ...item.toJSON(), text: decryptedText };
      })
      .filter(
        (msg) =>
          msg.text.startsWith("https://") || msg.text.startsWith("http://"),
      );

    if (!filtered) {
      return res
        .status(400)
        .json({ message: "There is not Links for you", success: false });
    }

    res
      .status(200)
      .json({ message: "get all links", success: true, data: filtered });
  } catch (error) {
    next(error);
  }
};

// get all media in chat
// GET /api/v2/user-data/get-media-in-chat/:chatId
// private access
const getAllMediaInChat = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

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

    const cacheData = await getCacheData(`mediaInChat:${chatId}:${userId}`);

    if (cacheData) {
      return res.status(200).json({
        message: "fetch all media for chat",
        success: true,
        data: cacheData,
      });
    }

    const mediaFiles = await findAllMessage({
      where: {
        chat_id: chatId,
        delete_for_all: false,
        [Op.or]: [
          { image_url: { [Op.like]: "%.jpg%" } },
          { image_url: { [Op.like]: "%.jpeg%" } },
          { image_url: { [Op.like]: "%.png%" } },
          { image_url: { [Op.like]: "%.mp4%" } },
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!mediaFiles) {
      return res
        .status(400)
        .json({ message: "There is no media file available", success: false });
    }

    await setCacheData(`mediaInChat:${chatId}:${userId}`, mediaFiles);

    res.status(200).json({
      message: "fetch all media for chat",
      success: true,
      data: mediaFiles,
    });
  } catch (error) {
    next(error);
  }
};

// get all docs in chat
// GET /api/v2/user-data/get-docs-in-chat/:chatId
// private access
const getAllDocsInChat = async (req, res, next) => {
  try {
    const userId = req.id;
    const { chatId } = req.params;

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

    const cacheData = await getCacheData(`docsInChat:${chatId}:${userId}`);

    if (cacheData) {
      return res.status(200).json({
        message: "Fetch doc files successfully",
        success: true,
        data: cacheData,
      });
    }

    const docsFiles = await findAllMessage({
      where: {
        chat_id: chatId,
        delete_for_all: false,
        [Op.or]: [
          { image_url: { [Op.like]: "%.docx%" } },
          { image_url: { [Op.like]: "%.doc%" } },
          { image_url: { [Op.like]: "%.ppt%" } },
          { image_url: { [Op.like]: "%.pdf%" } },
          { image_url: { [Op.like]: "%.mp3%" } },
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!docsFiles) {
      return res
        .status(400)
        .json({ message: "There is no doc files available", success: false });
    }

    await setCacheData(`docsInChat:${chatId}:${userId}`, docsFiles);

    res.status(200).json({
      message: "Fetch doc files successfully",
      success: true,
      data: docsFiles,
    });
  } catch (error) {
    next(error);
  }
};

// get all links in chat
// GET /api/v2/user-data/get-links-in-chat/:chatId
// private access
const getAllLinksInChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;

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

    const msg = await findAllMessage({
      where: {
        chat_id: chatId,
        delete_for_all: false,
        text: {
          [Op.ne]: null,
        },
        delete_for_all: false,
      },
      order: [["createdAt", "DESC"]],
    });

    const filtered = msg
      .map((item) => {
        const decryptedText = decryptMessage(item.text);
        return { ...item.toJSON(), text: decryptedText };
      })
      .filter(
        (msg) =>
          msg.text.startsWith("https://") || msg.text.startsWith("http://"),
      );

    if (!filtered) {
      return res
        .status(400)
        .json({ message: "There is no link for you", success: false });
    }

    res.status(200).json({
      message: "Fetch links successfully",
      success: true,
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDocs,
  getAllLinks,
  getAllMedia,
  getAllMediaInChat,
  getAllDocsInChat,
  getAllLinksInChat,
};
