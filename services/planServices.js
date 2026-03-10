const db = require("../models/index");

const Plans = db.Plan;

const findPlanByKey = async (key) => {
  const data = await Plans.findByPk(key);
  return data;
};

const findOnePlan = async (query) => {
  const data = await Plans.findOne(query);
  return data;
};

const findAllPlan = async () => {
  const data = await Plans.findAll();
  return data;
};

module.exports = { Plans, findPlanByKey, findOnePlan, findAllPlan };
