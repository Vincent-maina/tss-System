const express = require('express');
const { body } = require('express-validator');
const {
  register,
  verifyOTP,
  login,
  resendOTP,
  getMe,
  logout,
  refreshToken,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phoneNumber')
    .matches(/^(\+254|0)[17]\d{8}$/)
    .withMessage('Please provide a valid Kenyan phone number'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('tscNumber')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('TSC number must be exactly 6 digits'),
  body('jobGroup')
    .optional({ checkFalsy: true })
    .isIn(['B5', 'C1', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2', 'D3', 'D4', 'D5'])
    .withMessage('Invalid job group'),
  body('subjects')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Subjects must be an array'),
  body('currentStation.county').optional({ checkFalsy: true }),
  body('currentStation.subCounty').optional({ checkFalsy: true }),
  body('currentStation.schoolName').optional({ checkFalsy: true }),
  body('currentStation.schoolType')
    .optional({ checkFalsy: true })
    .isIn(['Day', 'Boarding', 'Day & Boarding'])
    .withMessage('Invalid school type'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyOTPValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const resendOTPValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
];

const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

// Routes
router.post('/register', registerValidation, validate, register);
router.post('/verify-otp', verifyOTPValidation, validate, verifyOTP);
router.post('/login', loginValidation, validate, login);
router.post('/resend-otp', resendOTPValidation, validate, resendOTP);
router.post('/refresh-token', refreshTokenValidation, validate, refreshToken);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
