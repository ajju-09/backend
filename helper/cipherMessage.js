const crypto = require("crypto");
require("dotenv").config();

const algorithm = "aes-256-cbc";
const passphrase = process.env.SECRET_PASSWORD || "passkey";

const key = crypto.scryptSync(passphrase, "static_salt", 32);

const encryptMessage = (text) => {
  if (!text) return null;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

//   console.log("============================");
//   console.log("Encrypting message.....");
//   console.log("============================");

  return iv.toString("hex") + ":" + encrypted;
};

const decryptMessage = (encryptedText) => {
  if (!encryptedText) return null;

  const [ivHex, encrypted] = encryptedText.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");

  decrypted += decipher.final("utf8");

//   console.log("============================");
//   console.log("Decrypting message.....");
//   console.log("============================");

  return decrypted;
};

module.exports = { encryptMessage, decryptMessage };
