const db = require("../models/index");

const checkDBConnection = async () => {
  try {
    await db.sequelize.authenticate();
    console.log("Database connection established successfully");
  } catch (error) {
    console.error("Error in database connection", error.message);
  }
};

module.exports = checkDBConnection;
