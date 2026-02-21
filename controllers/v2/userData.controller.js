const { Op } = require("sequelize");
const { findAllMessage } = require("../../services/messageService");

// get all media
// GET /api/v2/user-data/get-media
// private access
const getAllMedia = async (req, res) => {
  try {
    const userId = req.id;

    const allMedia = await findAllMessage({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
        [Op.or]: [
          { image_url: { [Op.like]: "%.jpg%" } },
          { image_url: { [Op.like]: "%.jpeg%" } },
          { image_url: { [Op.like]: "%.png%" } },
          { image_url: { [Op.like]: "%.mp4%" } },
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!allMedia) {
      return res
        .status(400)
        .json({ message: "No media found", success: false });
    }

    res
      .status(200)
      .json({ message: "get all media", success: true, data: allMedia });
  } catch (error) {
    console.log("Error in get all media", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// get all docs
// GET /api/v2/user-data/get-docs
// private access
const getAllDocs = async (req, res) => {
  try {
    const userId = req.id;

    const allDocs = await findAllMessage({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
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

    if (!allDocs) {
      return res.status(400).json({ message: "No docs found", success: false });
    }

    res
      .status(200)
      .json({ message: "get all docs", success: true, data: allDocs });
  } catch (error) {
    console.log("Error in get all docs", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// get all links
// GET /api/v2/user-data/get-links
// private access
const getAllLinks = async (req, res) => {
  try {
    const userId = req.id;

    const allLinks = await findAllMessage({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
        text: { [Op.like]: "%http%" },
      },
      order: [["createdAt", "DESC"]],
    });

    if (!allLinks) {
      return res.status(400).json({ message: "No link found", success: false });
    }

    res
      .status(200)
      .json({ message: "get all links", success: true, data: allLinks });
  } catch (error) {
    console.log("Error in get all links", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// get all media in chat
// GET /api/v2/user-data/get-media-in-chat/:chatId
// private access
const getAllMediaInChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res
        .status(400)
        .json({ message: "Chat id required", success: false });
    }

    const mediaFiles = await findAllMessage({
      where: {
        chat_id: chatId,
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

    res.status(200).json({
      message: "fetch all media for chat",
      success: true,
      data: mediaFiles,
    });
  } catch (error) {
    console.log("Error in get all media in chat", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// get all docs in chat
// GET /api/v2/user-data/get-docs-in-chat/:chatId
// private access
const getAllDocsInChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res
        .status(400)
        .json({ message: "Chat id required", success: false });
    }

    const docsFiles = await findAllMessage({
      where: {
        chat_id: chatId,
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

    res.status(200).json({
      message: "Fetch doc files successfully",
      success: true,
      data: docsFiles,
    });
  } catch (error) {
    console.log("Error in get all media in chat", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// get all links in chat
// GET /api/v2/user-data/get-links-in-chat/:chatId
// private access
const getAllLinksInChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res
        .status(400)
        .json({ message: "Chat id required", success: false });
    }

    const links = await findAllMessage({
      where: {
        chat_id: chatId,
        text: { [Op.like]: "%http%" },
      },
      order: [["createdAt", "DESC"]],
    });

    if (!links) {
      return res
        .status(400)
        .json({ message: "No links are available", success: false });
    }

    res.status(200).json({
      message: "Fetch links successfully",
      success: true,
      data: links,
    });
  } catch (error) {
    console.log("Error in get all media in chat", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
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
