const mqtt = require('mqtt');
const logger = require('../utils/logger');
const Item = require('../models/Item');
const Reading = require('../models/Reading');
const alertService = require('./alertService');
const geofenceService = require('./geofenceService');

class MqttService {
  constructor() {
    this.client = null;
    this.io = null;
  }

  start(io) {
    this.io = io;
    
    const options = {
      clientId: 'itemreminder_backend_' + Math.random().toString(16).substr(2, 8),
      username: process.env.MQTT_USER || '',
      password: process.env.MQTT_PASSWORD || '',
      reconnectPeriod: 1000
    };

    const broker = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
    this.client = mqtt.connect(broker, options);

    this.client.on('connect', () => {
      logger.info('MQTT connected to broker:', broker);
      
      // Subscribe to topics
      this.client.subscribe('itemreminder/weight', (err) => {
        if (err) logger.error('MQTT subscribe error:', err);
      });
      
      this.client.subscribe('itemreminder/status', (err) => {
        if (err) logger.error('MQTT subscribe error:', err);
      });
    });

    this.client.on('message', async (topic, message) => {
      try {
        const messageString = message.toString();
        logger.info(`Raw MQTT message on ${topic}: "${messageString}"`);
        
        const data = JSON.parse(messageString);
        logger.info(`MQTT message received on ${topic}:`, data);

        if (topic === 'itemreminder/weight') {
          await this.handleWeightData(data);
        } else if (topic === 'itemreminder/status') {
          await this.handleStatusData(data);
        }
      } catch (error) {
        logger.error('Error processing MQTT message:', error);
        logger.error('Raw message content:', message.toString());
      }
    });

    this.client.on('error', (error) => {
      logger.error('MQTT error:', error);
    });

    this.client.on('offline', () => {
      logger.warn('MQTT client offline');
    });

    this.client.on('reconnect', () => {
      logger.info('MQTT reconnecting...');
    });
  }

  async handleWeightData(data) {
    const { device_id, item_name, weight, threshold, status, wifi_rssi, wear_status } = data;

    try {
      // Find or create item
      let item = await Item.findOne({ deviceId: device_id });
      
      if (!item) {
        logger.warn(`Item not found for device ${device_id}, skipping...`);
        return;
      }

      // Update item
      item.currentWeight = weight;
      item.thresholdWeight = threshold;
      item.status = status;
      item.lastReading = new Date();
      
      // Handle wearable mode (ON/OFF detection)
      if (wear_status !== undefined) {
        item.wearStatus = wear_status;
        item.isWorn = wear_status === 'ON';
      }
      
      await item.save();

      // Save reading
      const reading = new Reading({
        itemId: item._id,
        deviceId: device_id,
        weight,
        threshold,
        status,
        wifiRssi: wifi_rssi
      });
      await reading.save();

      // Emit real-time update
      if (this.io) {
        this.io.emit('weight_update', {
          itemId: item._id,
          deviceId: device_id,
          weight,
          status,
          wearStatus: item.wearStatus,
          isWorn: item.isWorn,
          timestamp: new Date()
        });
      }

      // Check for alerts
      if (status === 'LOW') {
        await alertService.createAlert({
          userId: item.userId,
          itemId: item._id,
          type: 'low_weight',
          severity: 'warning',
          message: `${item.name} is running low (${weight}g)`,
          data: { weight, threshold }
        });
      }

      // Check geofence rules
      await geofenceService.checkGeofenceAlerts(item);

    } catch (error) {
      logger.error('Error handling weight data:', error);
    }
  }

  async handleStatusData(data) {
    const { device_id, status } = data;

    try {
      const item = await Item.findOne({ deviceId: device_id });
      
      if (item) {
        if (status === 'offline') {
          item.status = 'OFFLINE';
          await item.save();

          await alertService.createAlert({
            userId: item.userId,
            itemId: item._id,
            type: 'offline',
            severity: 'critical',
            message: `${item.name} is offline`,
            data: { device_id }
          });
        }

        // Emit real-time update
        if (this.io) {
          this.io.emit('status_update', {
            itemId: item._id,
            deviceId: device_id,
            status,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      logger.error('Error handling status data:', error);
    }
  }

  publish(topic, message) {
    if (this.client && this.client.connected) {
      this.client.publish(topic, JSON.stringify(message));
      logger.info(`MQTT published to ${topic}:`, message);
    } else {
      logger.warn('MQTT client not connected, cannot publish');
    }
  }

  stop() {
    if (this.client) {
      this.client.end();
      logger.info('MQTT client disconnected');
    }
  }
}

module.exports = new MqttService();
