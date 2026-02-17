const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  sendMessage,
  getMessage,
  readMessage,
  starMessage,
  pinMessage,
  deleteForMe,
  deleteForAll,
  searchMessageInChat,
} = require("../controllers/message.controller");
const multiUpload = require("../middlewares/multiUpload.middleware");

const router = express.Router();

// send message
router.post("/send", auth, multiUpload, sendMessage);

// get messages of chat
router.get("/:chatId", auth, getMessage);

router.get("/search/msg", auth, searchMessageInChat);

// mark as read
router.patch("/read/:msgId", auth, readMessage);

// star message
router.patch("/star/:msgId", auth, starMessage);

// pin message
router.patch("/pin/:msgId", auth, pinMessage);

// delete msg for me
router.patch("/delete/me/:msgId", auth, deleteForMe);

// delete msg for all
router.patch("/delete/all/:msgId", auth, deleteForAll);

module.exports = router;
