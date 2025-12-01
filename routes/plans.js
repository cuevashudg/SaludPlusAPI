import express from 'express';
import authMiddleware from '../middleware/auth.js';
import HealthPlan from '../models/HealthPlan.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// ---------------------------
// GET USER'S HEALTH PLANS
// ---------------------------
router.get('/', async (req, res) => {
  try {
    const plans = await HealthPlan.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: plans.length,
      plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health plans'
    });
  }
});

// ---------------------------
// GET SINGLE PLAN
// ---------------------------
router.get('/:planId', async (req, res) => {
  try {
    const plan = await HealthPlan.findOne({
      _id: req.params.planId,
      userId: req.userId
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Health plan not found'
      });
    }

    res.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health plan'
    });
  }
});

// ---------------------------
// CREATE HEALTH PLAN
// ---------------------------
router.post('/', async (req, res) => {
  try {
    const { planType, userInput, aiResponse } = req.body;

    if (!planType || !userInput || !aiResponse) {
      return res.status(400).json({
        success: false,
        error: 'planType, userInput, and aiResponse are required'
      });
    }

    const plan = new HealthPlan({
      userId: req.userId,
      planType,
      userInput,
      aiResponse,
      progress: {
        startDate: new Date(),
        status: 'active'
      }
    });

    await plan.save();

    res.status(201).json({
      success: true,
      message: 'Health plan created successfully',
      plan
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create health plan'
    });
  }
});

// ---------------------------
// UPDATE PLAN RATING
// ---------------------------
router.put('/:planId/rate', async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const plan = await HealthPlan.findOneAndUpdate(
      {
        _id: req.params.planId,
        userId: req.userId
      },
      {
        userRating: rating,
        userFeedback: feedback || '',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Health plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Rating saved successfully',
      plan
    });
  } catch (error) {
    console.error('Error rating plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save rating'
    });
  }
});

// ---------------------------
// UPDATE PLAN STATUS
// ---------------------------
router.put('/:planId/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'completed', 'abandoned'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be active, completed, or abandoned'
      });
    }

    const plan = await HealthPlan.findOneAndUpdate(
      {
        _id: req.params.planId,
        userId: req.userId
      },
      {
        'progress.status': status,
        'progress.endDate': status !== 'active' ? new Date() : null,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Health plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Plan status updated successfully',
      plan
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plan status'
    });
  }
});

// ---------------------------
// UPDATE ACTION ITEMS
// ---------------------------
router.put('/:planId/actions', async (req, res) => {
  try {
    const { actionItems } = req.body;

    if (!Array.isArray(actionItems)) {
      return res.status(400).json({
        success: false,
        error: 'actionItems must be an array'
      });
    }

    const plan = await HealthPlan.findOneAndUpdate(
      {
        _id: req.params.planId,
        userId: req.userId
      },
      {
        actionItems,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Health plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Action items updated successfully',
      plan
    });
  } catch (error) {
    console.error('Error updating action items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update action items'
    });
  }
});

// ---------------------------
// DELETE PLAN
// ---------------------------
router.delete('/:planId', async (req, res) => {
  try {
    const plan = await HealthPlan.findOneAndDelete({
      _id: req.params.planId,
      userId: req.userId
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Health plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Health plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete health plan'
    });
  }
});

export default router;
