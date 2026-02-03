const db = require("../models/index");
const { signUpSchema, loginSchema } = require("../helper/joiSchema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// register
// POST /api/v1/users/register
// access public
const register = async (req, res) => {
  try {
    // name, email, phone, password, photo in req body
    // validate
    const { error, value } = signUpSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: "Error in invalid req body",
        errors: error.details.map((err) => err.message),
        success: false,
      });
    }

    const { name, email, phone, password, photo } = value;

    // email and phone is unique
    const existedUser = await db.User.findOne({ where: { email } });
    const existedPhone = await db.User.findOne({ where: { phone } });

    // check for this email already exists or not
    if (existedUser) {
      return res
        .status(401)
        .json({ message: "This email is already registered", success: false });
    }

    // check for phone number
    if (existedPhone) {
      return res
        .status(401)
        .json({ message: "Phone number already existed", success: false });
    }

    // hash password
    const hasedPassword = await bcrypt.hash(password, 10);

    // if not then create new user
    const newUser = await db.User.create({
      name,
      email,
      phone,
      password: hasedPassword,
      photo,
    });

    if (newUser) {
      res.status(200).json({
        message: "User registered successfully",
        success: true,
        data: newUser,
      });
    }
  } catch (error) {
    console.log("Error in register controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// login
// POST /api/v1/users/login
// access public
const login = async (req, res) => {
  try {
    // email, password in req body
    // validate using email, password
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: "Error in invalid req body",
        errors: error.details.map((err) => err.message),
        success: false,
      });
    }

    const { email, password } = value;

    // find user by email
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      return res
        .status(401)
        .json({ message: "User doesn not exists", success: false });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
        success: false,
      });
    }

    // generate jwt token
    const token = jwt.sign({ id: user.id, email: user.email }, "test", {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "User Login successfully",
      success: true,
      token: token,
    });
  } catch (error) {
    console.log("Error in login controller", error.meesage);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

module.exports = { register, login };
