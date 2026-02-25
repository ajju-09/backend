const express = require("express");
const {
  getAllNotification,
  seenNotification,
  deleteNotification,
} = require("../../controllers/v2/notification.controlller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/get-all", auth, getAllNotification);

router.get("/seen/:notiId", auth, seenNotification);

router.delete("/delete/:notiId", auth, deleteNotification);

module.exports = router;
