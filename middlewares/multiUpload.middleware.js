const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "imageUploads/");
//   },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    const ext = path.extname(file.originalname);

    cb(null, file.fieldname + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: 5 * 1024 * 1024, // 5 MB
});

const multiUpload = upload.array("images", 2);

module.exports = multiUpload;
