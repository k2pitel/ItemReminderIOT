const express = require('express');
const Item = require('../models/Item');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all items for user
router.get('/', auth, async (req, res) => {
  try {
    const items = await Item.find({ userId: req.userId, active: true });
    res.json(items);
  } catch (error) {
    logger.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get single item
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    logger.error('Get item error:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create item
router.post('/', auth, async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      userId: req.userId
    };

    const item = new Item(itemData);
    await item.save();

    res.status(201).json(item);
  } catch (error) {
    logger.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item
router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    logger.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { active: false },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    logger.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
