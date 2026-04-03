const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html, text, attachments }) => {
  const mailerUser = process.env.EMAIL_USER || process.env.SMTP_USER;

  if (!mailerUser || !(process.env.EMAIL_PASS || process.env.SMTP_PASS)) {
    const err = new Error('Email credentials are missing. Please configure EMAIL_USER and EMAIL_PASS.');
    err.statusCode = 500;
    throw err;
  }

  await getTransporter().sendMail({
    from: `"${process.env.FROM_NAME || 'Vanca Patina'}" <${mailerUser}>`,
    to,
    subject,
    html,
    text,
    attachments,
  });
};

module.exports = sendEmail;
