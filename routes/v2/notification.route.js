const express = require("express");
const {
  getAllNotification,
} = require("../../controllers/v2/notification.controlller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/get-all", auth, getAllNotification);

module.exports = router;
