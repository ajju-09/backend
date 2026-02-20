const express = require("express");
const {
  getAllMedia,
  getAllDocs,
  getAllLinks,
} = require("../../controllers/v2/userData.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/get-media", auth, getAllMedia);
router.get("/get-docs", auth, getAllDocs);
router.get("/get-links", auth, getAllLinks);

module.exports = router;
