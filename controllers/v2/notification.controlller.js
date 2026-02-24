const { Op } = require("sequelize");
const { Users } = require("../../services/userServices");
const {
  findAllNotification,
  updateNotification,
} = require("../../services/notificationServices");

// get all notificatio for logged in user
// GET /api/v2/notification/get-all
// pricate access
const getAllNotification = async (req, res) => {
  try {
    const userId = req.id;

    const getAll = await findAllNotification({
      where: {
        sender_id: { [Op.ne]: userId },
      },
      include: {
        model: Users,
        as: "otheruser",
        attributes: ["id", "name", "email", "photo"],
      },
      attributes: ["title", "message", "seen"],
      order: [["createdAt", "DESC"]],
    });

    if (!getAll) {
      return res
        .status(404)
        .json({ message: "There is no message for you", success: false });
    }

    res.status(200).json({
      message: "Featch all notifications successfully",
      success: true,
      data: getAll,
    });
  } catch (error) {
    console.log("Error in get all notification", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};

// update seen in database
// PATCH /api/v2/notification/seen/:notiId
// private access
const seenNotification = async (req, res) => {
  try {
    const { notiId } = req.params;

    if (!notiId) {
      return res
        .status(400)
        .json({ message: "Notification id required", success: false });
    }

    await updateNotification(
      {
        seen: true,
      },
      { where: { id: notiId } },
    );

    res.status(200).json({ message: "Message seen", success: true });
  } catch (error) {
    console.log("Error in seen notification", error.message);
    res
      .status(500)
      .json({ message: "SERVER ERROR", success: false, msg: error.message });
  }
};
module.exports = { getAllNotification, seenNotification };
