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
  editMessage,
  getPinMessages,
  forwardMessage,
} = require("../controllers/message.controller");
const multiUpload = require("../middlewares/multiUpload.middleware");
const premiumFeature = require("../middlewares/premium.middleware");

const router = express.Router();

// send message
router.post("/send", auth, multiUpload, premiumFeature, sendMessage);

// forward message (no file upload — copies existing URLs)
router.post("/forward", auth, forwardMessage);

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

router.patch("/chat/:chatId/edit-message/:msgId", auth, editMessage);

router.get("/get-pin-messages/:chatId", auth, getPinMessages);

module.exports = router;
