const express = require('express');
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile,
  changePassword,
  uploadPhoto,
  deletePhoto,
  getAllUsers,
  getUserById,
  deleteAccount,
  getAnnouncements,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const upload = require('../config/multer');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phoneNumber')
    .optional()
    .matches(/^(\+254|0)[17]\d{8}$/)
    .withMessage('Please provide a valid Kenyan phone number'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  body('subjects')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Subjects must be an array'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

const deleteAccountValidation = [
  body('password').notEmpty().withMessage('Password is required to delete account'),
];

// All routes require authentication
router.use(protect);

// Announcements (global broadcast feed)
router.get('/announcements', getAnnouncements);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, validate, updateProfile);
router.put('/password', changePasswordValidation, validate, changePassword);

// Photo routes
router.post('/upload-photo', upload.single('photo'), uploadPhoto);
router.delete('/photo', deletePhoto);

// User discovery routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);

// Account deletion
router.delete('/account', deleteAccountValidation, validate, deleteAccount);

module.exports = router;
