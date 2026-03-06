const db = require("../models/index");

const Plans = db.Plan;

const findPlanByKey = async (key) => {
  const data = await Plans.findByPk(key);
  return data;
};

module.exports = { Plans, findPlanByKey };
