const welcomeTemplate = (name, appUrl) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ChatMe</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; color: #1f2937;">
    <div style="background-color: #ffffff; max-width: 600px; margin: 40px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">ChatMe</h1>
            <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">Connect with the world instantly</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px 0; font-size: 22px; color: #111827;">Welcome aboard, ${name}! 👋</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 25px;">
                We are absolutely thrilled to have you join ChatMe. You are now part of a growing community where conversations come alive.
            </p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 15px; color: #334155;">
                    <strong>Ready to get started?</strong> Complete your profile, find your friends, and start chatting right away!
                </p>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="${appUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s;">Go to Dashboard</a>
            </div>
            
            <p style="font-size: 15px; color: #64748b; margin: 0;">
                If you have any questions, simply reply to this email. We're always here to help.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} ChatMe Inc. All rights reserved.<br>
                You received this email because you recently created an account.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

const loginInfoTemplate = (name, time) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome Back</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI', sans-serif; background-color:#f3f4f6; color:#1f2937;">
  
  <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background:#4f46e5; padding:30px 20px; text-align:center;">
      <h1 style="color:#fff; margin:0; font-size:24px;">Welcome Back 👋</h1>
    </div>
    
    <!-- Content -->
    <div style="padding:40px 30px;">
      <p style="font-size:16px; color:#4b5563;">Hi ${name},</p>
      
      <p style="font-size:16px; color:#4b5563; line-height:1.6;">
        You’ve successfully logged in to your <strong>ChatMe</strong> account.
      </p>

      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:20px; margin:25px 0;">
        <p style="margin:0; font-size:14px; color:#374151;">
          🕒 ${time}
        </p>
      </div>

      <p style="font-size:15px; color:#6b7280;">
        Glad to see you again! 🚀  
        Enjoy chatting and exploring ChatMe.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background:#f8fafc; padding:20px; text-align:center; border-top:1px solid #e5e7eb;">
      <p style="font-size:13px; color:#9ca3af; margin:0;">
        © ${new Date().getFullYear()} ChatMe Inc.
      </p>
    </div>
    
  </div>

</body>
</html>
  `;
};
module.exports = { welcomeTemplate, loginInfoTemplate };
