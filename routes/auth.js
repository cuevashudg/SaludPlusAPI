import express from 'express';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import validator from 'validator';

const router = express.Router();

// Validation helper
function validatePassword(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*]/.test(password)
  };
  return Object.values(requirements).every(req => req);
}

// ---------------------------
// SIGNUP ENDPOINT
// ---------------------------
router.post('/signup', async (req, res) => {
  try {
    const { email, password, confirmPassword, name } = req.body;

    // Validate inputs
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and password confirmation are required'
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email is already registered'
      });
    }

    // Create new user with extended profile data
    const user = new User({
      email,
      passwordHash: password,
      profile: {
        name: name || '',
        age: req.body.age ? Number(req.body.age) : undefined,
        weight: req.body.weight || undefined,
        height: req.body.height || undefined,
        conditions: Array.isArray(req.body.conditions) ? req.body.conditions : [],
        dietaryPreferences: req.body.dietaryPreferences || undefined,
        fitnessLevel: req.body.fitnessLevel || undefined
      },
      preferences: {
        units: req.body.units || 'imperial',
        notificationsEnabled: req.body.notificationsEnabled !== false,
        language: req.body.language || 'en'
      }
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Signup failed'
    });
  }
});

// ---------------------------
// LOGIN ENDPOINT
// ---------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user (need to select password hash)
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// ---------------------------
// GET CURRENT USER ENDPOINT
// ---------------------------
router.get('/me', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const user = await User.findById(req.userId).populate('plans');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user'
    });
  }
});

// ---------------------------
// UPDATE PROFILE ENDPOINT
// ---------------------------
router.put('/me', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const { profile, preferences } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update profile if provided
    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }

    // Update preferences if provided
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// ---------------------------
// CHANGE PASSWORD ENDPOINT
// ---------------------------
router.post('/change-password', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All password fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match'
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'New password does not meet requirements'
      });
    }

    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.passwordHash = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

export default router;
