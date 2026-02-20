const express = require("express");
const {
  deleteMessageForMe,
  starMessage,
} = require("../controllers/messageSetting.controller");
const auth = require("../middlewares/auth.middleware");
const { getAllStarMessages } = require("../controllers/message.controller");

const router = express.Router();

router.get("/get-star-message", auth, getAllStarMessages);

router.patch("/star/:msgId", auth, starMessage);

router.patch("/delete-for-me/:msgId", auth, deleteMessageForMe);

module.exports = router;
