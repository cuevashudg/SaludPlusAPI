import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Don't return password hash by default
  },
  profile: {
    name: {
      type: String,
      trim: true
    },
    age: {
      type: Number,
      min: 1,
      max: 150
    },
    weight: String, // e.g., "180 lbs" or "82 kg"
    height: String, // e.g., "5'10\"" or "178 cm"
    conditions: [String], // e.g., ['diabetes', 'hypertension']
    dietaryPreferences: String,
    fitnessLevel: String // beginner, intermediate, advanced
  },
  preferences: {
    units: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'imperial'
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  plans: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthPlan'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    this.passwordHash = await bcryptjs.hash(this.passwordHash, salt);
    this.updatedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (passwordToCheck) {
  return await bcryptjs.compare(passwordToCheck, this.passwordHash);
};

// Get public profile (without sensitive data)
UserSchema.methods.getPublicProfile = function () {
  const { passwordHash, ...publicData } = this.toObject();
  return publicData;
};

export default mongoose.model('User', UserSchema);
