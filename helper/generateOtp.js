const generateOtp = () => {
    const otp = Math.floor(Math.round() * 1000000);
    return otp;
}

module.exports = generateOtp;