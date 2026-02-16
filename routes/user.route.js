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
} = require("../controllers/user.controller");
const auth = require("../middlewares/auth.middleware");
const imageAuth = require("../middlewares/singleUpload.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

router.get("/profile/:id", auth, profile);
router.get("/getall", auth, getAllUser);
router.get("/search", auth, searchUsers);

router.put("/update", auth, imageAuth, update);

router.delete("/delete", auth, deleteUser);

router.get("/logout", auth, logout);

// photo upload
router.post("/upload", auth, imageAuth, uploadImage);

module.exports = router;
