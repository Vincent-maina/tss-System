const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // Sender and Receiver
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Related match (optional - messages can be sent outside of matches)
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null,
    },

    // Message content
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },

    // Message type
    messageType: {
      type: String,
      enum: ['text', 'system', 'swap_request', 'swap_accept', 'swap_reject'],
      default: 'text',
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },

    // Delivery status
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },

    // Attachments (for future use)
    attachments: [{
      type: String,
    }],

    // Deleted status (soft delete)
    deletedBySender: {
      type: Boolean,
      default: false,
    },
    deletedByReceiver: {
      type: Boolean,
      default: false,
    },

    // Reply to message (threading)
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, isRead: 1 });
messageSchema.index({ match: 1 });
messageSchema.index({ createdAt: -1 });

// Compound index for conversation queries
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

// Method to mark as read
messageSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
};

// Method to mark as delivered
messageSchema.methods.markAsDelivered = async function () {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    await this.save();
  }
};

// Static method to get conversation between two users
messageSchema.statics.getConversation = function (user1Id, user2Id, limit = 50) {
  return this.find({
    $or: [
      { sender: user1Id, receiver: user2Id, deletedBySender: false },
      { sender: user2Id, receiver: user1Id, deletedByReceiver: false }
    ]
  })
    .populate('sender', 'firstName lastName profilePhoto')
    .populate('receiver', 'firstName lastName profilePhoto')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    receiver: userId,
    isRead: false,
    deletedByReceiver: false
  });
};

// Static method to mark all messages in a conversation as read
messageSchema.statics.markConversationAsRead = async function (receiverId, senderId) {
  const result = await this.updateMany(
    {
      sender: senderId,
      receiver: receiverId,
      isRead: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
  return result.modifiedCount;
};

// Static method to get recent conversations for a user
messageSchema.statics.getRecentConversations = async function (userId, limit = 20) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const conversations = await this.aggregate([
    {
      $match: {
        $or: [
          { sender: userObjectId },
          { receiver: userObjectId }
        ]
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', userObjectId] },
            '$receiver',
            '$sender'
          ]
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', userObjectId] },
                  { $eq: ['$isRead', false] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'participant'
      }
    },
    {
      $unwind: '$participant'
    },
    {
      $project: {
        participant: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          profilePhoto: 1,
          currentStation: 1,
          role: 1
        },
        lastMessage: 1,
        unreadCount: 1
      }
    }
  ]);

  return conversations;
};

module.exports = mongoose.model('Message', messageSchema);
