const nodemailer = require("nodemailer");
const { otpTemplate, invoiceTemplate } = require("./otpTemplet");
require("dotenv").config();

const sendEmail = async (options, purpose) => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    secure: true,
    family: 4,
    auth: {
      user: process.env.MAILTRAP_USERNAME,
      pass: process.env.MAILTRAP_PASSWORD,
    },
  });

  console.log("Host", process.env.MAILTRAP_HOST);
  console.log("PORT", process.env.MAILTRAP_PORT);
  console.log("USERNAME", process.env.MAILTRAP_USERNAME);
  console.log("PASSWORD", process.env.MAILTRAP_PASSWORD);

  transporter.verify((err) => {
    if (err) {
      console.log("Mail server connection failed", err.message);
    }

    console.log("Mail server is Up & Running....");
  });

  let mail;

  switch (purpose) {
    case "otp":
      mail = {
        from: "chatme@gmail.com",
        to: options.email,
        subject: `${options.otp} is your account verification code`,
        html: otpTemplate(options.otp),
      };
      break;

    case "invoice":
      mail = {
        from: "chatme@gmail.com",
        to: options.email,
        subject: "Payment to ChatMe is Successfull",
        html: invoiceTemplate(options.name, options.url, options.number),
      };
      break;

    default:
      console.log("Invalid email purpose");
  }

  try {
    await transporter.sendMail(mail);
    console.log("============================");
    console.log("Email sent....");
    console.log("============================");
  } catch (error) {
    console.log("Email service failed", error.message);
  }
};

sendEmail({ email: "codetech1432@gmail.com", }, "otp");

module.exports = sendEmail;
