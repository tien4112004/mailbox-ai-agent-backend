export function templateVerifyMail(
  userName: string,
  verificationUrl: string,
  supportEmail: string,
  appName: string,
): string {
  const textContent = `
Hello ${userName},

Welcome to ${appName}! Please verify your email to activate your account by clicking the link below:

${verificationUrl}

This link expires in 24 hours. If you didn't sign up, please ignore this email.

© ${new Date().getFullYear()} ${appName}. All rights reserved.

If you need help, contact us at ${supportEmail}
`;
  return textContent.trim();
}

export function templateResetPasswordMail(
  userName: string,
  resetUrl: string,
  supportEmail: string,
  appName: string,
): string {
  const textContent = `
Hello ${userName},

We received a request to reset your password for ${appName}. Please click the link below to create a new password:

${resetUrl}

This link expires in 24 hours. If you didn't request this, please ignore this email.

For assistance, contact us at ${supportEmail}

© ${new Date().getFullYear()} ${appName}. All rights reserved.
`;
  return textContent.trim();
}
