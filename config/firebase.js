const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin Initialized successfully.");
} catch (error) {
  console.log(
    "Error initializing Firebase Admin. Ensure serviceAccountKey.json exists.",
    error.message,
  );
}

module.exports = admin;
