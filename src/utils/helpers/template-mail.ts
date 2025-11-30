export function templateVerifyMail(
  userName: string,
  verificationUrl: string,
  supportEmail: string,
): string {
  const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Xác minh email</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f6f8;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .header {
        background: #4f46e5;
        color: #ffffff;
        text-align: center;
        padding: 20px;
      }
      .header h1 {
        margin: 0;
        font-size: 22px;
      }
      .content {
        padding: 30px 20px;
        color: #333333;
        line-height: 1.6;
      }
      .button {
        display: inline-block;
        margin: 20px 0;
        padding: 12px 24px;
        background-color: #4f46e5;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
      }
      .footer {
        font-size: 12px;
        color: #777777;
        text-align: center;
        padding: 15px 10px;
        background: #f9fafb;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Xác minh email</h1>
      </div>
      <div class="content">
        <p>Xin chào <b>${userName}</b>,</p>
        <p>Cảm ơn bạn đã đăng ký. Vui lòng nhấp vào nút bên dưới để xác minh địa chỉ email của bạn:</p>
        <p style="text-align: center;">
          <a href="${verificationUrl}" class="button">Xác minh ngay</a>
        </p>
        <p>Nếu bạn không yêu cầu tạo tài khoản, vui lòng bỏ qua email này.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Student 360. All rights reserved.</p>
        <p>Nếu bạn cần trợ giúp, vui lòng liên hệ với chúng tôi tại <a href="mailto:${supportEmail}">${supportEmail}</a></p>
      </div>
    </div>
  </body>
</html>
`;
  return htmlContent;
}

export function templateResetPasswordMail(
  resetUrl: string,
  supportEmail: string,
): string {
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Password Reset</title>
  </head>
  <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;">
    <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4; padding:40px 0;">
      <tr>
        <td align="center">
          <table width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color:#007BFF; padding:20px; text-align:center; color:#ffffff; font-size:20px; font-weight:bold;">
                Password Reset Request
              </td>
            </tr>
            <tr>
              <td style="padding:30px; color:#333333; font-size:16px; line-height:1.6;">
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the button below to choose a new one:</p>
                <p style="text-align:center; margin:30px 0;">
                  <a href="${resetUrl}" 
                     style="background-color:#007BFF; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:6px; font-size:16px; display:inline-block;">
                    Reset Password
                  </a>
                </p>
                <p>If you did not request a password reset, please ignore this email or contact support.</p>
                <p>For assistance, contact us at <a href="mailto:${supportEmail}" style="color:#007BFF;">${supportEmail}</a>.</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f4f4f4; padding:15px; text-align:center; font-size:12px; color:#888888;">
                &copy; ${new Date().getFullYear()} Your Company. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return htmlContent;
}
