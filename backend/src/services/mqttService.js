const mqtt = require('mqtt');
const logger = require('../utils/logger');
const Item = require('../models/Item');
const Reading = require('../models/Reading');
const alertService = require('./alertService');

// MQTT Configuration
const MQTT_CONFIG = {
  reconnectPeriod: 1000,
  clientIdPrefix: 'itemreminder_backend_'
};

const TOPICS = {
  telemetry: 'itemreminder/devices/+/weight',
  status: 'itemreminder/devices/+/status',
  legacyTelemetry: 'itemreminder/weight',
  legacyStatus: 'itemreminder/status'
};

class MqttService {
  constructor() {
    this.client = null;
    this.io = null;
  }

  start(io) {
    this.io = io;
    
    const config = this.buildConnectionConfig();
    const broker = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
    
    this.client = mqtt.connect(broker, config);
    this.setupEventHandlers();
  }

  buildConnectionConfig() {
    return {
      clientId: MQTT_CONFIG.clientIdPrefix + Math.random().toString(16).substr(2, 8),
      username: process.env.MQTT_USER || '',
      password: process.env.MQTT_PASSWORD || '',
      reconnectPeriod: MQTT_CONFIG.reconnectPeriod
    };
  }

  setupEventHandlers() {
    this.client.on('connect', () => this.handleConnect());
    this.client.on('message', (topic, message) => this.handleMessage(topic, message));
    this.client.on('error', (error) => this.handleError(error));
    this.client.on('offline', () => this.handleOffline());
    this.client.on('reconnect', () => this.handleReconnect());
  }

  handleConnect() {
    const broker = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
    logger.info('MQTT connected to broker:', broker);
    this.subscribeToTopics();
  }

  subscribeToTopics() {
    const topicsToSubscribe = Object.values(TOPICS);
    
    topicsToSubscribe.forEach((topic) => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          logger.error(`MQTT subscribe error for ${topic}:`, err);
        } else {
          logger.info(`MQTT subscribed to ${topic}`);
        }
      });
    });
  }

  async handleMessage(topic, message) {
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
  }

  handleError(error) {
    logger.error('MQTT error:', error);
  }

  handleOffline() {
    logger.warn('MQTT client offline');
  }

  handleReconnect() {
    logger.info('MQTT reconnecting...');
  }

  parseTopic(topic) {
    const parts = topic.split('/');

    // Modern format: itemreminder/devices/{deviceId}/{type}
    if (parts.length >= 4 && parts[0] === 'itemreminder' && parts[1] === 'devices') {
      const deviceId = parts[2];
      const type = ['weight', 'status'].includes(parts[3]) ? parts[3] : null;
      return { type, deviceIdFromTopic: deviceId };
    }

    // Legacy format support
    if (topic === TOPICS.legacyTelemetry) {
      return { type: 'weight', deviceIdFromTopic: null };
    }

    if (topic === TOPICS.legacyStatus) {
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

      // Emit real-time update to the specific user who owns this item
      if (this.io) {
        const updateData = {
          itemId: item._id,
          deviceId: device_id,
          weight,
          status: item.status,
          wearStatus: item.wearStatus,
          isWorn: item.isWorn,
          timestamp: new Date()
        };
        
        // Emit to specific user's room
        this.io.to(`user-${item.userId}`).emit('weight_update', updateData);
        
        // Also emit globally for backwards compatibility
        this.io.emit('weight_update', updateData);
        
        logger.info(`Emitted weight update for item ${item.name} to user ${item.userId}:`, updateData);
      }

      // Check for alerts - use item.status which was calculated above
      if (item.status === 'LOW' && item.notificationsEnabled) {
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
          data: { weight, threshold: item.thresholdWeight }
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

        // Emit real-time update to the specific user who owns this item
        if (this.io) {
          const statusData = {
            itemId: item._id,
            deviceId: device_id,
            status,
            timestamp: new Date()
          };
          
          // Emit to specific user's room
          this.io.to(`user-${item.userId}`).emit('status_update', statusData);
          
          // Also emit globally for backwards compatibility
          this.io.emit('status_update', statusData);
          
          logger.info(`Emitted status update for item ${item.name} to user ${item.userId}:`, statusData);
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
