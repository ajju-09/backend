const otpTemplate = (name, otp) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f4f6f8;
          padding: 20px;
        }
        .card {
          max-width: 400px;
          background: white;
          margin: auto;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        .otp {
          font-size: 28px;
          letter-spacing: 5px;
          color: #2563eb;
          font-weight: bold;
        }
        .footer {
          font-size: 12px;
          color: gray;
          margin-top: 20px;
        }
        h1 {
          border: 2px solid black;
          background-color: #9ccfff;
          border-radius: 20px;
        }
      </style>
    </head>

    <body>
      <div class="card">
        <h1>ChatMe</h1>
        <h2>Hello ${name.toUpperCase()},</h2>
        <p>Your OTP for account verification is:</p>

        <div class="otp">${otp}</div>

        <p>This OTP is valid for 10 minutes.</p>
      </div>
    </body>
  </html>


  `;
};

module.exports = otpTemplate;
