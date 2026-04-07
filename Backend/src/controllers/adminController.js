const User = require('../models/User');
const SwapRequest = require('../models/SwapRequest');
const Match = require('../models/Match');
const Message = require('../models/Message');
const AdminLog = require('../models/AdminLog');
const logger = require('../utils/logger');
const { runMatchingAlgorithm } = require('../services/matchingService');

// @desc    Get all users (admin)
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const {
      search,
      county,
      jobGroup,
      isBlocked,
      tscVerified,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { tscNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (county) {
      query['currentStation.county'] = county;
    }

    if (jobGroup) {
      query.jobGroup = jobGroup;
    }

    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }

    if (tscVerified !== undefined) {
      query.tscVerified = tscVerified === 'true';
    }

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
    logger.error('Admin get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
    });
  }
};

// @desc    Block/Unblock user
// @route   PUT /api/v1/admin/users/:id/block
// @access  Private/Admin
exports.blockUser = async (req, res) => {
  try {
    const { block, reason } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const previousData = { isBlocked: user.isBlocked, blockReason: user.blockReason };

    user.isBlocked = block;
    user.blockReason = block ? reason : null;
    await user.save();

    // Log admin action
    await AdminLog.logAction({
      admin: req.user.id,
      action: block ? 'user_block' : 'user_unblock',
      targetType: 'user',
      targetId: user._id,
      details: `User ${block ? 'blocked' : 'unblocked'}: ${reason || 'No reason provided'}`,
      previousData,
      newData: { isBlocked: user.isBlocked, blockReason: user.blockReason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: `User ${block ? 'blocked' : 'unblocked'} successfully`,
      data: user,
    });
  } catch (error) {
    logger.error('Admin block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
    });
  }
};

// @desc    Verify TSC number
// @route   PUT /api/v1/admin/users/:id/verify
// @access  Private/Admin
exports.verifyTSC = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.tscVerified = true;
    await user.save();

    // Log admin action
    await AdminLog.logAction({
      admin: req.user.id,
      action: 'user_verify',
      targetType: 'user',
      targetId: user._id,
      details: `TSC number verified for user: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'TSC number verified successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Admin verify TSC error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying TSC number',
    });
  }
};

// @desc    Get system analytics
// @route   GET /api/v1/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ tscVerified: true });
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const activeUsers = await User.countDocuments({ isActive: true });

    // Swap request statistics
    const totalSwapRequests = await SwapRequest.countDocuments();
    const activeSwapRequests = await SwapRequest.countDocuments({ status: 'active' });
    const matchedSwapRequests = await SwapRequest.countDocuments({ status: 'matched' });
    const approvedSwapRequests = await SwapRequest.countDocuments({ status: 'approved' });

    // Match statistics
    const totalMatches = await Match.countDocuments();
    const mutualInterestMatches = await Match.countDocuments({ status: 'mutual_interest' });
    const highCompatibilityMatches = await Match.countDocuments({
      compatibilityScore: { $gte: 75 }
    });

    // Message statistics
    const totalMessages = await Message.countDocuments();

    // Users by county
    const usersByCounty = await User.aggregate([
      {
        $group: {
          _id: '$currentStation.county',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Swap requests by urgency
    const requestsByUrgency = await SwapRequest.aggregate([
      {
        $match: { status: 'active' },
      },
      {
        $group: {
          _id: '$preferences.urgency',
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          blocked: blockedUsers,
          active: activeUsers,
          recentRegistrations,
        },
        swapRequests: {
          total: totalSwapRequests,
          active: activeSwapRequests,
          matched: matchedSwapRequests,
          approved: approvedSwapRequests,
        },
        matches: {
          total: totalMatches,
          mutualInterest: mutualInterestMatches,
          highCompatibility: highCompatibilityMatches,
        },
        messages: {
          total: totalMessages,
        },
        usersByCounty,
        requestsByUrgency,
      },
    });
  } catch (error) {
    logger.error('Admin analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
    });
  }
};

// @desc    Approve/Reject swap request
// @route   PUT /api/v1/admin/swap-requests/:id/approve
// @access  Private/Admin
exports.approveSwapRequest = async (req, res) => {
  try {
    const { approve, notes } = req.body;

    const swapRequest = await SwapRequest.findById(req.params.id);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found',
      });
    }

    const previousStatus = swapRequest.status;

    swapRequest.status = approve ? 'active' : 'rejected';
    swapRequest.adminNotes = notes || null;
    await swapRequest.save();

    if (approve) {
      setTimeout(() => {
        runMatchingAlgorithm()
          .then(res => logger.info(`Auto-matching finished: ${res.matchesCreated} pairs`))
          .catch(e => logger.error('Auto-matching error:', e));
      }, 0);
    }

    // Log admin action
    await AdminLog.logAction({
      admin: req.user.id,
      action: approve ? 'swap_approve' : 'swap_reject',
      targetType: 'swap_request',
      targetId: swapRequest._id,
      details: `Swap request ${approve ? 'approved' : 'rejected'}: ${notes || 'No notes'}`,
      previousData: { status: previousStatus },
      newData: { status: swapRequest.status, adminNotes: swapRequest.adminNotes },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: `Swap request ${approve ? 'approved' : 'rejected'} successfully`,
      data: swapRequest,
    });
  } catch (error) {
    logger.error('Admin approve swap error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating swap request',
    });
  }
};

// @desc    Authorize Chat between matched teachers
// @route   PUT /api/v1/admin/matches/:id/authorize-chat
// @access  Private/Admin
exports.authorizeChat = async (req, res) => {
  try {
    const { authorize, notes } = req.body;
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    match.adminApproved = authorize !== false;
    match.adminNotes = notes || null;
    await match.save();

    await AdminLog.logAction({
      admin: req.user.id,
      action: match.adminApproved ? 'match_authorize_chat' : 'match_revoke_chat',
      targetType: 'match',
      targetId: match._id,
      details: `Chat ${match.adminApproved ? 'authorized' : 'revoked'} for match. ${notes || ''}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    if (match.adminApproved) {
      const Message = require('../models/Message');
      try {
        await Message.create({
          sender: match.teacher1,
          receiver: match.teacher2,
          match: match._id,
          content: 'System: The Admin has officially authorized your swap communication. You can now chat directly to organize your plans.',
          messageType: 'system'
        });
      } catch (e) {
        logger.error('Failed to spawn chat thread after admin authorization:', e);
      }
    }

    res.status(200).json({
      success: true,
      message: `In-app messaging ${match.adminApproved ? 'authorized' : 'revoked'} successfully`,
      data: match,
    });
  } catch (error) {
    logger.error('Admin authorize chat error:', error);
    res.status(500).json({ success: false, message: 'Error authorizing chat' });
  }
};

// @desc    Get admin logs
// @route   GET /api/v1/admin/logs
// @access  Private/Admin
exports.getAdminLogs = async (req, res) => {
  try {
    const { action, admin, page = 1, limit = 50 } = req.query;

    const query = {};

    if (action) {
      query.action = action;
    }

    if (admin) {
      query.admin = admin;
    }

    const logs = await AdminLog.find(query)
      .populate('admin', 'firstName lastName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await AdminLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: logs,
    });
  } catch (error) {
    logger.error('Admin get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin logs',
    });
  }
};

// @desc    Delete user (permanent)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Log before deletion
    await AdminLog.logAction({
      admin: req.user.id,
      action: 'user_delete',
      targetType: 'user',
      targetId: user._id,
      details: `User deleted: ${user.email}`,
      previousData: user.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    // Delete related data
    await SwapRequest.deleteMany({ teacher: req.params.id });
    await Match.deleteMany({
      $or: [{ teacher1: req.params.id }, { teacher2: req.params.id }],
    });
    await Message.deleteMany({
      $or: [{ sender: req.params.id }, { receiver: req.params.id }],
    });

    res.status(200).json({
      success: true,
      message: 'User and all related data deleted successfully',
    });
  } catch (error) {
    logger.error('Admin delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
    });
  }
};

// @desc    Get all swap requests (admin view)
// @route   GET /api/v1/admin/swap-requests
// @access  Private/Admin
exports.getAllSwapRequests = async (req, res) => {
  try {
    const { status, county, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (county) {
      query.desiredCounties = county;
    }

    const swapRequests = await SwapRequest.find(query)
      .populate('teacher', 'firstName lastName email currentStation tscNumber')
      .populate('matchedWith', 'firstName lastName email currentStation')
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
    logger.error('Admin get swap requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching swap requests',
    });
  }
};

// @desc    Get all matches (admin view)
// @route   GET /api/v1/admin/matches
// @access  Private/Admin
exports.getAllMatches = async (req, res) => {
  try {
    const { status, minScore, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (minScore) {
      query.compatibilityScore = { $gte: parseInt(minScore) };
    }

    const matches = await Match.find(query)
      .populate('teacher1', 'firstName lastName email currentStation')
      .populate('teacher2', 'firstName lastName email currentStation')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ compatibilityScore: -1, createdAt: -1 });

    const count = await Match.countDocuments(query);

    res.status(200).json({
      success: true,
      count: matches.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: matches,
    });
  } catch (error) {
    logger.error('Admin get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching matches',
    });
  }
};

// @desc    Create a new global announcement
// @route   POST /api/v1/admin/announcements
// @access  Private/Admin
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority } = req.body;
    const Announcement = require('../models/Announcement');

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      priority: priority || 'medium',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Announcement broadcasted successfully',
      data: announcement
    });
  } catch (error) {
    logger.error('Admin create announcement error:', error);
    res.status(500).json({ success: false, message: 'Error creating announcement' });
  }
};

// @desc    Send a direct message to a specific user
// @route   POST /api/v1/admin/users/:id/message
// @access  Private/Admin
exports.sendMessageToUser = async (req, res) => {
  try {
    const { content } = req.body;
    const receiverId = req.params.id;
    const Message = require('../models/Message');

    if (!content) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    // Ensure the target user exists
    const user = await User.findById(receiverId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      content,
      messageType: 'system', // Distinguish admin messages
      match: null // Admin messages aren't tied to a specific swap match
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    logger.error('Admin send message error:', error);
    res.status(500).json({ success: false, message: 'Error sending message' });
  }
};
