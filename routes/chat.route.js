const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { createChat, getMyChats, toggleBlock, togglePin, toggleMute, deleteChat } = require('../controllers/chat.controller')

const router = express.Router();

// create chat
router.post("/create", auth, createChat);

// get all my chats
router.get("/my-chats", auth, getMyChats);

// block / unblock
router.patch("/block/:chatId", auth, toggleBlock);

// pin/ unpin
router.patch("/pin/:chatId", auth, togglePin);

// mute / unmute
router.patch("/mute/:chatId", auth, toggleMute);

// delete chat
router.delete("/:chatId", auth, deleteChat);

module.exports = router;
