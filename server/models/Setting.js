const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema(
  {
    restaurantName: {
      type: String,
      default: 'UrbanBite Cafe',
      trim: true
    },
    openTime: {
      type: String,
      default: '11:00',
      trim: true
    },
    closeTime: {
      type: String,
      default: '23:00',
      trim: true
    },
    turnoverBufferMinutes: {
      type: Number,
      default: 30
    },
    minBookingMinutes: {
      type: Number,
      default: 30
    },
    cancellationCutoffMinutes: {
      type: Number,
      default: 30
    },
    address: {
      type: String,
      default: 'The Pavilion Terrace, Boulevard 4',
      trim: true
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Setting', SettingSchema);
