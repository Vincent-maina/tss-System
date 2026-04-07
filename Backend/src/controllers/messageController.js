const Message = require('../models/Message');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Send a message
// @route   POST /api/v1/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, matchId, replyTo } = req.body;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found',
      });
    }

    // Check if there is an adminApproved match between these two users
    const MatchModel = require('../models/Match');
    const existingMatch = await MatchModel.findOne({
      $or: [
        { teacher1: req.user.id, teacher2: receiverId },
        { teacher1: receiverId, teacher2: req.user.id }
      ],
      adminApproved: true
    });

    if (!existingMatch && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Messaging is disabled. The admin has not authorized chat between you and this teacher yet.',
      });
    }

    // Create message
    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      content,
      match: matchId || null,
      replyTo: replyTo || null,
      messageType: 'text',
      isDelivered: true,
      deliveredAt: new Date(),
    });

    // Populate sender and receiver details
    await message.populate('sender', 'firstName lastName profilePhoto');
    await message.populate('receiver', 'firstName lastName profilePhoto');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
    });
  }
};

// @desc    Get conversation with a user
// @route   GET /api/v1/messages/conversation/:userId
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Get messages
    const messages = await Message.getConversation(
      req.user.id,
      userId,
      parseInt(limit)
    );

    // Mark messages as read
    await Message.markConversationAsRead(req.user.id, userId);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages.reverse(), // Reverse to show oldest first
    });
  } catch (error) {
    logger.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation',
    });
  }
};

// @desc    Get all conversations
// @route   GET /api/v1/messages/conversations
// @access  Private
exports.getAllConversations = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const conversations = await Message.getRecentConversations(
      req.user.id,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/v1/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Only receiver can mark as read
    if (message.receiver.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this message as read',
      });
    }

    await message.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Message marked as read',
      data: message,
    });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking message as read',
    });
  }
};

// @desc    Delete message (soft delete)
// @route   DELETE /api/v1/messages/:id
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // User can only delete their own sent or received messages
    if (message.sender.toString() === req.user.id) {
      message.deletedBySender = true;
    } else if (message.receiver.toString() === req.user.id) {
      message.deletedByReceiver = true;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message',
      });
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    logger.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/v1/messages/unread/count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
    });
  }
};

// @desc    Get messages for a specific match
// @route   GET /api/v1/messages/match/:matchId
// @access  Private
exports.getMatchMessages = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { limit = 50 } = req.query;

    const messages = await Message.find({
      match: matchId,
      $or: [
        { sender: req.user.id, deletedBySender: false },
        { receiver: req.user.id, deletedByReceiver: false },
      ],
    })
      .populate('sender', 'firstName lastName profilePhoto')
      .populate('receiver', 'firstName lastName profilePhoto')
      .populate('replyTo')
      .sort({ createdAt: 1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    logger.error('Get match messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match messages',
    });
  }
};
