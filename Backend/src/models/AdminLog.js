const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema(
  {
    // Admin who performed the action
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Action performed
    action: {
      type: String,
      required: true,
      enum: [
        'user_block',
        'user_unblock',
        'user_verify',
        'user_delete',
        'swap_approve',
        'swap_reject',
        'match_override',
        'system_settings_update',
        'bulk_notification',
        'report_generation',
        'data_export',
        'fraud_flag',
        'content_moderation'
      ],
    },
    
    // Target of the action
    targetType: {
      type: String,
      enum: ['user', 'swap_request', 'match', 'message', 'system'],
      required: true,
    },
    
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    
    // Details of the action
    details: {
      type: String,
      maxlength: [1000, 'Details cannot exceed 1000 characters'],
    },
    
    // Before and after data (for audit trail)
    previousData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    
    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    
    // IP address and user agent
    ipAddress: {
      type: String,
    },
    
    userAgent: {
      type: String,
    },
    
    // Status
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success',
    },
    
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
adminLogSchema.index({ admin: 1 });
adminLogSchema.index({ action: 1 });
adminLogSchema.index({ targetType: 1, targetId: 1 });
adminLogSchema.index({ createdAt: -1 });

// Static method to log an action
adminLogSchema.statics.logAction = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging admin action:', error);
    return null;
  }
};

// Static method to get logs for a specific admin
adminLogSchema.statics.getAdminLogs = function(adminId, limit = 50) {
  return this.find({ admin: adminId })
    .populate('admin', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get recent logs
adminLogSchema.statics.getRecentLogs = function(limit = 100) {
  return this.find()
    .populate('admin', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('AdminLog', adminLogSchema);
