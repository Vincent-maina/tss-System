const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '1h',
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      tscNumber,
      jobGroup,
      subjects,
      currentStation,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }, { tscNumber }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }
      if (existingUser.phoneNumber === phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered',
        });
      }
      if (existingUser.tscNumber === tscNumber) {
        return res.status(400).json({
          success: false,
          message: 'TSC number already registered',
        });
      }
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      tscNumber,
      jobGroup,
      subjects,
      currentStation,
      tscVerified: true, // Auto-verify to bypass SMS OTP requirement
    });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // TODO: Send OTP via SMS/Email
    logger.info(`OTP generated for ${email}: ${otp}`);

    // For development, include OTP in response (REMOVE IN PRODUCTION)
    const responseData = {
      success: true,
      message: 'Registration successful. Please verify your account with the OTP sent to your phone.',
      data: {
        userId: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    };

    // Include OTP only in development
    if (process.env.NODE_ENV === 'development') {
      responseData.otp = otp; // REMOVE THIS IN PRODUCTION
    }

    res.status(201).json(responseData);
  } catch (error) {
    logger.error('Registration error:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/v1/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if already verified
    if (user.tscVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account already verified',
      });
    }

    // Verify OTP
    const isValid = user.verifyOTP(otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Mark as verified
    user.tscVerified = true;
    user.otp = undefined; // Clear OTP
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Account verified successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          tscNumber: user.tscNumber,
          jobGroup: user.jobGroup,
          role: user.role,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: `Account blocked. Reason: ${user.blockReason || 'Violation of terms'}`,
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Auto-verify account if it wasn't verified (bypass OTP wall for existing users)
    if (!user.tscVerified) {
      user.tscVerified = true;
    }
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          tscNumber: user.tscNumber,
          jobGroup: user.jobGroup,
          currentStation: user.currentStation,
          profilePhoto: user.profilePhoto,
          role: user.role,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/v1/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.tscVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account already verified',
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();

    // TODO: Send OTP via SMS/Email
    logger.info(`OTP resent for ${email}: ${otp}`);

    const responseData = {
      success: true,
      message: 'OTP sent successfully',
    };

    // Include OTP only in development
    if (process.env.NODE_ENV === 'development') {
      responseData.otp = otp; // REMOVE THIS IN PRODUCTION
    }

    res.status(200).json(responseData);
  } catch (error) {
    logger.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending OTP',
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
    });
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // In a full implementation, you would invalidate the token here
    // For JWT, we'll just send a success message
    // The client should delete the token from storage

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
    });
  }
};

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Get user
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
};
