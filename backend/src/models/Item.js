const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['medication', 'grocery', 'supply', 'other'],
    default: 'other'
  },
  thresholdWeight: {
    type: Number,
    required: true,
    default: 10
  },
  currentWeight: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    enum: ['grams', 'kg', 'oz', 'lbs'],
    default: 'grams'
  },
  status: {
    type: String,
    enum: ['OK', 'LOW', 'EMPTY', 'OFFLINE'],
    default: 'OK'
  },
  lastReading: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

itemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

itemSchema.index({ userId: 1, deviceId: 1 });

module.exports = mongoose.model('Item', itemSchema);
