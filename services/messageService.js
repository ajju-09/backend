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

module.exports = {
  Message,
  findOneMessage,
  createMessage,
  updateMessage,
  findAllMessage,
  findMessageByKey,
};
