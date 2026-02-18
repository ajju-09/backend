const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { createChat, getMyChats } = require("../controllers/chat.controller");

const router = express.Router();

// create chat
router.post("/create", auth, createChat);

// get all my chats
router.get("/my-chats", auth, getMyChats);

module.exports = router;
