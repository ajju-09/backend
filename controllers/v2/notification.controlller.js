const { Op, Model } = require("sequelize");
const db = require("../../models");
const { Users } = require("../../services/userServices");

// get all notificatio for logged in user
// GET /api/v2/notification/get-all
// pricate access
const getAllNotification = async (req, res) => {
  try {
    const userId = req.id;

    const getAll = await db.Notification.findAll({
      where: {
        sender_id: { [Op.ne]: userId },
      },
      include: {
        model: Users,
        as: "otheruser",
        attributes: ["id", "name", "email", "photo"],
      },
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
      .json({ message: "SREVRE ERROR", success: false, msg: error.message });
  }
};

module.exports = { getAllNotification };
