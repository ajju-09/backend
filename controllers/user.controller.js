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
const { logger } = require("../helper/logger");
const {
  findSingleUser,
  createUser,
  findAllUser,
  findUserByKey,
  updateUser,
  findOneUser,
} = require("../services/userServices");
const uploadToCloudinary = require("../helper/uploadToCloudinary");
const { getIo } = require("../socket");
const { createSubscription } = require("../services/subscriptionService");
const { generateOtp, expiresIn } = require("../helper/generateOtp");
const sendEmail = require("../helper/sendMail");

// register
// POST /api/v1/users/register
// access public
const register = async (req, res, next) => {
  try {
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
    const existedEmail = await findSingleUser({ where: { email } });
    const existedPhone = await findSingleUser({ where: { phone } });

    // check for this email already exists or not
    if (existedEmail && existedPhone) {
      await updateUser(
        {
          name: name,
          password: await bcrypt.hash(password, 10),
          phone: phone,
          isDeleted: false,
        },
        { where: { email: email } },
      );

      if (existedEmail.isVerified === true) {
        existedEmail.isLogin = true;
        await existedEmail.save();
      }

      const data = {
        id: existedEmail.id,
        name: existedEmail.name,
        email: existedEmail.email,
        phone: existedEmail.phone,
        is_online: existedEmail.is_online,
        last_seen: existedEmail.last_seen,
        isDeleted: existedEmail.isDeleted,
        isLogin: existedEmail.isLogin,
        createdAt: existedEmail.createdAt,
        updatedAt: existedEmail.updatedAt,
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
      await createSubscription({
        user_id: userDetail.id,
        plan_id: 1,
        status: "Active",
        auto_renew: true,
      });

      return res.status(200).json({
        message: "User registered successfully",
        success: true,
        data: userDetail,
      });
    }

    return res
      .status(400)
      .json({ message: "Something went wrong", success: false });
  } catch (error) {
    next(error);
  }
};

// login
// POST /api/v1/users/login
// access public
const login = async (req, res, next) => {
  try {
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
    const user = await findSingleUser({ where: { email: email } });

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

    // if (user) {
    //   await sendMessage(`+91${phone}`);
    // }

    await updateUser(
      { isLogin: true, otp: null, otp_purpose: null, expiresAt: null },
      { where: { id: user.id } },
    );

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

    return res.status(200).json({
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
// GET /api/v1/users/profile
// private access
const profile = async (req, res, next) => {
  try {
    const userId = req.id;

    logger.info(`${req.method} ${req.url}`);

    const user = await findOneUser({
      where: { id: userId },
      attributes: {
        exclude: ["password", "otp", "otp_purpose", "expiresAt"],
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    return res
      .status(200)
      .json({ message: "User profile", success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Other users profile
// POST /api/v1/users/other-user-profile
// private access
const otherUserProfile = async (req, res, next) => {
  try {
    const { id } = req.body;

    logger.info(`${req.method} ${req.url}`);

    if (!id) {
      return res
        .status(400)
        .json({ message: "Other user id required", success: false });
    }

    const user = await findOneUser({
      where: { id: id },
      attributes: {
        exclude: ["password", "otp", "otp_purpose", "expiresAt"],
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    return res
      .status(200)
      .json({ message: "User profile", success: true, data: user });
  } catch (error) {
    next();
  }
};

// GET /api/v1/users/getall
const getAllUser = async (req, res, next) => {
  try {
    const id = req.id;
    logger.info(`${req.method} ${req.url}`);
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

    const {
      action,
      name,
      email,
      phone,
      newPassword,
      oldPassword,
      confirmPassword,
    } = value;

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
        if (newPassword !== confirmPassword) {
          return res.status(400).json({
            message: "New password and Confirm password does not match ",
          });
        }

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

// GET /api/v1/users/logout
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
      { isLogin: false, last_seen: new Date() },
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
    const userId = req.id;

    const { name, limit = "4" } = req.query;

    if (!name) {
      return res.status(400).json({ message: "Search text required" });
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
        id: { [Op.ne]: userId },
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
    const otp = generateOtp();

    const hasedOtp = await bcrypt.hash(otp.toString(), 10);

    const expireTime = expiresIn();

    switch (action) {
      case "signup":
        await updateUser(
          {
            otp: hasedOtp,
            expiresAt: expireTime,
            otp_purpose: "signup",
          },
          { where: { email: email } },
        );
        break;
      case "forgot_password":
        await updateUser(
          {
            otp: hasedOtp,
            expiresAt: expireTime,
            otp_purpose: "forgot_password",
          },
          { where: { email: email } },
        );
        break;
    }

    // send otp message
    // const result = await sendOtpMessage(`+91${phone}`, otp);

    // if (!result.success) {
    //   return res
    //     .status(400)
    //     .json({ message: "Failed to send otp", success: false });
    // }

    // send email
    await sendEmail({ email: email, otp: otp }, "otp");

    return res
      .status(200)
      .json({ message: "Otp sent successfully", success: true });
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

    // // update isVerified
    user.isVerified = true;
    user.otp = null;
    user.expiresAt = null;
    user.isLogin = true;
    user.otp_purpose = null;
    await user.save();

    // await sendMessage(`+91${phone}`);

    // generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    return res.status(200).json({
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

    return res
      .status(200)
      .json({ message: "Password reset successfully", success: true });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/users/get-stripe-id
const getStripeId = async (req, res, next) => {
  try {
    const userId = req.id;

    const user = await findUserByKey(userId);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    return res.status(200).json({
      message: "Stripe customer id",
      success: true,
      id: user.stripe_customer_id,
    });
  } catch (error) {
    next();
  }
};

// update FCM Token
// PUT /api/v1/users/update-fcm
// private access
const updateFCMToken = async (req, res, next) => {
  try {
    const id = req.id;
    const { fcm_token } = req.body;

    logger.info(`${req.method} ${req.url}`);

    if (!fcm_token) {
      return res.status(400).json({ message: "FCM token is required", success: false });
    }

    const user = await findUserByKey(id);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    await updateUser({ fcm_token: fcm_token }, { where: { id } });

    res.status(200).json({ message: "FCM token updated successfully", success: true });
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
  getStripeId,
  otherUserProfile,
  updateFCMToken,
};
