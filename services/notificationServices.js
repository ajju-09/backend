const db = require("../models/index");

const Notification = db.Notification;

const findAllNotification = async (query) => {
  const data = await Notification.findAll(query);
  return data;
};

const updateNotification = async (value, query) => {
  const data = await Notification.update(value, query);
  return data;
};

const createNotification = async (query) => {
  const data = await Notification.create(query);
  return data;
};

const findNotificationByKey = async (key) => {
  const data = await Notification.findByPk(key);
  return data;
};

const destroyNotification = async (query) => {
  const data = await Notification.destroy(query);
  return data;
};

module.exports = {
  findAllNotification,
  updateNotification,
  createNotification,
  Notification,
  findNotificationByKey,
  destroyNotification,
};
