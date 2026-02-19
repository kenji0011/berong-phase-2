import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendPasswordResetEmail(
  to: string,
  username: string,
  newPassword: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BFP SafeScape" <noreply@bfp-safescape.com>',
      to,
      subject: 'Your Password Has Been Reset — BFP SafeScape',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ea580c;">🔥 BFP SafeScape</h2>
            <p style="color: #666;">Fire Safety E-Learning Platform</p>
          </div>
          <hr style="border: 1px solid #eee;" />
          <h3>Password Reset</h3>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Your password has been reset. Here is your new temporary password:</p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
            <code style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #ea580c;">${newPassword}</code>
          </div>
          <p>Please log in with this password and change it as soon as possible.</p>
          <hr style="border: 1px solid #eee; margin-top: 24px;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you did not request this reset, please contact the administrator immediately.
          </p>
        </div>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return false
  }
}

export function generateRandomPassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendVerificationCodeEmail(
  to: string,
  username: string,
  code: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BFP SafeScape" <noreply@bfp-safescape.com>',
      to,
      subject: 'Password Reset Verification Code — BFP SafeScape',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ea580c;">🔥 BFP SafeScape</h2>
            <p style="color: #666;">Fire Safety E-Learning Platform</p>
          </div>
          <hr style="border: 1px solid #eee;" />
          <h3>Password Reset Verification</h3>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Someone requested a password reset for your account. Use the code below to verify your identity:</p>
          <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; margin: 16px 0;">
            <code style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ea580c;">${code}</code>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
          <hr style="border: 1px solid #eee; margin-top: 24px;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you did not request this, you can safely ignore this email. Your password will not be changed.
          </p>
        </div>
      `,
    })
    return true
  } catch (error) {
    console.error('Failed to send verification code email:', error)
    return false
  }
}

