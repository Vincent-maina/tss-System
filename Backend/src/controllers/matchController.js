const Match = require('../models/Match');
const SwapRequest = require('../models/SwapRequest');
const User = require('../models/User');
const { runMatchingAlgorithm, getMatchesForTeacher, calculateCompatibilityScore } = require('../services/matchingService');
const logger = require('../utils/logger');

// @desc    Get my matches
// @route   GET /api/v1/matches
// @access  Private
exports.getMyMatches = async (req, res) => {
  try {
    const { minScore = 0, page = 1, limit = 20 } = req.query;

    const matches = await getMatchesForTeacher(req.user.id, parseInt(minScore));

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedMatches = matches.slice(startIndex, endIndex);

    // Redact other teacher's identity if admin has not authorized
    const sanitizedMatches = paginatedMatches.map(m => {
      const matchObj = m.toObject ? m.toObject() : m;
      if (!matchObj.adminApproved) {
        if (matchObj.teacher1 && matchObj.teacher1._id.toString() !== req.user.id) {
          matchObj.teacher1.firstName = 'Matched';
          matchObj.teacher1.lastName = 'Teacher';
          matchObj.teacher1.email = 'hidden@mwalimulink.com';
          matchObj.teacher1.phoneNumber = 'hidden';
          matchObj.teacher1.profilePhoto = undefined;
        } else if (matchObj.teacher2 && matchObj.teacher2._id.toString() !== req.user.id) {
          matchObj.teacher2.firstName = 'Matched';
          matchObj.teacher2.lastName = 'Teacher';
          matchObj.teacher2.email = 'hidden@mwalimulink.com';
          matchObj.teacher2.phoneNumber = 'hidden';
          matchObj.teacher2.profilePhoto = undefined;
        }
      }
      return matchObj;
    });

    res.status(200).json({
      success: true,
      count: sanitizedMatches.length,
      total: matches.length,
      totalPages: Math.ceil(matches.length / limit),
      currentPage: parseInt(page),
      data: sanitizedMatches,
    });
  } catch (error) {
    logger.error('Get my matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching matches',
    });
  }
};

// @desc    Get single match details
// @route   GET /api/v1/matches/:id
// @access  Private
exports.getMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('teacher1', 'firstName lastName email phoneNumber profilePhoto currentStation jobGroup subjects bio')
      .populate('teacher2', 'firstName lastName email phoneNumber profilePhoto currentStation jobGroup subjects bio')
      .populate('requestId1')
      .populate('requestId2');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Check if user is part of this match
    if (
      match.teacher1._id.toString() !== req.user.id &&
      match.teacher2._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this match',
      });
    }

    // Mark as viewed
    await match.markViewed(req.user.id);

    const matchObj = match.toObject();
    if (!matchObj.adminApproved && req.user.role !== 'admin') {
      if (matchObj.teacher1 && matchObj.teacher1._id.toString() !== req.user.id) {
        matchObj.teacher1.firstName = 'Matched';
        matchObj.teacher1.lastName = 'Teacher';
        matchObj.teacher1.email = 'hidden@mwalimulink.com';
        matchObj.teacher1.phoneNumber = 'hidden';
        matchObj.teacher1.profilePhoto = undefined;
      } else if (matchObj.teacher2 && matchObj.teacher2._id.toString() !== req.user.id) {
        matchObj.teacher2.firstName = 'Matched';
        matchObj.teacher2.lastName = 'Teacher';
        matchObj.teacher2.email = 'hidden@mwalimulink.com';
        matchObj.teacher2.phoneNumber = 'hidden';
        matchObj.teacher2.profilePhoto = undefined;
      }
    }

    res.status(200).json({
      success: true,
      data: matchObj,
    });
  } catch (error) {
    logger.error('Get match error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match',
    });
  }
};

// @desc    Express interest in a match
// @route   POST /api/v1/matches/:id/interest
// @access  Private
exports.expressInterest = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('teacher1', 'firstName lastName email')
      .populate('teacher2', 'firstName lastName email');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Check if user is part of this match
    if (
      match.teacher1._id.toString() !== req.user.id &&
      match.teacher2._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to interact with this match',
      });
    }

    // Express interest
    await match.expressInterest(req.user.id);

    // Check if both teachers are interested
    if (match.status === 'mutual_interest') {
      // Update swap requests to show they're matched
      await SwapRequest.findByIdAndUpdate(match.requestId1, {
        status: 'matched',
        matchedWith: match.teacher2._id,
        matchedRequestId: match.requestId2,
        'mutualAcceptance.thisSideAccepted': true,
      });

      await SwapRequest.findByIdAndUpdate(match.requestId2, {
        status: 'matched',
        matchedWith: match.teacher1._id,
        matchedRequestId: match.requestId1,
        'mutualAcceptance.thisSideAccepted': true,
      });
    }

    // CREATE AN INITIAL MESSAGE TO OPEN THE CHAT THREAD IN THE UI
    const Message = require('../models/Message');

    // Determine the other teacher
    const receiverId = match.teacher1._id.toString() === req.user.id
      ? match.teacher2._id
      : match.teacher1._id;

    // We generate a system message to bootstrap the conversation thread
    await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      match: match._id,
      content: match.status === 'mutual_interest'
        ? 'Mutual match confirmed! Both parties have connected. You can now chat to organize your swap.'
        : 'I have expressed interest in our match. Looking forward to connecting!',
      messageType: 'system' // System message so it stands out
    });

    res.status(200).json({
      success: true,
      message:
        match.status === 'mutual_interest'
          ? 'Both teachers are interested! You can now proceed to chat and finalize the swap.'
          : 'Interest expressed successfully',
      data: match,
    });
  } catch (error) {
    logger.error('Express interest error:', error);
    res.status(500).json({
      success: false,
      message: 'Error expressing interest',
    });
  }
};

// @desc    Reject a match
// @route   POST /api/v1/matches/:id/reject
// @access  Private
exports.rejectMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Check if user is part of this match
    if (
      match.teacher1._id.toString() !== req.user.id &&
      match.teacher2._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to interact with this match',
      });
    }

    // Reject match
    await match.rejectMatch(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Match rejected',
      data: match,
    });
  } catch (error) {
    logger.error('Reject match error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting match',
    });
  }
};

// @desc    Run matching algorithm manually (for testing/admin)
// @route   POST /api/v1/matches/run-algorithm
// @access  Private (Admin only)
exports.runMatching = async (req, res) => {
  try {
    const result = await runMatchingAlgorithm();

    res.status(200).json({
      success: true,
      message: 'Matching algorithm completed successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Run matching error:', error);
    res.status(500).json({
      success: false,
      message: 'Error running matching algorithm',
    });
  }
};

// @desc    Get high compatibility matches (score >= 75)
// @route   GET /api/v1/matches/high-compatibility
// @access  Private
exports.getHighCompatibilityMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [{ teacher1: req.user.id }, { teacher2: req.user.id }],
      compatibilityScore: { $gte: 75 },
      status: {
        $in: ['pending', 'viewed_by_teacher1', 'viewed_by_teacher2', 'viewed_by_both'],
      },
    })
      .populate('teacher1', 'firstName lastName email profilePhoto currentStation jobGroup subjects')
      .populate('teacher2', 'firstName lastName email profilePhoto currentStation jobGroup subjects')
      .populate('requestId1')
      .populate('requestId2')
      .sort({ compatibilityScore: -1 });

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    logger.error('Get high compatibility matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching high compatibility matches',
    });
  }
};

// @desc    Get match statistics
// @route   GET /api/v1/matches/stats
// @access  Private
exports.getMatchStats = async (req, res) => {
  try {
    const totalMatches = await Match.countDocuments({
      $or: [{ teacher1: req.user.id }, { teacher2: req.user.id }],
    });

    const highCompatibility = await Match.countDocuments({
      $or: [{ teacher1: req.user.id }, { teacher2: req.user.id }],
      compatibilityScore: { $gte: 75 },
    });

    const mutualInterest = await Match.countDocuments({
      $or: [{ teacher1: req.user.id }, { teacher2: req.user.id }],
      status: 'mutual_interest',
    });

    const pending = await Match.countDocuments({
      $or: [{ teacher1: req.user.id }, { teacher2: req.user.id }],
      status: { $in: ['pending', 'viewed_by_teacher1', 'viewed_by_teacher2', 'viewed_by_both'] },
    });

    res.status(200).json({
      success: true,
      data: {
        totalMatches,
        highCompatibility,
        mutualInterest,
        pending,
      },
    });
  } catch (error) {
    logger.error('Get match stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match statistics',
    });
  }
};
// @desc    Get all potential matches (Compatibility Discovery)
// @route   GET /api/v1/matches/potential
// @access  Private
exports.getPotentialMatches = async (req, res) => {
  try {
    const { county, subjects, jobGroup, page = 1, limit = 20 } = req.query;

    // 1. Get user's active swap request
    const myRequest = await SwapRequest.findOne({
      teacher: req.user.id,
      status: 'active'
    });

    if (!myRequest) {
      return res.status(200).json({
        success: true,
        message: 'Post a swap request to see potential matches',
        data: [],
        count: 0
      });
    }

    // 2. Find all OTHER active requests
    const query = {
      _id: { $ne: myRequest._id },
      teacher: { $ne: req.user.id },
      status: 'active',
      isVisible: true
    };

    // Apply basic filters if provided (as optimization)
    if (county) query.currentCounty = county;
    
    const otherRequests = await SwapRequest.find(query)
      .populate('teacher', 'firstName lastName email profilePhoto currentStation jobGroup subjects bio');

    // Filter out any requests that have a null teacher (safety check)
    const validOtherRequests = otherRequests.filter(r => r.teacher !== null);

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2.5 Find all existing official matches for this user to check approval status
    const existingMatches = await Match.find({
      $or: [{ teacher1: req.user.id }, { teacher2: req.user.id }]
    });

    // Map otherRequestId -> Match document for fast lookup
    const matchLookup = new Map();
    existingMatches.forEach(m => {
      const otherRequestId = m.requestId1.toString() === myRequest._id.toString() 
        ? m.requestId2.toString() 
        : m.requestId1.toString();
      matchLookup.set(otherRequestId, m);
    });

    // 3. Calculate compatibility for each
    const potentialMatches = validOtherRequests.map(otherReq => {
      try {
        const compatibility = calculateCompatibilityScore(
          currentUser, 
          otherReq.teacher, 
          myRequest, 
          otherReq
        );

        const existingMatch = matchLookup.get(otherReq._id.toString());

        return {
          _id: existingMatch ? existingMatch._id : `potential_${otherReq._id}`, // Use real ID if exists
          teacher1: currentUser.toObject(), 
          teacher2: otherReq.teacher.toObject(),
          requestId1: myRequest._id,
          requestId2: otherReq._id,
          compatibilityScore: compatibility.totalScore,
          scoreBreakdown: compatibility.breakdown,
          matchLevel: compatibility.matchLevel,
          adminApproved: existingMatch ? existingMatch.adminApproved : null, // Check existing match status
          status: existingMatch ? existingMatch.status : 'potential',
          isPotential: !existingMatch
        };
      } catch (err) {
        logger.error(`Error calculating compatibility for req ${otherReq._id}:`, err);
        return null;
      }
    }).filter(m => m !== null && m.compatibilityScore >= 50); // Minimum 50% match requirement

    // Sort by score descending
    potentialMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedMatches = potentialMatches.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      count: paginatedMatches.length,
      total: potentialMatches.length,
      totalPages: Math.ceil(potentialMatches.length / limit),
      currentPage: parseInt(page),
      data: paginatedMatches,
    });

  } catch (error) {
    logger.error('Get potential matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching potential matches',
    });
  }
};
