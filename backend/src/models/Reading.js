const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  weight: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['OK', 'LOW'],
    required: true
  },
  wifiRssi: {
    type: Number
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// TTL index to automatically delete old readings after 90 days
readingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Reading', readingSchema);
