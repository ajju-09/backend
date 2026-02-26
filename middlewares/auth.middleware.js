const jwt = require("jsonwebtoken");
const db = require("../models/index");

const auth = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.Authorization || req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1]; // Authorization: "Bearer token"

      // decode jwt token
      const decode = jwt.verify(token, process.env.JWT_SECRET);

      if (!decode) {
        return res
          .status(401)
          .json({ message: "Token in not valid", success: false });
      }

      // find user by primary key
      const user = await db.User.findByPk(decode.id);

      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found", success: false });
      }

      // set req
      req.id = user.id;
      req.email = user.email;

      next();
    }

    if (!token) {
      return res.status(400).json({ message: "No Token", success: false });
    }
  } catch (error) {
    console.log("Error in auth middleware", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
        expiredAt: error.expiredAt,
        success: false,
      });
    }
    next();
  }
};

module.exports = auth;
