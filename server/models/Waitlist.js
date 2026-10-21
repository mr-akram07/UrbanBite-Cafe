const mongoose = require('mongoose');

const WaitlistSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    contact: {
      type: String,
      required: true,
      trim: true
    },
    guests: {
      type: Number,
      required: true,
      min: 1
    },
    date: {
      type: String,
      required: true,
      trim: true // Format: YYYY-MM-DD
    },
    preferredTime: {
      type: String,
      default: 'Immediate Walk-in',
      trim: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['Waiting', 'Seated', 'Cancelled'],
      default: 'Waiting'
    }
  },
  {
    timestamps: true
  }
);

WaitlistSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Waitlist', WaitlistSchema);
