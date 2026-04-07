const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    // The two swap requests being matched
    requestId1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SwapRequest',
      required: true,
    },
    requestId2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SwapRequest',
      required: true,
    },

    // The teachers involved
    teacher1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teacher2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Compatibility score (0-100)
    compatibilityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Custom match level for color coding (Yellow, Blue, Green)
    matchLevel: {
      type: String,
      default: 'None',
    },

    // Detailed score breakdown
    scoreBreakdown: {
      mutualSubject: {
        type: Number,
        default: 0,
      },
      mutualCounty: {
        type: Number,
        default: 0,
      },
      mutualSubcounty: {
        type: Number,
        default: 0,
      },
      mutualSchool: {
        type: Number,
        default: 0,
      },
    },

    // Distance between current stations (in km)
    distanceBetweenStations: {
      type: Number,
      default: 0,
    },

    // Match status
    status: {
      type: String,
      enum: ['pending', 'viewed_by_teacher1', 'viewed_by_teacher2', 'viewed_by_both',
        'interested_teacher1', 'interested_teacher2', 'mutual_interest',
        'accepted', 'rejected', 'expired'],
      default: 'pending',
    },

    // Interest tracking
    teacher1Interest: {
      interested: {
        type: Boolean,
        default: null,
      },
      interestedAt: {
        type: Date,
        default: null,
      },
    },

    teacher2Interest: {
      interested: {
        type: Boolean,
        default: null,
      },
      interestedAt: {
        type: Date,
        default: null,
      },
    },

    // Notifications sent
    notificationsSent: {
      teacher1: {
        type: Boolean,
        default: false,
      },
      teacher2: {
        type: Boolean,
        default: false,
      },
    },

    // When both teachers view
    viewedAt: {
      teacher1: {
        type: Date,
        default: null,
      },
      teacher2: {
        type: Date,
        default: null,
      },
    },

    // Expiry (matches expire after 30 days if no action)
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      },
    },

    // Admin override
    adminApproved: {
      type: Boolean,
      default: null,
    },

    adminNotes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
matchSchema.index({ teacher1: 1, teacher2: 1 });
matchSchema.index({ compatibilityScore: -1 });
matchSchema.index({ status: 1 });
matchSchema.index({ createdAt: -1 });

// Compound index for finding matches for a specific teacher
matchSchema.index({ teacher1: 1, status: 1 });
matchSchema.index({ teacher2: 1, status: 1 });

// Prevent duplicate matches
matchSchema.index({ requestId1: 1, requestId2: 1 }, { unique: true });

// Method to mark as viewed by a teacher
matchSchema.methods.markViewed = async function (teacherId) {
  if (this.teacher1.toString() === teacherId.toString()) {
    this.viewedAt.teacher1 = new Date();
    if (this.status === 'pending') {
      this.status = 'viewed_by_teacher1';
    } else if (this.status === 'viewed_by_teacher2') {
      this.status = 'viewed_by_both';
    }
  } else if (this.teacher2.toString() === teacherId.toString()) {
    this.viewedAt.teacher2 = new Date();
    if (this.status === 'pending') {
      this.status = 'viewed_by_teacher2';
    } else if (this.status === 'viewed_by_teacher1') {
      this.status = 'viewed_by_both';
    }
  }
  await this.save();
};

// Method to express interest
matchSchema.methods.expressInterest = async function (teacherId) {
  if (this.teacher1.toString() === teacherId.toString()) {
    this.teacher1Interest.interested = true;
    this.teacher1Interest.interestedAt = new Date();
    this.status = 'interested_teacher1';

    // Check if both interested
    if (this.teacher2Interest.interested === true) {
      this.status = 'mutual_interest';
    }
  } else if (this.teacher2.toString() === teacherId.toString()) {
    this.teacher2Interest.interested = true;
    this.teacher2Interest.interestedAt = new Date();
    this.status = 'interested_teacher2';

    // Check if both interested
    if (this.teacher1Interest.interested === true) {
      this.status = 'mutual_interest';
    }
  }
  await this.save();
};

// Method to reject match
matchSchema.methods.rejectMatch = async function (teacherId) {
  if (this.teacher1.toString() === teacherId.toString()) {
    this.teacher1Interest.interested = false;
    this.teacher1Interest.interestedAt = new Date();
  } else if (this.teacher2.toString() === teacherId.toString()) {
    this.teacher2Interest.interested = false;
    this.teacher2Interest.interestedAt = new Date();
  }
  this.status = 'rejected';
  await this.save();
};

// Static method to find matches for a teacher
matchSchema.statics.findForTeacher = function (teacherId, status = null) {
  const query = {
    $or: [
      { teacher1: teacherId },
      { teacher2: teacherId }
    ],
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  };

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('teacher1', 'firstName lastName email profilePhoto currentStation jobGroup subjects')
    .populate('teacher2', 'firstName lastName email profilePhoto currentStation jobGroup subjects')
    .populate('requestId1')
    .populate('requestId2')
    .sort({ compatibilityScore: -1, createdAt: -1 });
};

// Static method to get high compatibility matches (score >= 75)
matchSchema.statics.findHighCompatibility = function (teacherId) {
  return this.find({
    $or: [
      { teacher1: teacherId },
      { teacher2: teacherId }
    ],
    compatibilityScore: { $gte: 75 },
    status: { $in: ['pending', 'viewed_by_teacher1', 'viewed_by_teacher2', 'viewed_by_both'] },
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).populate('teacher1 teacher2 requestId1 requestId2')
    .sort({ compatibilityScore: -1 });
};

module.exports = mongoose.model('Match', matchSchema);
