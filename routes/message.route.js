const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  sendMessage,
  getMessage,
  pinMessage,
  deleteForAll,
  searchMessageInChat,
  getAllStarMessages,
  getAllStarMessageWithInChat,
} = require("../controllers/message.controller");
const multiUpload = require("../middlewares/multiUpload.middleware");

const router = express.Router();

// send message
router.post("/send", auth, multiUpload, sendMessage);

// get messages of chat
router.get("/:chatId", auth, getMessage);

router.get("/get-star-message", auth, getAllStarMessages);

router.get(
  "/get-star-message-in-chat/:chatId",
  auth,
  getAllStarMessageWithInChat,
);

router.get("/search/msg", auth, searchMessageInChat);

// pin message
router.patch("/pin/:msgId", auth, pinMessage);

// delete msg for all
router.patch("/delete/all/:msgId", auth, deleteForAll);

module.exports = router;
