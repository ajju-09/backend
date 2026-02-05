const jwt = require("jsonwebtoken");

const generateToken = (data) => {
  const token = jwt.sign(data, process.env.JWT_SECRET, { expiresIn: "24h" }); // 1 day

  return token;
};

module.exports = generateToken;
