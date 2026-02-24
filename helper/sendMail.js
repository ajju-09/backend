const nodemailer = require("nodemailer");
const otpTemplate = require("./otpTemplet");
require("dotenv").config();

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    auth: {
      user: process.env.MAILTRAP_USERNAME,
      pass: process.env.MAILTRAP_PASSWORD,
    },
  });

  const mail = {
    from: "chatme@gmail.com",
    to: options.email,
    subject: `${options.otp} is your account verification code`,
    html: otpTemplate(options.otp),
  };

  try {
    await transporter.sendMail(mail);
    console.log("============================");
    console.log("Email sent....");
    console.log("============================");
  } catch (error) {
    console.log("Email service failed", error.message);
    next(error);
  }
};

module.exports = sendEmail;
