const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  radius: {
    type: Number,
    required: true,
    default: 100 // meters
  },
  triggerCondition: {
    type: String,
    enum: ['enter', 'exit', 'both'],
    default: 'both'
  },
  alertWhenLow: {
    type: Boolean,
    default: true
  },
  active: {
    type: Boolean,
    default: true
  },
  // User tracking fields for GPS-based alerts
  userCurrentlyInside: {
    type: Boolean,
    default: false
  },
  userEnteredAt: {
    type: Date
  },
  userExitedAt: {
    type: Date
  },
  lastLocationUpdate: {
    type: Date,
    default: Date.now
  },
  alertSettings: {
    notifyOnExit: {
      type: Boolean,
      default: true
    },
    notifyOnLowItemExit: {
      type: Boolean,
      default: true
    },
    minimumTimeInside: {
      type: Number, // minutes
      default: 30
    }
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

geofenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Geofence', geofenceSchema);
