const db = require("../models/index");
const Chats = db.Chat;

const findOneChat = async (query) => {
  const data = await Chats.findOne(query);
  return data;
};

const findAllChat = async (query) => {
  const data = await Chats.findAll(query);
  return data;
};

const findChatByKey = async (key) => {
  const data = await Chats.findByPk(key);
  return data;
};

const createChats = async (query) => {
  const data = await Chats.create(query);
  return data;
};

const updateChat = async (value, query) => {
  const data = await Chats.update(value, query);
  return data;
};

module.exports = {
  findOneChat,
  updateChat,
  createChats,
  findAllChat,
  Chats,
  findChatByKey,
};
