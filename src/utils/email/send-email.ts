import nodemailer, { Transporter } from 'nodemailer';
import config from '../../config/config';

interface EmailOptions {
  to: string;
  text: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using Nodemailer with Gmail SMTP.
 * Non-blocking — always resolves (never throws) so it doesn't slow API responses.
 */
const SendEmail = async ({ to, text, subject, html }: EmailOptions): Promise<boolean> => {
  const transporter: Transporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: false, // STARTTLS on port 587
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASSWORD ? config.EMAIL_PASSWORD.replace(/\s+/g, '') : '',
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Inventory System" <${config.EMAIL_FROM}>`,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('[Email] Failed to send email to', to, ':', error);
    return false;
  }
};

export default SendEmail;
