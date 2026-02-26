const jwt = require("jsonwebtoken");
require("dotenv").config();

const generateToken = (data) => {
  const token = jwt.sign(data, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE_TIME,
  }); // 1 day

  return token;
};

module.exports = generateToken;
