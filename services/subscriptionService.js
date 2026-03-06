const db = require("../models/index");
const Subscritions = db.Subscription;

const createSubscription = async (data) => {
  return await Subscritions.create(data);
};

const updateSubscription = async (value, query) => {
  const data = await Subscritions.update(value, query);
  return data;
};

module.exports = { createSubscription, updateSubscription };
