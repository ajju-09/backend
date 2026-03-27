const db = require("../models/index");

const Message = db.Message;

const findOneMessage = async (query) => {
  const data = await Message.findOne(query);
  return data;
};

const createMessage = async (query) => {
  const data = await Message.create(query);
  return data;
};

const updateMessage = async (value, query) => {
  const data = await Message.update(value, query);
  return data;
};

const findAllMessage = async (query) => {
  const data = await Message.findAll(query);
  return data;
};

const findMessageByKey = async (key) => {
  const data = await Message.findByPk(key);
  return data;
};

const findAndCountAllMessages = async (query) => {
  const { count, rows } = await Message.findAndCountAll(query);
  console.log("Count", count, "rows", rows);
  return { count, rows };
};

const countMessages = async (query) => {
  const data = await Message.count(query);
  return data;
};

const destroyMessage = async (query) => {
  const data = await Message.destroy(query);
  return data;
};

module.exports = {
  Message,
  findOneMessage,
  createMessage,
  updateMessage,
  findAllMessage,
  findMessageByKey,
  findAndCountAllMessages,
  countMessages,
  destroyMessage,
};
