const User = require('../models/User');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      bio,
      currentStation,
      subjects,
      jobGroup,
    } = req.body;

    // Fields allowed to update
    const fieldsToUpdate = {};

    if (firstName) fieldsToUpdate.firstName = firstName;
    if (lastName) fieldsToUpdate.lastName = lastName;
    if (phoneNumber) fieldsToUpdate.phoneNumber = phoneNumber;
    if (bio) fieldsToUpdate.bio = bio;
    if (subjects) fieldsToUpdate.subjects = subjects;
    if (jobGroup) fieldsToUpdate.jobGroup = jobGroup;
    if (currentStation) fieldsToUpdate.currentStation = currentStation;

    // Check if phone number is already used by another user
    if (phoneNumber) {
      const existingUser = await User.findOne({
        phoneNumber,
        _id: { $ne: req.user.id },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use',
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Update profile error:', error);

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
      message: 'Error updating profile',
    });
  }
};

// @desc    Change password
// @route   PUT /api/v1/users/password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
    });
  }
};

// @desc    Upload profile photo
// @route   POST /api/v1/users/upload-photo
// @access  Private
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Only JPEG, JPG, and PNG images are allowed',
      });
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Image size must be less than 5MB',
      });
    }

    // Delete old photo if exists
    const user = await User.findById(req.user.id);
    if (user.profilePhoto) {
      const oldPhotoPath = path.join(__dirname, '../../', user.profilePhoto);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update user with new photo path
    const photoPath = `/uploads/profiles/${req.file.filename}`;
    user.profilePhoto = photoPath;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profilePhoto: photoPath,
      },
    });
  } catch (error) {
    logger.error('Upload photo error:', error);

    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading photo',
    });
  }
};

// @desc    Delete profile photo
// @route   DELETE /api/v1/users/photo
// @access  Private
exports.deletePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.profilePhoto) {
      return res.status(400).json({
        success: false,
        message: 'No profile photo to delete',
      });
    }

    // Delete photo file
    const photoPath = path.join(__dirname, '../../', user.profilePhoto);
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }

    // Update user
    user.profilePhoto = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully',
    });
  } catch (error) {
    logger.error('Delete photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting photo',
    });
  }
};

// @desc    Get all users (for search/discovery)
// @route   GET /api/v1/users
// @access  Private
exports.getAllUsers = async (req, res) => {
  try {
    const {
      county,
      jobGroup,
      subjects,
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    const query = { isActive: true, isBlocked: false };

    if (county) {
      query['currentStation.county'] = county;
    }

    if (jobGroup) {
      query.jobGroup = jobGroup;
    }

    if (subjects) {
      query.subjects = { $in: subjects.split(',') };
    }

    // Execute query with pagination
    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: users,
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/v1/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
    });
  }
};

// @desc    Delete account (soft delete)
// @route   DELETE /api/v1/users/account
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your password to confirm',
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
      });
    }

    // Soft delete - deactivate account
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully',
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
    });
  }
};

// @desc    Get active announcements
// @route   GET /api/v1/users/announcements
// @access  Private
exports.getAnnouncements = async (req, res) => {
  try {
    const Announcement = require('../models/Announcement');
    const announcements = await Announcement.find({ isActive: true })
      .populate('createdBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(10); // Limit to top 10 most recent active announcements

    res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    logger.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching announcements',
    });
  }
};
