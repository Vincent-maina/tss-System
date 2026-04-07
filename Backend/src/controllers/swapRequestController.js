const SwapRequest = require('../models/SwapRequest');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Create new swap request
// @route   POST /api/v1/swap-requests
// @access  Private
exports.createSwapRequest = async (req, res) => {
  try {
    const {
      desiredCounties,
      desiredSubCounties,
      desiredSchool,
      currentCounty,
      currentSubCounty,
      currentSchool,
      subjectCombination,
      preferences,
      reason,
    } = req.body;

    // Check if user already has an active swap request
    const existingRequest = await SwapRequest.findOne({
      teacher: req.user.id,
      status: 'active',
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active swap request. Please cancel it first to create a new one.',
      });
    }

    const currentUser = await User.findById(req.user.id);

    // Create swap request
    const swapRequest = await SwapRequest.create({
      teacher: req.user.id,
      desiredCounties,
      desiredSubCounties,
      desiredSchool,
      currentCounty: currentCounty || currentUser?.currentStation?.county || '',
      currentSubCounty: currentSubCounty || currentUser?.currentStation?.subCounty || '',
      currentSchool: currentSchool || currentUser?.currentStation?.schoolName || '',
      subjectCombination: subjectCombination || currentUser?.subjects || [],
      preferences,
      reason,
    });

    // Populate teacher details
    await swapRequest.populate('teacher', 'firstName lastName email currentStation jobGroup subjects');

    res.status(201).json({
      success: true,
      message: 'Swap request created successfully',
      data: swapRequest,
    });
  } catch (error) {
    logger.error('Create swap request error:', error);

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
      message: 'Error creating swap request',
    });
  }
};

// @desc    Get all swap requests (with filters)
// @route   GET /api/v1/swap-requests
// @access  Private
exports.getAllSwapRequests = async (req, res) => {
  try {
    const {
      county,
      jobGroup,
      subjects,
      schoolType,
      status = 'active',
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    const query = {
      isVisible: true,
      teacher: { $ne: req.user.id }, // Don't show user's own requests
    };

    // Status filter
    if (status) {
      query.status = status;
    } else {
      query.status = 'active'; // Default to active only
    }

    // County filter - check if user's current county matches desired counties
    if (county) {
      query.desiredCounties = county;
    }

    // Get user's current station
    const currentUser = await User.findById(req.user.id);

    // Filter by users who want to swap TO current user's county
    query.desiredCounties = { $in: [currentUser.currentStation.county] };

    // Job group filter
    if (jobGroup) {
      query['teacher.jobGroup'] = jobGroup;
    }

    // School type filter
    if (schoolType) {
      query['preferences.schoolType'] = { $in: [schoolType] };
    }

    // Execute query with pagination
    const swapRequests = await SwapRequest.find(query)
      .populate('teacher', 'firstName lastName email profilePhoto currentStation jobGroup subjects')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await SwapRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      count: swapRequests.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: swapRequests,
    });
  } catch (error) {
    logger.error('Get all swap requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching swap requests',
    });
  }
};

// @desc    Get single swap request
// @route   GET /api/v1/swap-requests/:id
// @access  Private
exports.getSwapRequest = async (req, res) => {
  try {
    const swapRequest = await SwapRequest.findById(req.params.id)
      .populate('teacher', 'firstName lastName email phoneNumber profilePhoto currentStation jobGroup subjects bio')
      .populate('matchedWith', 'firstName lastName email currentStation');

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found',
      });
    }

    // Increment views if not the owner
    if (swapRequest.teacher._id.toString() !== req.user.id) {
      await swapRequest.incrementViews();
    }

    res.status(200).json({
      success: true,
      data: swapRequest,
    });
  } catch (error) {
    logger.error('Get swap request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching swap request',
    });
  }
};

// @desc    Get my swap requests
// @route   GET /api/v1/swap-requests/my/requests
// @access  Private
exports.getMySwapRequests = async (req, res) => {
  try {
    const swapRequests = await SwapRequest.find({ teacher: req.user.id })
      .populate('matchedWith', 'firstName lastName email currentStation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: swapRequests.length,
      data: swapRequests,
    });
  } catch (error) {
    logger.error('Get my swap requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your swap requests',
    });
  }
};

// @desc    Update swap request
// @route   PUT /api/v1/swap-requests/:id
// @access  Private
exports.updateSwapRequest = async (req, res) => {
  try {
    let swapRequest = await SwapRequest.findById(req.params.id);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found',
      });
    }

    // Check ownership
    if (swapRequest.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this swap request',
      });
    }

    // Cannot update if already matched or approved
    if (['matched', 'approved'].includes(swapRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update swap request with status: ${swapRequest.status}`,
      });
    }

    const {
      desiredCounties,
      desiredSubCounties,
      preferences,
      reason,
      isVisible,
    } = req.body;

    // Fields allowed to update
    const fieldsToUpdate = {};

    if (desiredCounties) fieldsToUpdate.desiredCounties = desiredCounties;
    if (desiredSubCounties) fieldsToUpdate.desiredSubCounties = desiredSubCounties;
    if (preferences) fieldsToUpdate.preferences = preferences;
    if (reason !== undefined) fieldsToUpdate.reason = reason;
    if (isVisible !== undefined) fieldsToUpdate.isVisible = isVisible;

    swapRequest = await SwapRequest.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true,
      }
    ).populate('teacher', 'firstName lastName email currentStation jobGroup subjects');

    res.status(200).json({
      success: true,
      message: 'Swap request updated successfully',
      data: swapRequest,
    });
  } catch (error) {
    logger.error('Update swap request error:', error);

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
      message: 'Error updating swap request',
    });
  }
};

// @desc    Delete/Cancel swap request
// @route   DELETE /api/v1/swap-requests/:id
// @access  Private
exports.deleteSwapRequest = async (req, res) => {
  try {
    const swapRequest = await SwapRequest.findById(req.params.id);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found',
      });
    }

    // Check ownership
    if (swapRequest.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this swap request',
      });
    }

    // Update status to cancelled instead of deleting
    swapRequest.status = 'cancelled';
    swapRequest.isVisible = false;
    await swapRequest.save();

    res.status(200).json({
      success: true,
      message: 'Swap request cancelled successfully',
    });
  } catch (error) {
    logger.error('Delete swap request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting swap request',
    });
  }
};

// @desc    Search swap requests by criteria
// @route   GET /api/v1/swap-requests/search
// @access  Private
exports.searchSwapRequests = async (req, res) => {
  try {
    const {
      myCounty,
      theirCounty,
      jobGroup,
      maxDistance,
      schoolType,
      subjects,
      page = 1,
      limit = 20,
    } = req.query;

    const currentUser = await User.findById(req.user.id);

    // Build search query
    const query = {
      status: 'active',
      isVisible: true,
      teacher: { $ne: req.user.id },
    };

    // They want to come to my county
    if (myCounty !== 'false') {
      query.desiredCounties = { $in: [currentUser.currentStation.county] };
    }

    // I want to go to their county (filter by users in specific counties)
    if (theirCounty) {
      // This requires a join/lookup with User model
      const usersInCounty = await User.find({
        'currentStation.county': theirCounty,
      }).select('_id');

      const userIds = usersInCounty.map(u => u._id);
      query.teacher = { $in: userIds };
    }

    // Execute search
    const swapRequests = await SwapRequest.find(query)
      .populate('teacher', 'firstName lastName email profilePhoto currentStation jobGroup subjects')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Filter by job group after population
    let filteredRequests = swapRequests;

    if (jobGroup) {
      filteredRequests = swapRequests.filter(
        req => req.teacher.jobGroup === jobGroup
      );
    }

    // Filter by subjects
    if (subjects) {
      const subjectArray = subjects.split(',');
      filteredRequests = filteredRequests.filter(req => {
        return req.teacher.subjects.some(s => subjectArray.includes(s));
      });
    }

    // Filter by school type
    if (schoolType) {
      filteredRequests = filteredRequests.filter(
        req => req.preferences.schoolType.includes(schoolType)
      );
    }

    const count = filteredRequests.length;

    res.status(200).json({
      success: true,
      count: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: filteredRequests,
    });
  } catch (error) {
    logger.error('Search swap requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching swap requests',
    });
  }
};

// @desc    Get swap request statistics
// @route   GET /api/v1/swap-requests/stats
// @access  Private
exports.getSwapRequestStats = async (req, res) => {
  try {
    const stats = await SwapRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalRequests = await SwapRequest.countDocuments();
    const activeRequests = await SwapRequest.countDocuments({ status: 'active' });
    const matchedRequests = await SwapRequest.countDocuments({ status: 'matched' });
    const myRequests = await SwapRequest.countDocuments({ teacher: req.user.id });

    res.status(200).json({
      success: true,
      data: {
        total: totalRequests,
        active: activeRequests,
        matched: matchedRequests,
        myRequests: myRequests,
        byStatus: stats,
      },
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
    });
  }
};
