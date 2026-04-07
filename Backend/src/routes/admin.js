const express = require('express');
const { body } = require('express-validator');
const {
  getAllUsers,
  blockUser,
  verifyTSC,
  getAnalytics,
  approveSwapRequest,
  getAdminLogs,
  deleteUser,
  getAllSwapRequests,
  getAllMatches,
  authorizeChat,
  createAnnouncement,
  sendMessageToUser
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Validation rules
const blockUserValidation = [
  body('block').isBoolean().withMessage('Block must be a boolean'),
  body('reason')
    .if(body('block').equals(true))
    .notEmpty()
    .withMessage('Reason is required when blocking a user'),
];

const approveSwapValidation = [
  body('approve').isBoolean().withMessage('Approve must be a boolean'),
];

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// User management routes
router.get('/users', getAllUsers);
router.put('/users/:id/block', blockUserValidation, validate, blockUser);
router.put('/users/:id/verify', verifyTSC);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/message', sendMessageToUser);

// Announcements
router.post('/announcements', createAnnouncement);

// Swap request management
router.get('/swap-requests', getAllSwapRequests);
router.put('/swap-requests/:id/approve', approveSwapValidation, validate, approveSwapRequest);

// Match management
router.get('/matches', getAllMatches);
router.put('/matches/:id/authorize-chat', validate, authorizeChat);

// Analytics
router.get('/analytics', getAnalytics);

// Admin logs
router.get('/logs', getAdminLogs);

module.exports = router;
