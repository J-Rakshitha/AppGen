import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const transporter = nodemailer.createTransport(
  process.env.SMTP_URL
    ? process.env.SMTP_URL
    : {
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      }
);

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.SMTP_USER && !process.env.SMTP_URL) {
    console.log(`[EMAIL MOCK] To: ${options.to} | Subject: ${options.subject}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@appgen.dev',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
