const express = require('express');
const { body } = require('express-validator');
const {
  sendMessage,
  getConversation,
  getAllConversations,
  markAsRead,
  deleteMessage,
  getUnreadCount,
  getMatchMessages,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Validation rules
const sendMessageValidation = [
  body('receiverId').notEmpty().withMessage('Receiver ID is required'),
  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters'),
];

// All routes require authentication
router.use(protect);

// Routes
router.post('/', sendMessageValidation, validate, sendMessage);
router.get('/conversations', getAllConversations);
router.get('/unread/count', getUnreadCount);
router.get('/conversation/:userId', getConversation);
router.get('/match/:matchId', getMatchMessages);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteMessage);

module.exports = router;
