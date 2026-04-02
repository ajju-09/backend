const admin = require("../config/firebase");

const sendFCMNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) {
    console.log("No FCM token provided. Skipping Push Notification.");
    return false;
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: data,
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent push notification:", response);
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error.message);
    if (error.code) {
      console.error("FCM Error Code:", error.code);
    }
    return false;
  }
};

module.exports = sendFCMNotification;
