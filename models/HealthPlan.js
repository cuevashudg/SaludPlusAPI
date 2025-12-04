import mongoose from 'mongoose';

const HealthPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  planType: {
    type: String,
    enum: ['health', 'workout', 'nutrition'],
    required: [true, 'Plan type is required']
  },
  userInput: {
    name: String,
    age: Number,
    weight: String,
    height: String,
    conditions: [String],
    otherCondition: String,
    additionalInfo: String,
    fitnessLevel: String,
    goals: String,
    limitations: String,
    dietaryPreferences: String,
    nutritionGoals: String
  },
  aiResponse: {
    type: String,
    required: [true, 'AI response is required']
  },
  userRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  userFeedback: String,
  userNotes: {
    type: String,
    default: ''
  },
  actionItems: [
    {
      title: String,
      completed: {
        type: Boolean,
        default: false
      },
      dueDate: Date
    }
  ],
  progress: {
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
HealthPlanSchema.index({ userId: 1, createdAt: -1 });
HealthPlanSchema.index({ userId: 1, planType: 1 });

export default mongoose.model('HealthPlan', HealthPlanSchema);
