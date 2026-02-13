const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = async (imagePath) => {
  await cloudinary.api.ping((err, result) => {
    if (err) {
      console.log("Ping failed", err);
    }

    console.log("Ping successfully", result);
  });

  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: "chat_images"
    });

    return result;
  } catch (error) {
    console.log("Error in uploading image to cloudinary", error.message);
  }
};

module.exports = uploadToCloudinary;
