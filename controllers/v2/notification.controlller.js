const { Users } = require("../../services/userServices");
const {
  findAllNotification,
  updateNotification,
  findNotificationByKey,
  destroyNotification,
} = require("../../services/notificationServices");
const { decryptMessage } = require("../../helper/cipherMessage");
const logger = require("../../helper/logger");
const { Chats } = require("../../services/chatServices");

// get all notificatio for logged in user
// GET /api/v2/notification/get-all
// pricate access
const getAllNotification = async (req, res, next) => {
  try {
    const userId = req.id;

    logger.info(`${req.method} ${req.url}`);

    const getAll = await findAllNotification({
      where: { receiver_id: userId },
      include: [
        {
          model: Users,
          as: "otheruser",
          attributes: ["id", "photo"],
        },
        {
          model: Chats,
          attributes: ["id"],
        },
      ],
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

    logger.info(`${req.method} ${req.url}`);

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

// delete notification
// DELETE /api/v2/notification/delete/:notiId
const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.id;

    const { notiId } = req.params;

    logger.info(`${req.method} ${req.url}`);

    if (!notiId) {
      return res
        .status(400)
        .json({ message: "Notification id required", success: false });
    }

    const noti = await findNotificationByKey(notiId);

    if (!noti) {
      return res
        .status(404)
        .json({ message: "Notification not found", success: false });
    }

    if (userId !== noti.receiver_id) {
      return res
        .status(401)
        .json({ message: "Not Authorized", success: false });
    }

    await destroyNotification({ where: { id: notiId, receiver_id: userId } });

    res
      .status(200)
      .json({ message: "Notification deleted successfully", success: true });
  } catch (error) {
    next(error);
  }
};
module.exports = { getAllNotification, seenNotification, deleteNotification };
