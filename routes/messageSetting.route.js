const express = require("express");
const {
  deleteMessageForMe,
  starMessage,
} = require("../controllers/messageSetting.controller");
const auth = require("../middlewares/auth.middleware");

const router = express.Router();

router.patch("/star/:msgId", auth, starMessage);

router.patch("/delete-for-me/:msgId", auth, deleteMessageForMe);

module.exports = router;
