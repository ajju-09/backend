const {
  signUpSchema,
  loginSchema,
  updateSchema,
  verifyOtpSchema,
  sendOtpSchema,
  forgotPasswordSchema,
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
const sendEmail = require("../helper/sendMail");
const { generateOtp, expiresIn } = require("../helper/generateOtp");
const {
  getCacheForUser,
  setCacheForUser,
  clearCacheForUser,
  clearCacheForAllUsers,
} = require("../redis/user.cache");

// register
// POST /api/v1/users/register
// access public
const register = async (req, res, next) => {
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
      await clearCacheForAllUsers("allUsers:*");

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

      return res.status(200).json({
        message: "Welcome back",
        success: true,
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
      isVerified: false,
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
      await clearCacheForAllUsers("allUsers:*");

      return res.status(200).json({
        message: "User registered successfully",
        success: true,
        data: userDetail,
      });
    }

    res.status(400).json({ message: "Something went wrong", success: false });
  } catch (error) {
    next(error);
  }
};

// login
// POST /api/v1/users/login
// access public
const login = async (req, res, next) => {
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

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    if (user.isVerified === false) {
      user.otp = null;
      user.expiresAt = null;
      user.otp_purpose = null;
      await user.save();
      return res
        .status(400)
        .json({ message: "Please verify your email", success: false });
    }

    if (user.isDeleted === true) {
      return res
        .status(401)
        .json({ message: "User does not exists", success: false });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
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
    next(error);
  }
};

// profile
// GET /api/v1/users/profile/:id
// private access
const profile = async (req, res, next) => {
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

    const cacheData = await getCacheForUser(`userProfile:${id}`);

    if (cacheData) {
      return res.status(200).json({
        message: "User profile fetched successfully",
        data: cacheData,
        success: true,
      });
    }

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

    await setCacheForUser(`userProfile:${id}`, data);

    res
      .status(200)
      .json({ message: "User profile", success: true, data: data });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/users/getall
const getAllUser = async (req, res, next) => {
  try {
    const id = req.id;

    logger.info(`${req.method} ${req.url}`);

    const cacheData = await getCacheForUser(`allUsers:${id}`);

    if (cacheData) {
      console.log("Cached hit inside get all users");
      return res.status(200).json({
        message: "Fetched all user successfully",
        success: true,
        data: cacheData,
      });
    }

    const data = await findAllUser({
      where: {
        id: {
          [Op.ne]: id,
        },
        isVerified: true,
        isDeleted: false,
      },
      attributes: {
        exclude: ["password", "otp_purpose", "otp"],
      },
    });

    if (!data) {
      return res
        .status(400)
        .json({ message: "There is no one in database", success: false });
    }

    await setCacheForUser(`allUsers:${id}`, data);

    res.status(200).json({ message: "Fetched all user", success: true, data });
  } catch (error) {
    next(error);
  }
};

// update
// PUT /api/v1/users/update
// private access
const update = async (req, res, next) => {
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

    const { action, name, email, phone, newPassword, oldPassword } = value;

    // find user
    const user = await findUserByKey(id);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    await clearCacheForUser(`userProfile:${id}`);

    switch (action) {
      case "profile":
        if (user.name.toLowerCase() === name.toLowerCase()) {
          return res
            .status(400)
            .json({ message: "Input name is same", success: false });
        }

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
        if (oldPassword === newPassword) {
          return res.status(400).json({
            message: "Old password and New password not be same",
            success: false,
          });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
          return res
            .status(400)
            .json({ message: "Old password does not match", success: false });
        }

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
    next(error);
  }
};

// delete
// DELETE /api/v1/users/delete
// private access (soft delete)
const deleteUser = async (req, res, next) => {
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

    await clearCacheForAllUsers("allUsers:*");

    // update is isDeleted col
    await updateUser(
      { isDeleted: true, isLogin: false, is_online: 0, isVerified: false },
      { where: { id: id } },
    );

    res.status(200).json({
      message: "User deleted successfully",
      success: true,
    });
  } catch (error) {
    next();
  }
};

// POST /api/v1/users/upload
const uploadImage = async (req, res, next) => {
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
    const image = await uploadToCloudinary(req.file);
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
    next(error);
  }
};

// POST /api/v1/users/logout
const logout = async (req, res, next) => {
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
      { isLogin: false, last_seen: new Date(), is_online: false },
      { where: { id: id } },
    );

    io.emit("user_offline", id);

    res
      .status(200)
      .json({ message: "User logout successfully", success: true });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/users/search
const searchUsers = async (req, res, next) => {
  try {
    const { name, limit = "4" } = req.query;

    logger.info(`${req.method} ${req.url}`);

    if (!name) {
      return res.status(400).json({ message: "Search text required" });
    }

    const cacheData = await getCacheForUser("searchUser");

    if (cacheData) {
      return res
        .status(200)
        .json({ message: "Search users", success: true, data: cacheData });
    }

    const user = await findAllUser({
      where: {
        [Op.or]: [
          {
            name: {
              [Op.like]: `%${name}%`,
            },
          },
          {
            email: {
              [Op.like]: `%${name}%`,
            },
          },
        ],

        isDeleted: false,
        isVerified: true,
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

    await setCacheForUser("searchUser", user);

    res.status(200).json({ success: true, data: user, limit: limit });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/users/send-otp
const sendOtp = async (req, res, next) => {
  try {
    const { error, value } = sendOtpSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: "Error in invalid req body",
        errors: error.details.map((err) => err.message),
        success: false,
      });
    }

    logger.info(`${req.method} ${req.url}`);
    const { email, action } = value;

    const user = await findSingleUser({ where: { email: email } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "user not found", success: false });
    }

    // generate otp
    const Otp = generateOtp();

    // hashed otp
    const hashedOtp = await bcrypt.hash(Otp.toString(), 10);

    // generate expire time
    const expiresTime = expiresIn();

    switch (action) {
      case "signup":
        await updateUser(
          { otp: hashedOtp, expiresAt: expiresTime, otp_purpose: "signup" },
          { where: { email: email } },
        );
        break;
      case "forgot_password":
        await updateUser(
          {
            otp: hashedOtp,
            expiresAt: expiresTime,
            otp_purpose: "forgot_password",
          },
          { where: { email: email } },
        );
        break;
    }

    // send email
    await sendEmail({ email: email, otp: Otp });

    res.status(200).json({ message: "Otp sent successfully", success: true });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/users/verify-otp
const verifyOtp = async (req, res, next) => {
  try {
    const { value, error } = verifyOtpSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: "Error in invalid req body",
        errors: error.details.map((err) => err.message),
        success: false,
      });
    }

    logger.info(`${req.method} ${req.url}`);
    const { email, otp } = value;

    // find for user in database
    const user = await findSingleUser({ where: { email: email } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "Email not found", success: false });
    }

    // check otp feilds
    if (user.otp === null) {
      return res
        .status(401)
        .json({ message: "Otp is not present", success: false });
    }

    if (user.otp_purpose === "forgot_password" && user.isVerified === false) {
      user.otp = null;
      user.expiresAt = null;
      user.otp_purpose = null;
      await user.save();
      return res.status(400).json({ message: "Your are not verified" });
    }

    // comapre otp
    const isMatch = await bcrypt.compare(otp, user.otp);

    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Otp does not match", success: false });
    }

    if (new Date() > user.expiresAt) {
      user.otp = null;
      user.expiresAt = null;
      await user.save();
      return res.status(400).json({ message: "Otp expired", success: false });
    }

    // update isVerified
    user.isVerified = true;
    user.otp = null;
    user.expiresAt = null;
    user.isLogin = true;
    user.otp_purpose = null;
    await user.save();

    // generate tokem
    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    res.status(200).json({
      message: "User verified successfully",
      success: true,
      token: token,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/users/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    // const { email, newPass } = req.body;
    const { error, value } = forgotPasswordSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: "Error in invalid req body",
        errors: error.details.map((err) => err.message),
        success: false,
      });
    }

    logger.info(`${req.method} ${req.url}`);
    const { email, newPass } = value;

    const user = await findSingleUser({ where: { email: email } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    if (user.isVerified === false) {
      user.otp = null;
      user.expiresAt = null;
      await user.save();
      return res
        .status(400)
        .json({ message: "User not verified", success: false });
    }

    // hash newPass
    const hashedNewpass = await bcrypt.hash(newPass, 10);

    // update it in database
    await updateUser({ password: hashedNewpass }, { where: { email: email } });

    res
      .status(200)
      .json({ message: "Password reset successfully", success: true });
  } catch (error) {
    next(error);
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
  verifyOtp,
  sendOtp,
  forgotPassword,
};
