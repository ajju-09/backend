const generateOtp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp;
};
const expiresIn = () => {
  const time = new Date(Date.now() + 2 * 60 * 1000); // 2 min
  return time;
};

module.exports = { generateOtp, expiresIn };
