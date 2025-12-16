const mqtt = require('mqtt');
const logger = require('../utils/logger');
const Item = require('../models/Item');
const Reading = require('../models/Reading');
const alertService = require('./alertService');

const MQTT_CONFIG = {
  reconnectPeriod: 1000,
  clientIdPrefix: 'itemreminder_backend_'
};

const TOPICS = {
  weight: 'itemreminder/devices/+/weight',
  status: 'itemreminder/devices/+/status'
};

const STATUS_THRESHOLDS = {
  EMPTY: 0,
  LOW_WEIGHT_THRESHOLD: 5
};

class MqttService {
  constructor() {
    this.client = null;
    this.io = null;
  }

  start(io) {
    this.io = io;
    const broker = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
    
    const config = {
      clientId: MQTT_CONFIG.clientIdPrefix + Math.random().toString(16).substr(2, 8),
      username: process.env.MQTT_USER || '',
      password: process.env.MQTT_PASSWORD || '',
      reconnectPeriod: MQTT_CONFIG.reconnectPeriod
    };
    
    this.client = mqtt.connect(broker, config);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('connect', () => {
      logger.info('MQTT connected to broker');
      this.subscribeToTopics();
    });
    
    this.client.on('message', (topic, message) => this.handleMessage(topic, message));
    this.client.on('error', (error) => logger.error('MQTT error:', error));
    this.client.on('offline', () => logger.warn('MQTT client offline'));
    this.client.on('reconnect', () => logger.info('MQTT reconnecting...'));
  }

  subscribeToTopics() {
    Object.values(TOPICS).forEach((topic) => {
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
      logger.info(`MQTT message on ${topic}: ${messageString}`);
      
      const data = JSON.parse(messageString);
      const { type, deviceId } = this.parseTopic(topic);
      
      if (!deviceId || !data.device_id) {
        logger.warn(`Invalid MQTT message: missing device ID`);
        return;
      }

      if (type === 'weight') {
        await this.handleWeightData(data);
      } else if (type === 'status') {
        await this.handleStatusData(data);
      }
    } catch (error) {
      logger.error('Error processing MQTT message:', error);
    }
  }

  parseTopic(topic) {
    const parts = topic.split('/');
    
    if (parts.length >= 4 && parts[0] === 'itemreminder' && parts[1] === 'devices') {
      return {
        type: parts[3],
        deviceId: parts[2]
      };
    }
    
    return { type: null, deviceId: null };
  }

  async handleWeightData(data) {
    const { device_id, weight, threshold, status, wifi_rssi, wear_status } = data;

    try {
      const item = await Item.findOne({ deviceId: device_id, active: true });
      
      if (!item) {
        logger.warn(`Active item not found for device ${device_id}`);
        return;
      }

      this.updateItemFromWeight(item, { weight, threshold, status, wear_status });
      await item.save();

      await this.saveReading(item, { weight, threshold, status, wifi_rssi });
      this.emitWeightUpdate(item, { weight, status });
      
      if (this.shouldTriggerAlert(item)) {
        await this.createLowWeightAlert(item);
      }
    } catch (error) {
      logger.error('Error handling weight data:', error);
    }
  }

  updateItemFromWeight(item, { weight, threshold, status, wear_status }) {
    item.currentWeight = weight;
    item.lastReading = new Date();
    
    if (threshold !== undefined) {
      item.thresholdWeight = threshold;
    }

    if (wear_status !== undefined) {
      this.updateWearableMode(item, wear_status, weight);
    } else {
      this.updateWeightMode(item, status, weight);
    }
  }

  updateWearableMode(item, wear_status, weight) {
    item.detectionMode = 'wearable';
    item.wearableMode = true;
    item.wearStatus = wear_status;
    item.isWorn = wear_status === 'ON';
    
    // Auto-detect OFF status for low weight
    if (weight < STATUS_THRESHOLDS.LOW_WEIGHT_THRESHOLD) {
      item.wearStatus = 'OFF';
      item.isWorn = false;
      item.status = 'OFF';
    } else {
      item.status = wear_status;
    }
  }

  updateWeightMode(item, status, weight) {
    item.detectionMode = 'weight';
    item.wearableMode = false;
    item.wearStatus = 'N/A';
    
    if (status) {
      item.status = status;
    } else {
      item.status = this.calculateWeightStatus(weight, item.thresholdWeight);
    }
  }

  calculateWeightStatus(weight, threshold) {
    if (weight <= STATUS_THRESHOLDS.EMPTY) return 'EMPTY';
    if (weight < threshold) return 'LOW';
    return 'OK';
  }

  async saveReading(item, { weight, threshold, status, wifi_rssi }) {
    const reading = new Reading({
      itemId: item._id,
      deviceId: item.deviceId,
      weight,
      threshold: threshold !== undefined ? threshold : item.thresholdWeight,
      status: status || item.status,
      wifiRssi: wifi_rssi
    });
    await reading.save();
  }

  emitWeightUpdate(item, { weight, status }) {
    if (!this.io) return;

    const updateData = {
      itemId: item._id,
      deviceId: item.deviceId,
      weight,
      status: item.status,
      wearStatus: item.wearStatus,
      isWorn: item.isWorn,
      timestamp: new Date()
    };
    
    this.io.to(`user-${item.userId}`).emit('weight_update', updateData);
    this.io.emit('weight_update', updateData);
  }

  shouldTriggerAlert(item) {
    return item.status === 'LOW' && item.notificationsEnabled;
  }

  async createLowWeightAlert(item) {
    const message = item.customAlertMessage || `${item.name} is running low (${item.currentWeight}g)`;
    
    await alertService.createAlert({
      userId: item.userId,
      itemId: item._id,
      type: 'low_weight',
      severity: 'warning',
      message,
      data: { weight: item.currentWeight, threshold: item.thresholdWeight }
    });
  }

  async handleStatusData(data) {
    const { device_id, status } = data;

    try {
      const item = await Item.findOne({ deviceId: device_id, active: true });
      
      if (!item) return;

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

      if (this.io) {
        const statusData = {
          itemId: item._id,
          deviceId: device_id,
          status,
          timestamp: new Date()
        };
        
        this.io.to(`user-${item.userId}`).emit('status_update', statusData);
        this.io.emit('status_update', statusData);
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
