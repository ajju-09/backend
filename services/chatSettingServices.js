const db = require("../models/index");

const ChatSetting = db.ChatSetting;

const findOneChatSetting = async (query) => {
  const data = await ChatSetting.findOne(query);
  return data;
};

const updateChatSetting = async (value, query) => {
  const data = await ChatSetting.update(value, query);
  return data;
};

const BulkCreateChatSetting = async (array) => {
  const data = await ChatSetting.bulkCreate(array);
  return data;
};

module.exports = {
  ChatSetting,
  findOneChatSetting,
  updateChatSetting,
  BulkCreateChatSetting,
};
