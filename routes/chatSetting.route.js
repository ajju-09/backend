const express = require("express");
const {
  pinChat,
  muteChat,
  blockChat,
  deleteChat,
} = require("../controllers/chatSetting.controller");
const auth = require("../middlewares/auth.middleware");

const router = express.Router();

router.patch("/pin/:chatId", auth, pinChat);
router.patch("/mute/:chatId", auth, muteChat);
router.patch("/block/:chatId", auth, blockChat);
router.patch("/delete/:chatId", auth, deleteChat);

module.exports = router;
