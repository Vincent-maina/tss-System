const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Personal Information
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^(\+254|0)[17]\d{8}$/, 'Please provide a valid Kenyan phone number'],
    },

    // Authentication
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },

    // TSC Information
    tscNumber: {
      type: String,
      required: [true, 'TSC number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^\d{6}$/, 'TSC number must be 6 digits'],
    },
    tscVerified: {
      type: Boolean,
      default: false,
    },

    // Employment Details
    jobGroup: {
      type: String,
      enum: ['B5', 'C1', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2', 'D3', 'D4', 'D5'],
    },
    subjects: [{
      type: String,
    }],

    // Current Station
    currentStation: {
      county: {
        type: String,
      },
      subCounty: {
        type: String,
      },
      schoolName: {
        type: String,
      },
      schoolType: {
        type: String,
        enum: ['Day', 'Boarding', 'Day & Boarding'],
      },
      hardshipArea: {
        type: Boolean,
        default: false,
      },
      latitude: {
        type: Number,
        required: false,
      },
      longitude: {
        type: Number,
        required: false,
      },
    },

    // Profile
    profilePhoto: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockReason: {
      type: String,
      default: null,
    },

    // Role
    role: {
      type: String,
      enum: ['teacher', 'admin'],
      default: 'teacher',
    },

    // OTP for verification
    otp: {
      code: String,
      expiresAt: Date,
    },

    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Last Login
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for search performance (unique constraints inherently apply indexes)
userSchema.index({ 'currentStation.county': 1 });
userSchema.index({ subjects: 1 });
userSchema.index({ jobGroup: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  };
  return otp;
};

// Method to verify OTP
userSchema.methods.verifyOTP = function (otpCode) {
  if (!this.otp || !this.otp.code) {
    return false;
  }

  if (new Date() > this.otp.expiresAt) {
    return false; // OTP expired
  }

  return this.otp.code === otpCode;
};

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
