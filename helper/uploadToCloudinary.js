const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = async (file) => {
  try {
    console.log(await cloudinary.api.ping());

    const result = await cloudinary.uploader.upload(file.path, {
      folder: "chat_images",
      resource_type: "auto",
      use_filename: true,
    });

    return result;
  } catch (error) {
    console.log("Error in uploading image to cloudinary", error.message);
  }
};

module.exports = uploadToCloudinary;
