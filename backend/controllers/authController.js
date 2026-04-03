const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/sendEmail');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

const getFrontendBaseUrl = () =>
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL?.split(',')[0]?.trim() ||
  'http://localhost:5173';

const getBackendBaseUrl = () =>
  process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

const buildAuthResponse = (user, accessToken, refreshToken) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  role: user.role,
  isVerified: user.isVerified,
  accessToken,
  refreshToken,
});

const createRawToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');

const createExpiringToken = (ttlMs) => ({
  rawToken: createRawToken(),
  expiresAt: new Date(Date.now() + ttlMs),
});

const buildVerificationEmailTemplate = (name, verificationUrl) => ({
  subject: 'Verify your email for Vanca Patina',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #18181b;">
      <div style="padding: 32px 24px; background: linear-gradient(135deg, #f6efe0 0%, #fff8ec 100%); border-radius: 20px; border: 1px solid #e7d9b3;">
        <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #8a6a13;">Vanca Patina</p>
        <h1 style="margin: 0 0 16px; font-size: 28px; line-height: 1.2;">Welcome, ${name}</h1>
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #3f3f46;">
          Thanks for creating your account. Please verify your email address to activate your access and start shopping.
        </p>
        <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.7; color: #3f3f46;">
          This verification link will expire in 1 hour for security reasons.
        </p>
        <a
          href="${verificationUrl}"
          style="display: inline-block; padding: 14px 24px; background: #b78a1f; color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 700;"
        >
          Verify Email
        </a>
        <p style="margin: 24px 0 8px; font-size: 13px; color: #52525b;">If the button does not work, use this link:</p>
        <p style="margin: 0; font-size: 13px; word-break: break-all; color: #7c5f13;">${verificationUrl}</p>
      </div>
    </div>
  `,
});

const buildPasswordResetEmailTemplate = (name, resetUrl) => ({
  subject: 'Reset your Vanca Patina password',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #18181b;">
      <div style="padding: 32px 24px; background: linear-gradient(135deg, #f6efe0 0%, #fff8ec 100%); border-radius: 20px; border: 1px solid #e7d9b3;">
        <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #8a6a13;">Vanca Patina</p>
        <h1 style="margin: 0 0 16px; font-size: 28px; line-height: 1.2;">Reset your password</h1>
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #3f3f46;">
          Hi ${name}, we received a request to reset your password. Use the secure link below to choose a new password.
        </p>
        <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.7; color: #3f3f46;">
          This reset link expires in 30 minutes. If you did not request this, you can safely ignore this email.
        </p>
        <a
          href="${resetUrl}"
          style="display: inline-block; padding: 14px 24px; background: #b78a1f; color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 700;"
        >
          Reset Password
        </a>
        <p style="margin: 24px 0 8px; font-size: 13px; color: #52525b;">If the button does not work, use this link:</p>
        <p style="margin: 0; font-size: 13px; word-break: break-all; color: #7c5f13;">${resetUrl}</p>
      </div>
    </div>
  `,
});

const sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${getBackendBaseUrl()}/api/auth/verify-email/${verificationToken}?email=${encodeURIComponent(user.email)}`;
  const { subject, html } = buildVerificationEmailTemplate(user.name, verificationUrl);

  await sendEmail({
    to: user.email,
    subject,
    html,
  });
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = new URL('/reset-password', getFrontendBaseUrl());
  resetUrl.searchParams.set('token', resetToken);
  resetUrl.searchParams.set('email', user.email);

  const { subject, html } = buildPasswordResetEmailTemplate(user.name, resetUrl.toString());

  await sendEmail({
    to: user.email,
    subject,
    html,
  });
};

const setVerificationTokenForUser = async (user) => {
  const { rawToken, expiresAt } = createExpiringToken(EMAIL_VERIFICATION_TTL_MS);

  user.verificationTokenHash = hashToken(rawToken);
  user.verificationTokenExpires = expiresAt;

  return {
    verificationToken: rawToken,
    verificationTokenExpires: expiresAt,
  };
};

const setPasswordResetTokenForUser = (user) => {
  const { rawToken, expiresAt } = createExpiringToken(PASSWORD_RESET_TTL_MS);

  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetTokenExpires = expiresAt;

  return {
    resetToken: rawToken,
    resetTokenExpires: expiresAt,
  };
};

const purgeExpiredRefreshTokens = (user) => {
  user.refreshTokens = user.refreshTokens.filter((entry) => entry.expiresAt > new Date());
};

const issueSession = async (user) => {
  purgeExpiredRefreshTokens(user);

  const refreshToken = generateRefreshToken(user._id);
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  await user.save();

  return buildAuthResponse(user, generateAccessToken(user._id), refreshToken);
};

const redirectToFrontendVerificationPage = (res, status, message, email) => {
  const url = new URL('/email-verification', getFrontendBaseUrl());
  url.searchParams.set('status', status);
  url.searchParams.set('message', message);

  if (email) {
    url.searchParams.set('email', email);
  }

  return res.redirect(url.toString());
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    if (userExists.isVerified) {
      const err = new Error('An account with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    const { verificationToken } = await setVerificationTokenForUser(userExists);
    await userExists.save();
    await sendVerificationEmail(userExists, verificationToken);

    return res.status(200).json({
      message: 'Your account already exists but is not verified. We sent a fresh verification email.',
      email: userExists.email,
      requiresVerification: true,
    });
  }

  const user = new User({
    name,
    email,
    password,
    isVerified: false,
  });

  const { verificationToken } = await setVerificationTokenForUser(user);
  await user.save();
  await sendVerificationEmail(user, verificationToken);

  res.status(201).json({
    message: 'Verification email sent. Please check your inbox before logging in.',
    email: user.email,
    requiresVerification: true,
  });
});

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isVerified) {
    const err = new Error('Please verify your email before login');
    err.statusCode = 403;
    throw err;
  }

  if (user.isBlocked) {
    const err = new Error('Account is blocked');
    err.statusCode = 403;
    throw err;
  }

  res.json(await issueSession(user));
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password))) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  if (user.role !== 'admin') {
    const err = new Error('Access denied: admins only');
    err.statusCode = 403;
    throw err;
  }

  if (user.isBlocked) {
    const err = new Error('Account is blocked');
    err.statusCode = 403;
    throw err;
  }

  res.json(await issueSession(user));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    phone: req.user.phone || '',
    role: req.user.role,
    isVerified: req.user.isVerified,
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    req.user.refreshTokens = req.user.refreshTokens.filter((entry) => entry.token !== refreshToken);
    await req.user.save();
  }

  res.json({ message: 'Logged out successfully' });
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    const err = new Error('Refresh token required');
    err.statusCode = 400;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 401;
    throw err;
  }

  const storedToken = user.refreshTokens.find(
    (entry) => entry.token === token && entry.expiresAt > new Date()
  );

  if (!storedToken) {
    const err = new Error('Refresh token not recognised or expired');
    err.statusCode = 401;
    throw err;
  }

  if (user.isBlocked) {
    const err = new Error('Account is blocked');
    err.statusCode = 403;
    throw err;
  }

  if (!user.isVerified) {
    const err = new Error('Please verify your email before login');
    err.statusCode = 403;
    throw err;
  }

  user.refreshTokens = user.refreshTokens.filter((entry) => entry.token !== token && entry.expiresAt > new Date());

  const newRefreshToken = generateRefreshToken(user._id);
  user.refreshTokens.push({
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  await user.save();

  res.json({
    accessToken: generateAccessToken(user._id),
    refreshToken: newRefreshToken,
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const fallbackEmail = req.query.email;

  const user = await User.findOne({
    verificationTokenHash: hashToken(token),
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return redirectToFrontendVerificationPage(
      res,
      'error',
      'This verification link is invalid or has expired.',
      fallbackEmail
    );
  }

  user.isVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  return redirectToFrontendVerificationPage(
    res,
    'success',
    'Your email has been verified. You can now log in.',
    user.email
  );
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user || user.isVerified) {
    return res.json({
      message: 'If an account with this email needs verification, we have sent a new verification email.',
      email,
      requiresVerification: true,
    });
  }

  const { verificationToken } = await setVerificationTokenForUser(user);
  await user.save();
  await sendVerificationEmail(user, verificationToken);

  res.json({
    message: 'If an account with this email needs verification, we have sent a new verification email.',
    email: user.email,
    requiresVerification: true,
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user && user.isVerified && !user.isBlocked) {
    const { resetToken } = setPasswordResetTokenForUser(user);
    await user.save();
    await sendPasswordResetEmail(user, resetToken);
  }

  res.json({
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error('This password reset link is invalid or has expired');
    err.statusCode = 400;
    throw err;
  }

  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpires = undefined;
  user.refreshTokens = [];
  await user.save();

  res.json({
    message: 'Your password has been reset. Please log in with your new password.',
  });
});

module.exports = {
  registerUser,
  authUser,
  logoutUser,
  refreshToken,
  adminLogin,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
};
