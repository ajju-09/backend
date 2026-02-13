const nodeMailer = require("nodemailer");
const { otpTemplate } = require("./otpTemplet");
require("dotenv").config();

const sendEmail = async (options) => {
  const transporter = nodeMailer.createTransport({
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
    html: otpTemplate(options.name, options.otp),
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.log("Email service failed", error.message);
  }
};

module.exports = sendEmail;
