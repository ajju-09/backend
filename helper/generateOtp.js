const generateOtp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp;
};
const expiresIn = () => {
  const time = new Date(Date.now() + 10 * 60 * 1000);
  return time;
};

module.exports = { generateOtp, expiresIn };
