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
        ],
      },
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

// get all media
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
        ],
      },
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

// get all media
// GET /api/v2/user-data/get-links
// private access
const getAllLinks = async (req, res) => {
  try {
    const userId = req.id;

    const allLinks = await findAllMessage({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
        text: { [Op.like]: "%https%" },
      },
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

module.exports = { getAllDocs, getAllLinks, getAllMedia };
