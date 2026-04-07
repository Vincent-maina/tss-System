const mongoose = require('mongoose');

const swapRequestSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher reference is required'],
    },

    // === Current Station Snapshot (captured at submission time) ===
    currentCounty: { type: String, default: '' },
    currentSubCounty: { type: String, default: '' },
    currentSchool: { type: String, default: '' },

    // === Subject Combination the teacher teaches ===
    subjectCombination: [{ type: String }],

    // === Desired Destination ===
    desiredCounties: [{ type: String, required: true }],
    desiredSubCounties: [{ type: String }],
    desiredSchool: { type: String, default: '' },  // specific desired school if known

    // Preferences
    preferences: {
      maxDistance: { type: Number, default: 300, min: 0 },
      schoolType: {
        type: [String],
        enum: ['Day', 'Boarding', 'Day & Boarding'],
        default: ['Day', 'Boarding', 'Day & Boarding'],
      },
      hardshipWilling: { type: Boolean, default: false },
      urgency: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium',
      },
    },

    // Reason for swap
    reason: { type: String, maxlength: [1000, 'Reason cannot exceed 1000 characters'] },


    // Status
    status: {
      type: String,
      enum: ['active', 'matched', 'pending_approval', 'approved', 'rejected', 'cancelled', 'expired'],
      default: 'pending_approval',
    },

    // Matched partner (when a swap is agreed)
    matchedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    matchedRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SwapRequest',
      default: null,
    },

    // When both teachers accept
    mutualAcceptance: {
      thisSideAccepted: {
        type: Boolean,
        default: false,
      },
      otherSideAccepted: {
        type: Boolean,
        default: false,
      },
      acceptedAt: {
        type: Date,
        default: null,
      },
    },

    // Visibility
    isVisible: {
      type: Boolean,
      default: true,
    },

    // Views counter
    views: {
      type: Number,
      default: 0,
    },

    // Expiry (auto-archive after 90 days)
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      },
    },

    // Admin notes
    adminNotes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
swapRequestSchema.index({ teacher: 1 });
swapRequestSchema.index({ status: 1 });
swapRequestSchema.index({ desiredCounties: 1 });
swapRequestSchema.index({ matchedWith: 1 });
swapRequestSchema.index({ expiresAt: 1 });
swapRequestSchema.index({ createdAt: -1 });

// Compound index for active requests in specific counties
swapRequestSchema.index({ status: 1, desiredCounties: 1, isVisible: 1 });

// Pre-save middleware to update expiry on status change
swapRequestSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status !== 'active') {
    // Don't auto-expire if status is changed
    this.expiresAt = null;
  }
  next();
});

// Method to check if request is expired
swapRequestSchema.methods.isExpired = function () {
  return this.expiresAt && new Date() > this.expiresAt;
};

// Method to increment views
swapRequestSchema.methods.incrementViews = async function () {
  this.views += 1;
  await this.save();
};

// Static method to find active requests
swapRequestSchema.statics.findActive = function (filters = {}) {
  return this.find({
    status: 'active',
    isVisible: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ],
    ...filters
  }).populate('teacher', 'firstName lastName email profilePhoto currentStation jobGroup subjects');
};

// Static method to expire old requests (for cron job)
swapRequestSchema.statics.expireOldRequests = async function () {
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: new Date() }
    },
    {
      status: 'expired'
    }
  );
  return result.modifiedCount;
};

module.exports = mongoose.model('SwapRequest', swapRequestSchema);
