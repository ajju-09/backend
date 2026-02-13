const {
  signUpSchema,
  loginSchema,
  updateSchema,
} = require("../helper/joiSchema");
const bcrypt = require("bcrypt");
const generateToken = require("../helper/generateToken");
const { Op } = require("sequelize");
const logger = require("../helper/logger");
const {
  findSingleUser,
  createUser,
  findAllUser,
  findUserByKey,
  updateUser,
} = require("../services/userServices");
const uploadToCloudinary = require("../helper/uploadToCloudinary");
const { getIo } = require("../socket");

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

    logger.info(`${req.method} ${req.url}`);
    const { name, email, phone, password } = value;

    // email and phone is unique
    const existedUser = await findSingleUser({ where: { email } });
    const existedPhone = await findSingleUser({ where: { phone } });

    // check for this email already exists or not
    if (existedUser && existedPhone) {
      await updateUser(
        { isDeleted: false, isLogin: true },
        { where: { email: email } },
      );

      const data = {
        id: existedUser.id,
        name: existedUser.name,
        email: existedUser.email,
        phone: existedUser.phone,
        is_online: existedUser.is_online,
        last_seen: existedUser.last_seen,
        isDeleted: existedUser.isDeleted,
        isLogin: existedUser.isLogin,
        createdAt: existedUser.createdAt,
        updatedAt: existedUser.updatedAt,
      };

      const token = generateToken({ id: data.id, email: data.email });

      return res.status(200).json({
        message: "Welcome back",
        success: true,
        token: token,
        data: data,
      });
    }

    // hash password
    const hashPassword = await bcrypt.hash(password, 10);

    // if not then create new user
    const newUser = await createUser({
      name,
      email,
      phone,
      password: hashPassword,
      isLogin: true,
    });

    const userDetail = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      photo: newUser.photo,
      is_online: newUser.is_online,
      last_seen: newUser.last_seen,
      isDeleted: newUser.isDeleted,
      isLogin: newUser.isLogin,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    if (newUser) {
      await updateUser({ isLogin: true }, { where: { email: email } });
      const token = generateToken({
        id: userDetail.id,
        email: userDetail.email,
      });
      res.status(200).json({
        message: "User registered successfully",
        success: true,
        data: userDetail,
        token: token,
      });
    }

    res.status(400).json({ message: "Something went wrong", success: false });
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

    logger.info(`${req.method} ${req.url}`);
    const { email, password } = value;

    // find user by email
    const user = await findSingleUser({ where: { email } });

    if (!user || user.isDeleted) {
      return res
        .status(401)
        .json({ message: "User does not exists", success: false });
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
    const data = {
      id: user.id,
      email: user.email,
    };

    const token = generateToken(data);

    await updateUser({ isLogin: true }, { where: { id: user.id } });

    const userDetail = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photo: user.photo,
      is_online: user.is_online,
      isLogin: user.isLogin,
      last_seen: user.last_seen,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      message: "User Login successfully",
      success: true,
      token: token,
      user: userDetail,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// profile
// GET /api/v1/users/profile/:id
// private access
const profile = async (req, res) => {
  try {
    // take use id from token
    // const userid = req.id;
    const { id } = req.params;

    const user = await findUserByKey(id);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    logger.info(`${req.method} ${req.url}`);

    // grab data from database exclude password
    const data = await findAllUser({
      where: {
        id: user.id,
      },
      attributes: {
        exclude: ["password"],
      },
    });

    if (!data) {
      return res
        .status(401)
        .message({ message: "user data not found", success: false });
    }

    res
      .status(200)
      .json({ message: "User profile", success: true, data: data });
  } catch (error) {
    console.log("Error in profile controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// GET /api/v1/users/getall
const getAllUser = async (req, res) => {
  try {
    const id = req.id;
    logger.info(`${req.method} ${req.url}`);
    const data = await findAllUser({
      where: {
        id: {
          [Op.ne]: id,
        },
      },
      attributes: {
        exclude: ["password"],
      },
    });

    res.status(200).json({ message: "Fetched all user", success: true, data });
  } catch (error) {
    console.log("Error in getall controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// update
// PUT /api/v1/users/update
// private access
const update = async (req, res) => {
  try {
    // grab user id
    const id = req.id;

    // validate req body
    const { error, value } = updateSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: "Error in validation while updating",
        error: error.details.map((err) => err.message),
        success: false,
      });
    }

    logger.info(`${req.method} ${req.url}`);

    const { action, name, email, phone, newPassword } = value;

    // find user
    const user = await findUserByKey(id);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    switch (action) {
      case "profile":
        const updatedData = {
          name: name,
          email: email,
          phone: phone,
        };

        // update it in database

        await updateUser(updatedData, {
          where: { id: id },
        });

        return res
          .status(200)
          .json({ message: "User updated successfully ", success: true });

      case "resetpassword":
        // hased password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const data = {
          password: hashedPassword,
        };

        // update it in data base
        await updateUser(data, {
          where: { id: id },
        });

        return res.status(200).json({
          message: "User password updated successfully ",
          success: true,
        });
    }
  } catch (error) {
    console.log("Error in update controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// delete
// DELETE /api/v1/users/delete
// private access (soft delete)
const deleteUser = async (req, res) => {
  try {
    const id = req.id;

    logger.info(`${req.method} ${req.url}`);

    // find user exist or not
    const user = await findUserByKey(id);

    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found", success: false });
    }

    // update is isDeleted col
    await updateUser(
      { isDeleted: true, isLogin: false },
      { where: { id: id } },
    );

    res.status(200).json({
      message: "User deleted successfully",
      success: true,
    });
  } catch (error) {
    console.log("Error in delete controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// POST /api/v1/users/upload
const uploadImage = async (req, res) => {
  try {
    logger.info(`${req.method} ${req.url}`);

    const id = req.id;

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Error in file upload", success: false });
    }

    // check for user in DB
    const user = await findAllUser({
      where: { id: id },
      attributes: ["id", "photo"],
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found ", success: false });
    }

    // implement cloudinary upload image
    const image = await uploadToCloudinary(req.file.path);
    const imageUrl = image.url;

    await updateUser({ photo: imageUrl }, { where: { id } });

    res.status(200).json({
      message: user.photo
        ? "Image updated successfully"
        : "Image upload successfully",
      success: true,
      imageurl: imageUrl,
    });
  } catch (error) {
    console.log("Error in upload controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// GET /api/v1/users/logout
const logout = async (req, res) => {
  try {
    // find user
    const id = req.id;
    const io = getIo();

    const user = await findUserByKey(id);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found ", success: false });
    }

    await updateUser(
      { isLogin: false, is_online: false, last_seen: new Date() },
      { where: { id: id } },
    );

    io.emit("user_offline", id);

    res
      .status(200)
      .json({ message: "User logout successfully", success: true });
  } catch (error) {
    console.log("Error in delete controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

// GET /api/v1/users/search
const searchUsers = async (req, res) => {
  try {
    const { name, limit = "4" } = req.query;

    if (!name) {
      return res.status(400).json({ message: "Search text required" });
    }

    const user = await findAllUser({
      where: {
        name: {
          [Op.like]: `%${name}%`,
        },
        isDeleted: false,
      },
      attributes: {
        exclude: ["password"],
      },

      limit: Number(limit),
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Text doesn't match with any one", success: false });
    }

    res.status(200).json({ success: true, data: user, limit: limit });
  } catch (error) {
    console.log("Error in search controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", success: false });
  }
};

module.exports = {
  register,
  login,
  profile,
  update,
  searchUsers,
  deleteUser,
  uploadImage,
  getAllUser,
  logout,
};
