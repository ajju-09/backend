const { Users } = require("../../services/userServices");
const {
  findAllNotification,
  updateNotification,
} = require("../../services/notificationServices");
const { decryptMessage } = require("../../helper/cipherMessage");

// get all notificatio for logged in user
// GET /api/v2/notification/get-all
// pricate access
const getAllNotification = async (req, res, next) => {
  try {
    const userId = req.id;

    const getAll = await findAllNotification({
      where: { receiver_id: userId },
      include: {
        model: Users,
        as: "otheruser",
        attributes: ["id", "photo"],
      },
      attributes: ["id", "title", "message", "seen"],
      order: [["createdAt", "DESC"]],
    });

    if (!getAll) {
      return res
        .status(404)
        .json({ message: "There is no message for you", success: false });
    }

    const decryptedData = getAll.map((item) => {
      const plainText = decryptMessage(item.title);
      return { ...item.toJSON(), title: plainText };
    });

    res.status(200).json({
      message: "Featch all notifications successfully",
      success: true,
      data: decryptedData,
    });
  } catch (error) {
    next(error);
  }
};

// update seen in database
// PATCH /api/v2/notification/seen/:notiId
// private access
const seenNotification = async (req, res, next) => {
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
    next(error);
  }
};
module.exports = { getAllNotification, seenNotification };
