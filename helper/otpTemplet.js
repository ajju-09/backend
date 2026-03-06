const otpTemplate = (otp) => {
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
        <p>Your OTP for account verification is:</p>

        <div class="otp">${otp}</div>

        <p>This OTP is valid for 10 minutes.</p>
      </div>
    </body>
  </html>


  `;
};

const invoiceTemplate = (name, url, number) => {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Your Invoice - ChatMe</title>
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #91aecb;
      font-family: Arial, sans-serif;
    "
  >
    <table width="100%" cellspacing="0" cellpadding="0" style="padding: 20px">
      <tr>
        <td align="center">
          <!-- Card Container -->
          <table
            width="100%"
            max-width="500px"
            cellspacing="0"
            cellpadding="0"
            style="
              background: #fefefe;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            "
          >
            <!-- Header -->
            <tr>
              <td align="center" style="padding-bottom: 20px">
                <h1
                  style="
                    margin: 0;
                    padding: 10px 20px;
                    background: #44c3d6;
                    color: white;
                    border-radius: 20px;
                    font-size: 24px;
                  "
                >
                  ChatMe
                </h1>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding-bottom: 15px; font-size: 16px; color: #333">
                Hi ${name},
              </td>
            </tr>

            <!-- Message -->
            <tr>
              <td style="padding-bottom: 15px; font-size: 14px; color: #555">
                Your invoice <strong>#${number}</strong> has been
                generated successfully.
              </td>
            </tr>

            <!-- CTA Button -->
            <tr>
              <td align="center" style="padding: 25px 0">
                <a
                  href="${url}"
                  target="_blank"
                  style="
                    background-color: #2563eb;
                    color: white;
                    padding: 12px 25px;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: bold;
                    border-radius: 6px;
                    display: inline-block;
                  "
                >
                  View Invoice
                </a>
              </td>
            </tr>

            <!-- Fallback Link -->
            <tr>
              <td style="font-size: 12px; color: #888; word-break: break-all">
                If the button doesn’t work, copy and paste this link into your
                browser:<br />
                <a
                  href="${url}"
                  target="_blank"
                  style="color: #2563eb"
                >
                  ${url}
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="
                  padding-top: 25px;
                  font-size: 12px;
                  color: #999;
                  text-align: center;
                "
              >
                © 2026 ChatMe. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

module.exports = { otpTemplate, invoiceTemplate };
