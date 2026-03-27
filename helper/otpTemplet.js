const otpTemplate = (otp) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; color: #1f2937;">
    <div style="background-color: #ffffff; max-width: 600px; margin: 40px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">ChatMe</h1>
        </div>
        <div style="padding: 40px 30px; text-align: center;">
            <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #374151;">Verify Your Account</h2>
            <p style="font-size: 16px; color: #4b5563; margin-bottom: 25px;">Please use the following One-Time Password (OTP) to complete your verification process. This code is valid for 10 minutes.</p>
            
            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin: 0 auto 25px auto; max-width: 300px;">
                <span style="font-size: 32px; font-weight: 700; color: #059669; letter-spacing: 8px;">${otp}</span>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} ChatMe Inc. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

const invoiceTemplate = (name, url, number) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Invoice</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; color: #1f2937;">
    <div style="background-color: #ffffff; max-width: 600px; margin: 40px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Payment Successful</h1>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #1f2937;">Hi ${name},</h2>
            <p style="font-size: 16px; color: #4b5563; margin-bottom: 25px;">Thank you for your payment! Your invoice <strong>#${number}</strong> has been generated successfully and your subscription is active.</p>
            
            <div style="background-color: #eef2ff; border-left: 4px solid #4f46e5; padding: 15px 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 15px; color: #3730a3; font-weight: 500;">Your premium features are now unlocked.</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="${url}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">View Full Invoice</a>
            </div>
            
            <p style="font-size: 13px; color: #6b7280; text-align: center; margin: 0;">If the button doesn't work, copy this link: <br><a href="${url}" style="color: #4f46e5; word-break: break-all;">${url}</a></p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} ChatMe Inc. Thank you for your business.</p>
        </div>
    </div>
</body>
</html>
  `;
};

module.exports = { otpTemplate, invoiceTemplate };
