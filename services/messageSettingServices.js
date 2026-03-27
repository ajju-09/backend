const db = require("../models/index");

const MessageSetting = db.MessageSetting;

const findOneMessageSetting = async (query) => {
  const data = await MessageSetting.findOne(query);
  return data;
};

const updateMessageSetting = async (value, query) => {
  const data = await MessageSetting.update(value, query);
  return data;
};

const bulkCreateMessageSetting = async (arr) => {
  const data = await MessageSetting.bulkCreate(arr);
  return data;
};

const findMessageSettingByPk = async (key) => {
  const data = await MessageSetting.findByPk(key);
  return data;
};

const destroyMessageSetting = async (query) => {
  const data = await MessageSetting.destroy(query);
  return data;
};

module.exports = {
  findOneMessageSetting,
  updateMessageSetting,
  MessageSetting,
  bulkCreateMessageSetting,
  findMessageSettingByPk,
  destroyMessageSetting,
};
