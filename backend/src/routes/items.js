const express = require('express');
const Item = require('../models/Item');
const Reading = require('../models/Reading');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const mqttService = require('../services/mqttService');

const router = express.Router();

const emitToUser = (io, userId, action, data) => {
  io.to(`user-${userId}`).emit('item-update', { action, ...data });
};

const normalizeGeofenceId = (geofenceId) => geofenceId === '' ? null : geofenceId;

router.get('/', auth, async (req, res) => {
  try {
    const items = await Item.find({ userId: req.userId, active: true });
    res.json(items);
  } catch (error) {
    logger.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

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

router.post('/', auth, async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      userId: req.userId,
      geofenceId: normalizeGeofenceId(req.body.geofenceId)
    };

    const existingItem = await Item.findOne({ 
      userId: req.userId, 
      deviceId: itemData.deviceId 
    });

    let item;
    let action;
    
    if (existingItem) {
      item = await Item.findOneAndUpdate(
        { _id: existingItem._id },
        { ...itemData, active: true, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      action = 'reactivate';
      logger.info(`Reactivated item with deviceId: ${itemData.deviceId}`);
    } else {
      item = new Item(itemData);
      await item.save();
      action = 'create';
    }

    emitToUser(req.app.get('io'), req.userId, action, { item });
    res.status(201).json(item);
  } catch (error) {
    logger.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      geofenceId: normalizeGeofenceId(req.body.geofenceId)
    };

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const commandPayload = {};
    if (req.body.thresholdWeight !== undefined) {
      commandPayload.threshold = item.thresholdWeight;
    }
    if (req.body.tare === true) {
      commandPayload.tare = true;
    }
    
    if (Object.keys(commandPayload).length > 0) {
      mqttService.publishCommand(item.deviceId, commandPayload);
    }

    emitToUser(req.app.get('io'), req.userId, 'update', { item });
    res.json(item);
  } catch (error) {
    logger.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { permanent } = req.query;
    
    if (permanent === 'true') {
      const item = await Item.findOneAndDelete({ _id: req.params.id, userId: req.userId });
      
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const deletedReadings = await Reading.deleteMany({ itemId: req.params.id });
      logger.info(`Permanently deleted item ${req.params.id} and ${deletedReadings.deletedCount} readings`);
      
      emitToUser(req.app.get('io'), req.userId, 'delete-permanent', { itemId: req.params.id });
      res.json({ message: 'Item and all data permanently deleted' });
    } else {
      const item = await Item.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { active: false },
        { new: true }
      );

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      logger.info(`Soft deleted item ${req.params.id}, readings preserved`);
      emitToUser(req.app.get('io'), req.userId, 'delete', { itemId: req.params.id });
      res.json({ message: 'Item deactivated successfully (data preserved)' });
    }
  } catch (error) {
    logger.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
      return res.status(404).json({ error: 'Item not found' });
    }

    // Propagate important changes back to the device via MQTT command channel
    const commandPayload = {};
    if (req.body.thresholdWeight !== undefined) {
      commandPayload.threshold = item.thresholdWeight;
    }
    if (req.body.tare === true) {
      commandPayload.tare = true;
    }
    if (Object.keys(commandPayload).length > 0) {
      mqttService.publishCommand(item.deviceId, commandPayload);
    }

    // Broadcast item change to user's sockets
    const io = req.app.get('io');
    io.to(`user-${req.userId}`).emit('item-update', { action: 'update', item });

    res.json(item);
  } catch (error) {
    logger.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item (soft delete by default, preserves readings)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { permanent } = req.query; // ?permanent=true for hard delete
    
    if (permanent === 'true') {
      // Hard delete - remove item and all readings
      const item = await Item.findOneAndDelete({ _id: req.params.id, userId: req.userId });
      
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Also delete all associated readings
      const Reading = require('../models/Reading');
      const deletedReadings = await Reading.deleteMany({ itemId: req.params.id });
      
      logger.info(`Permanently deleted item ${req.params.id} and ${deletedReadings.deletedCount} readings`);
      
      // Broadcast item change to user's sockets
      const io = req.app.get('io');
      io.to(`user-${req.userId}`).emit('item-update', { action: 'delete-permanent', itemId: req.params.id });

      res.json({ message: 'Item and all data permanently deleted' });
    } else {
      // Soft delete - preserve readings for potential reactivation
      const item = await Item.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { active: false },
        { new: true }
      );

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      logger.info(`Soft deleted item ${req.params.id}, readings preserved`);

      // Broadcast item change to user's sockets
      const io = req.app.get('io');
      io.to(`user-${req.userId}`).emit('item-update', { action: 'delete', itemId: req.params.id });

      res.json({ message: 'Item deactivated successfully (data preserved)' });
    }
  } catch (error) {
    logger.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
