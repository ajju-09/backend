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
  const allowTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.ms-powerpoint",
    "video/mp4",
    "audio/mpeg",
  ];

  if (allowTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images, docx, pdf & doc are allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  }, // 5 MB
});

const multiUpload = upload.array("images", 2);

module.exports = multiUpload;
