const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "profileimage/");
  },
  filename: (req, file, cb) => {
    const ext = file.originalname;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// filter file
const filterFile = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only Image files are allowed", false));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: filterFile,
  limits: 1 * 1024 * 1024, // 1MB
});

const imageAuth = upload.single("profile");

module.exports = imageAuth;
