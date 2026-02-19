const db = require("../models");

// star message
// /api/v2/messagesetting/star/:msgId
// private access
const starMessage = async (req, res) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;

    if (!msgId) {
      return res
        .status(404)
        .json({ message: "Msg id required", success: false });
    }

    const messagesetting = await db.MessageSetting.findOne({
      where: { msg_id: msgId, user_id: userId },
    });

    if (!messagesetting) {
      return res
        .status(404)
        .json({ message: "Message setting not found", success: false });
    }

    messagesetting.is_star = !messagesetting.is_star;
    await messagesetting.save();

    res.status(200).json({
      message: messagesetting.is_star ? "Msg star" : "Msg Unstar",
      success: true,
      star: messagesetting.is_star,
    });
  } catch (error) {
    console.log("Error in star message", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// delete message for me
// /api/v2/messagesetting/delete-for-me/:msgId
// private access
const deleteMessageForMe = async (req, res) => {
  try {
    const userId = req.id;
    const { msgId } = req.params;

    if (!msgId) {
      return res
        .status(401)
        .json({ message: "Msg id required", success: false });
    }

    await db.MessageSetting.update(
      { delete_for_me: true },
      {
        where: { msg_id: msgId, user_id: userId },
      },
    );

    res.status(200).json({ message: "Msg delete for me", success: true });
  } catch (error) {
    console.log("Error in star message", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

module.exports = { starMessage, deleteMessageForMe };
