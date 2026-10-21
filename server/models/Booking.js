const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    tableId: {
      type: String,
      required: true,
      trim: true
    },
    tableNumber: {
      type: Number,
      required: true
    },
    tableName: {
      type: String,
      default: '',
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
    email: {
      type: String,
      default: '',
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
    startTime: {
      type: String,
      required: true,
      trim: true // Format: HH:mm
    },
    endTime: {
      type: String,
      required: true,
      trim: true // Format: HH:mm
    },
    durationMinutes: {
      type: Number,
      required: true
    },
    specialRequests: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['Confirmed', 'Seated', 'Completed', 'No-Show', 'Cancelled'],
      default: 'Confirmed'
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancellationReason: {
      type: String,
      default: null
    },
    cancelledBy: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookups
BookingSchema.index({ date: 1, tableId: 1, status: 1 });
BookingSchema.index({ contact: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
