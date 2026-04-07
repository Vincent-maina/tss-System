const express = require('express');
const {
  getMyMatches,
  getMatch,
  expressInterest,
  rejectMatch,
  runMatching,
  getHighCompatibilityMatches,
  getMatchStats,
  getPotentialMatches,
} = require('../controllers/matchController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public teacher routes
router.get('/', getMyMatches);
router.get('/potential', getPotentialMatches);
router.get('/high-compatibility', getHighCompatibilityMatches);
router.get('/stats', getMatchStats);
router.get('/:id', getMatch);
router.post('/:id/interest', expressInterest);
router.post('/:id/reject', rejectMatch);

// Admin only route
router.post('/run-algorithm', authorize('admin'), runMatching);

module.exports = router;
