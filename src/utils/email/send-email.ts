import nodemailer, { Transporter } from 'nodemailer';
import config from '../../config/config';

// Define the function's parameter types
interface EmailOptions {
  to: string;
  text: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using nodemailer.
 *
 * @param to - The recipient's email address.
 * @param text - The plain text content of the email.
 * @param subject - The subject of the email.
 * @param html - The HTML content of the email.
 * @returns {Promise<boolean>} - A promise that resolves to true if the email is sent successfully, or false if an error occurs.
 */
const SendEmail = async ({ to, text, subject, html }: EmailOptions): Promise<boolean> => {
  const transporter: Transporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: false,
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: config.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

export default SendEmail;
