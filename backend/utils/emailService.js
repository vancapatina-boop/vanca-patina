const sendEmail = require('./sendEmail');

// Send OTP email
const sendOtpEmail = async (email, otp) => {
  await sendEmail({
    to: email,
    subject: 'Your OTP for Vanca Patina',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Vanca Patina</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #007bff;">${otp}</span>
        </div>
        <p>This OTP will expire in 5 minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  });
};

const sendInvoiceEmail = async ({
  email,
  customerName,
  invoiceNumber,
  invoiceUrl,
  orderId,
}) => {
  await sendEmail({
    to: email,
    subject: `Your invoice ${invoiceNumber} is ready`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
        <h2 style="margin-bottom: 16px;">Invoice Ready</h2>
        <p>Hello ${customerName},</p>
        <p>Your invoice for order <strong>${orderId}</strong> is now available.</p>
        <p style="margin: 24px 0;">
          <a
            href="${invoiceUrl}"
            style="display: inline-block; background: #1f2937; color: white; text-decoration: none; padding: 12px 18px; border-radius: 8px;"
          >
            Download Invoice
          </a>
        </p>
        <p>Invoice Number: <strong>${invoiceNumber}</strong></p>
        <p style="color: #6b7280; font-size: 13px;">If the button does not work, copy this link into your browser: ${invoiceUrl}</p>
      </div>
    `,
    text: `Your invoice ${invoiceNumber} for order ${orderId} is ready: ${invoiceUrl}`,
  });
};

module.exports = { sendOtpEmail, sendInvoiceEmail };
