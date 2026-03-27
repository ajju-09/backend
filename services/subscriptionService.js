const db = require("../models/index");
const Subscriptions = db.Subscription;

const createSubscription = async (data) => {
  return await Subscriptions.create(data);
};

const updateSubscription = async (value, query) => {
  const data = await Subscriptions.update(value, query);
  return data;
};

const findOneSubscription = async (query) => {
  const data = await Subscriptions.findOne(query);
  return data;
};

const destroySubscription = async (query) => {
  const data = await Subscriptions.destroy(query);
  return data;
};

module.exports = {
  Subscriptions,
  createSubscription,
  updateSubscription,
  findOneSubscription,
  destroySubscription,
};
