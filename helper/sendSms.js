const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const sendOtpViaSms = async (phone) => {
  try {
    const res = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_ID)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    return {
      success: true,
      status: res.status,
    };
  } catch (error) {
    console.log("Error in send otp", error);
  }
};

const verifyOtpviaSms = async (phone, code) => {
  try {
    const res = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_ID)
      .verificationChecks.create({
        to: phone,
        code,
      });

    return {
      success: res.status === "approved",
      status: res.status,
    };
  } catch (error) {
    console.log("Error in verify otp", error);
  }
};

const sendMessage = async (phone) => {
  try {
    const res = await client.messages.create({
      body: "Welcome 🎉 You have successfully logged in to ChatMe.",
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return {
      success: res.status,
      status: res.status,
    };
  } catch (error) {
    console.log("Error in send message", error);
  }
};

module.exports = { sendOtpViaSms, verifyOtpviaSms, sendMessage };
