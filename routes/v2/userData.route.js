const express = require("express");
const {
  getAllMedia,
  getAllDocs,
  getAllLinks,
  getAllMediaInChat,
  getAllDocsInChat,
  getAllLinksInChat,
} = require("../../controllers/v2/userData.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/get-media", auth, getAllMedia);
router.get("/get-docs", auth, getAllDocs);
router.get("/get-links", auth, getAllLinks);

router.get("/get-media-in-chat/:chatId", auth, getAllMediaInChat);
router.get("/get-docs-in-chat/:chatId", auth, getAllDocsInChat);
router.get("/get-links-in-chat/:chatId", auth, getAllLinksInChat);

module.exports = router;
