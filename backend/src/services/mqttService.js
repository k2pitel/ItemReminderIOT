const mqtt = require('mqtt');
const logger = require('../utils/logger');
const Item = require('../models/Item');
const Reading = require('../models/Reading');
const alertService = require('./alertService');

class MqttService {
  constructor() {
    this.client = null;
    this.io = null;
    this.topics = {
      telemetry: 'itemreminder/devices/+/weight',
      status: 'itemreminder/devices/+/status',
      legacyTelemetry: 'itemreminder/weight',
      legacyStatus: 'itemreminder/status'
    };
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
      
      // Subscribe to per-device topics and keep legacy topics for compatibility
      const topicsToSubscribe = [
        this.topics.telemetry,
        this.topics.status,
        this.topics.legacyTelemetry,
        this.topics.legacyStatus
      ];

      topicsToSubscribe.forEach((topic) => {
        this.client.subscribe(topic, (err) => {
          if (err) {
            logger.error(`MQTT subscribe error for ${topic}:`, err);
          } else {
            logger.info(`MQTT subscribed to ${topic}`);
          }
        });
      });
    });

    this.client.on('message', async (topic, message) => {
      try {
        const messageString = message.toString();
        logger.info(`Raw MQTT message on ${topic}: "${messageString}"`);
        
        const data = JSON.parse(messageString);
        const { type, deviceIdFromTopic } = this.parseTopic(topic);
        const normalizedData = this.normalizePayload(type, data, deviceIdFromTopic);

        if (!type || !normalizedData) {
          logger.warn(`MQTT message on ${topic} ignored: could not resolve type/device_id`);
          return;
        }

        logger.info(`MQTT message received on ${topic}:`, normalizedData);

        if (type === 'weight') {
          await this.handleWeightData(normalizedData);
        } else if (type === 'status') {
          await this.handleStatusData(normalizedData);
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

  parseTopic(topic) {
    const parts = topic.split('/');

    // itemreminder/devices/{deviceId}/{type}
    if (parts.length >= 4 && parts[0] === 'itemreminder' && parts[1] === 'devices') {
      const deviceId = parts[2];
      const type = parts[3] === 'weight' ? 'weight' : parts[3] === 'status' ? 'status' : null;
      return { type, deviceIdFromTopic: deviceId };
    }

    if (topic === 'itemreminder/weight') {
      return { type: 'weight', deviceIdFromTopic: null };
    }

    if (topic === 'itemreminder/status') {
      return { type: 'status', deviceIdFromTopic: null };
    }

    return { type: null, deviceIdFromTopic: null };
  }

  normalizePayload(type, data, deviceIdFromTopic) {
    if (!type) {
      return null;
    }

    const normalized = { ...data };
    if (!normalized.device_id && normalized.deviceId) {
      normalized.device_id = normalized.deviceId;
    }
    if (!normalized.device_id && deviceIdFromTopic) {
      normalized.device_id = deviceIdFromTopic;
    }

    if (!normalized.device_id) {
      logger.warn(`MQTT ${type} payload missing device_id. Topic device fallback: ${deviceIdFromTopic || 'none'}`);
      return null;
    }

    return normalized;
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

      const thresholdValue = typeof threshold === 'number' ? threshold : item.thresholdWeight;
      const statusValue = status || item.status;

      // Update basic data
      item.currentWeight = weight;
      if (threshold !== undefined) {
        item.thresholdWeight = threshold;
      } else {
        item.thresholdWeight = thresholdValue;
      }
      item.lastReading = new Date();
      
      // Handle detection mode and status
      if (wear_status !== undefined) {
        // Wearable mode detected
        item.wearStatus = wear_status;
        item.isWorn = wear_status === 'ON';
        
        // Auto-set detection mode if not already set
        if (!item.detectionMode || item.detectionMode !== 'wearable') {
          item.detectionMode = 'wearable';
          item.wearableMode = true;
        }
        
        // For wearable mode, use wearStatus as the main status
        item.status = wear_status; // Will be 'ON' or 'OFF'
      } else {
        // Weight mode (no wear_status provided)
        if (!item.detectionMode || item.detectionMode !== 'weight') {
          item.detectionMode = 'weight';
          item.wearableMode = false;
        }
        
        // For weight mode, use the status from sensor or calculate it
        if (status) {
          item.status = status;
        } else {
          // Calculate status based on weight and threshold
          if (weight <= 0) {
            item.status = 'EMPTY';
          } else if (weight < item.thresholdWeight) {
            item.status = 'LOW';
          } else {
            item.status = 'OK';
          }
        }
        item.wearStatus = 'N/A';
      }
      
      // Special logic: If wearable mode and weight is close to 0, force OFF status
      if (item.detectionMode === 'wearable' && weight < 5) {
        item.wearStatus = 'OFF';
        item.isWorn = false;
        item.status = 'OFF';
        logger.info(`Auto-detected OFF status for ${item.name} (weight: ${weight})`);
      }
      
      await item.save();

      // Save reading - use item values if not provided in MQTT message
      const reading = new Reading({
        itemId: item._id,
        deviceId: device_id,
        weight,
        threshold: threshold !== undefined ? threshold : item.thresholdWeight,
        status: status || item.status,
        wifiRssi: wifi_rssi
      });
      await reading.save();

      // Emit real-time update
      if (this.io) {
        this.io.emit('weight_update', {
          itemId: item._id,
          deviceId: device_id,
          weight,
<<<<<<< HEAD
          status: statusValue,
=======
          status: item.status,
>>>>>>> origin/Update-1.3
          wearStatus: item.wearStatus,
          isWorn: item.isWorn,
          timestamp: new Date()
        });
      }

<<<<<<< HEAD
      // Check for alerts
      if (statusValue === 'LOW') {
=======
      // Check for alerts - use item.status which was calculated above
      if (item.status === 'LOW' && item.notificationsEnabled) {
>>>>>>> origin/Update-1.3
        // Use custom alert message if available, otherwise use default
        const alertMessage = item.customAlertMessage 
          ? item.customAlertMessage 
          : `${item.name} is running low (${weight}g)`;
          
        await alertService.createAlert({
          userId: item.userId,
          itemId: item._id,
          type: 'low_weight',
          severity: 'warning',
          message: alertMessage,
<<<<<<< HEAD
          data: { weight, threshold: thresholdValue }
=======
          data: { weight, threshold: item.thresholdWeight }
>>>>>>> origin/Update-1.3
        });
      }

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

          if (item.notificationsEnabled) {
            await alertService.createAlert({
              userId: item.userId,
              itemId: item._id,
              type: 'offline',
              severity: 'critical',
              message: `${item.name} is offline`,
              data: { device_id }
            });
          }
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

  publishCommand(deviceId, message) {
    if (!deviceId) {
      logger.warn('Cannot publish command: missing deviceId');
      return;
    }

    const topic = `itemreminder/devices/${deviceId}/command`;
    this.publish(topic, message);
  }

  stop() {
    if (this.client) {
      this.client.end();
      logger.info('MQTT client disconnected');
    }
  }
}

module.exports = new MqttService();
