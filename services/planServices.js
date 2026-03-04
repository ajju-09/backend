const db = require("../models/index");

const Plan = db.Plan;

const findPlanByKey = async (key) => {
  const data = await Plan.findByPk(key);
  return data;
};

module.exports = { findPlanByKey };
