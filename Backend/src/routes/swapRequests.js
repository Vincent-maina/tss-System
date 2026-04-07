const express = require('express');
const { body } = require('express-validator');
const {
  createSwapRequest,
  getAllSwapRequests,
  getSwapRequest,
  getMySwapRequests,
  updateSwapRequest,
  deleteSwapRequest,
  searchSwapRequests,
  getSwapRequestStats,
} = require('../controllers/swapRequestController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Validation rules
const createSwapRequestValidation = [
  body('desiredCounties')
    .isArray({ min: 1 })
    .withMessage('At least one desired county is required'),
  body('preferences.maxDistance')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max distance must be a positive number'),
  body('preferences.schoolType')
    .optional()
    .isArray()
    .withMessage('School type must be an array'),
  body('preferences.urgency')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Urgent'])
    .withMessage('Invalid urgency level'),
  body('reason')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Reason cannot exceed 1000 characters'),
];

const updateSwapRequestValidation = [
  body('desiredCounties')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one desired county is required'),
  body('preferences.maxDistance')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max distance must be a positive number'),
  body('reason')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Reason cannot exceed 1000 characters'),
];

// All routes require authentication
router.use(protect);

// Routes
router.post('/', createSwapRequestValidation, validate, createSwapRequest);
router.get('/', getAllSwapRequests);
router.get('/search', searchSwapRequests);
router.get('/stats', getSwapRequestStats);
router.get('/my/requests', getMySwapRequests);
router.get('/:id', getSwapRequest);
router.put('/:id', updateSwapRequestValidation, validate, updateSwapRequest);
router.delete('/:id', deleteSwapRequest);

module.exports = router;
