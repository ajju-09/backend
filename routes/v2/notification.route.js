const express = require("express");
const {
  getAllNotification,
  seenNotification,
} = require("../../controllers/v2/notification.controlller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/get-all", auth, getAllNotification);

router.get("/seen/:notiId", auth, seenNotification);

module.exports = router;
