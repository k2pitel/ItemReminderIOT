const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/me', auth, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password update through this route
    delete updates.role; // Don't allow role update

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update notification preferences
router.put('/me/notifications', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { notifications: req.body },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Update notifications error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Register FCM token for push notifications
router.post('/me/fcm-token', auth, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { fcmToken: token },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`FCM token registered for user: ${user.username}`);
    res.json({ message: 'FCM token registered successfully', user });
  } catch (error) {
    logger.error('Register FCM token error:', error);
    res.status(500).json({ error: 'Failed to register FCM token' });
  }
});

// Remove FCM token (logout from push notifications)
router.delete('/me/fcm-token', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { fcmToken: null },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`FCM token removed for user: ${user.username}`);
    res.json({ message: 'FCM token removed successfully', user });
  } catch (error) {
    logger.error('Remove FCM token error:', error);
    res.status(500).json({ error: 'Failed to remove FCM token' });
  }
});

module.exports = router;
