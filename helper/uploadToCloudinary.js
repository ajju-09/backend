const cloudinary = require("../config/cloudinary");

/**
 * Upload a file to Cloudinary and return structured metadata.
 * @returns {{ url: string, type: string, name: string }}
 *   type: "image" | "video" | "audio" | "pdf" | "document" | "raw"
 */
const uploadToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "chat_files",
      resource_type: "auto",
      use_filename: true,
    });

    // Derive a friendly type so the frontend knows how to render it
    const mime = file.mimetype;
    let type = "raw";

    if (mime.startsWith("image/")) {
      type = "image";
    } else if (mime === "video/mp4") {
      type = "video";
    } else if (mime === "audio/mpeg") {
      type = "audio";
    } else if (mime === "application/pdf") {
      type = "pdf";
    } else if (
      mime === "application/msword" ||
      mime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      type = "document";
    } else if (mime === "application/vnd.ms-powerpoint") {
      type = "document";
    }

    return {
      url: result.secure_url,
      type,
      name: file.originalname,
    };
  } catch (error) {
    console.log("Error in uploading file to cloudinary", error.message);
    throw error;
  }
};

module.exports = uploadToCloudinary;
