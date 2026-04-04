const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  registerUser,
  authUser,
  logoutUser,
  refreshToken,
  adminLogin,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validators/validate');
const {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/schemas');

// Rate limit for login attempts (5 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const authActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests for this authentication action, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for registration (10 attempts per hour)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, validate(registerSchema), registerUser);
router.post('/login', loginLimiter, validate(loginSchema), authUser);
router.post('/admin-login', loginLimiter, validate(loginSchema), adminLogin);
router.get('/me', protect, getCurrentUser);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authActionLimiter, validate(resendVerificationSchema), resendVerificationEmail);
router.post('/forgot-password', authActionLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authActionLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/logout', protect, logoutUser);
router.post('/refresh', refreshToken);

module.exports = router;
