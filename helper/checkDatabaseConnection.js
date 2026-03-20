const db = require("../models/index");

const checkDBConnection = async (next) => {
  try {
    await db.sequelize.authenticate();
    console.log("Database connection established successfully");
  } catch (error) {
    console.error("Error in database connection", error.message);
    next(error);
  }
};

module.exports = checkDBConnection;
