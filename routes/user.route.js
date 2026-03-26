const express = require("express");
const {
  register,
  login,
  profile,
  deleteUser,
  uploadImage,
  getAllUser,
  update,
  logout,
  searchUsers,
  verifyOtp,
  sendOtp,
  forgotPassword,
  getStripeId,
  otherUserProfile,
  updateFCMToken,
} = require("../controllers/user.controller");
const auth = require("../middlewares/auth.middleware");
const imageAuth = require("../middlewares/singleUpload.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/other-user-profile", auth, otherUserProfile);

router.get("/profile", auth, profile);
router.get("/getall", auth, getAllUser);
router.get("/search", auth, searchUsers);
router.get("/get-stripe-id", auth, getStripeId);

router.put("/update", auth, imageAuth, update);
router.put("/update-fcm", auth, updateFCMToken);

router.delete("/delete", auth, deleteUser);

router.post("/logout", auth, logout);

// photo upload
router.post("/upload", auth, imageAuth, uploadImage);

module.exports = router;
