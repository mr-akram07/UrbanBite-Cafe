require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
  connectDB,
  isMongoConnected,
  getLocalDateString,
  getSettings,
  Setting,
  Table,
  Booking,
  Waitlist,
  Admin
} = require('./db');
const {
  timeToMinutes,
  minutesToTime,
  getBookingDateTime,
  validateBookingSlot,
  getTableScheduleDetails,
  canCancelBooking
} = require('./bookingLogic');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// CORS configuration supporting client URL and local origins
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// HEALTH & DB STATUS ENDPOINT
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'MongoDB',
    connected: isMongoConnected(),
    port: PORT,
    clientUrl: CLIENT_URL
  });
});

// ==========================================
// ADMIN AUTHENTICATION & CREDENTIALS
// ==========================================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter both Owner ID and Password.'
      });
    }

    const u = username.trim();
    const p = password.trim();

    // Find admin by username (case-insensitive)
    let admin = await Admin.findOne({
      username: { $regex: new RegExp(`^${u}$`, 'i') }
    });

    // Fallback seed if DB didn't have one yet
    if (!admin) {
      const count = await Admin.countDocuments();
      if (count === 0 && (u === 'admin' || u === 'owner') && p === 'admin123') {
        admin = await Admin.create({ username: 'admin', password: 'admin123', role: 'owner' });
      }
    }

    if (admin && admin.password === p) {
      return res.json({
        success: true,
        token: 'aura-admin-session-' + Date.now(),
        username: admin.username,
        message: 'Logged in successfully'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid Owner ID or Password.'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Change Admin ID & Password
app.post('/api/admin/change-credentials', async (req, res) => {
  try {
    const { currentUsername, currentPassword, newUsername, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is required to verify identity.'
      });
    }

    // Find admin
    let admin = null;
    if (currentUsername) {
      admin = await Admin.findOne({
        username: { $regex: new RegExp(`^${currentUsername.trim()}$`, 'i') }
      });
    }
    if (!admin) {
      admin = await Admin.findOne();
    }

    if (!admin) {
      admin = await Admin.create({ username: 'admin', password: 'admin123', role: 'owner' });
    }

    // Verify current password
    if (admin.password !== currentPassword.trim()) {
      return res.status(401).json({
        success: false,
        error: 'Current password does not match. Please verify your password.'
      });
    }

    // Validate and update new username if provided
    if (newUsername && newUsername.trim()) {
      const cleanNewUser = newUsername.trim();
      if (cleanNewUser.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'New Owner ID must be at least 3 characters long.'
        });
      }

      // Check if username already taken by another account
      const existing = await Admin.findOne({
        username: { $regex: new RegExp(`^${cleanNewUser}$`, 'i') },
        _id: { $ne: admin._id }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'This Owner ID is already taken. Please choose a different ID.'
        });
      }

      admin.username = cleanNewUser;
    }

    // Validate and update new password if provided
    if (newPassword && newPassword.trim()) {
      const cleanNewPass = newPassword.trim();
      if (cleanNewPass.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'New Password must be at least 4 characters long.'
        });
      }
      admin.password = cleanNewPass;
    }

    await admin.save();
    console.log(`[ADMIN CREDENTIALS UPDATED IN MONGODB] New ID: ${admin.username}`);

    res.json({
      success: true,
      message: 'Admin ID & Password updated successfully in database!',
      username: admin.username
    });
  } catch (err) {
    console.error('Error changing admin credentials:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SETTINGS ENDPOINTS (Open/Close times, buffers)
// ==========================================
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      success: true,
      settings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    console.log('[SETTINGS UPDATED IN MONGODB]', settings.toObject());
    res.json({
      success: true,
      settings: settings.toObject(),
      message: 'Restaurant settings updated successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// TABLES ENDPOINTS (CRUD & Live Status)
// ==========================================

// GET all tables with availability check for a specific date and time
app.get('/api/tables', async (req, res) => {
  try {
    const { date, startTime, duration } = req.query;
    const settings = await getSettings();
    const targetDate = date || getLocalDateString(0);
    const targetStart = startTime || null;
    const durationMins = duration ? parseInt(duration, 10) : (settings.minBookingMinutes || 30);

    let targetEnd = null;
    if (targetStart) {
      targetEnd = minutesToTime(timeToMinutes(targetStart) + durationMins);
    }

    const tables = await Table.find().sort({ tableNumber: 1 }).lean();
    const dateBookings = await Booking.find({
      date: targetDate,
      status: { $ne: 'Cancelled' }
    }).lean();

    const tableResults = tables.map(table => {
      // Find all non-cancelled bookings for this table on targetDate
      const tableBookings = dateBookings.filter(b => b.tableId === table.id);

      const schedule = getTableScheduleDetails(tableBookings, targetStart, settings);

      let isAvailable = table.status !== 'Inactive';
      let conflictReason = table.status === 'Inactive' ? 'Table is currently under maintenance.' : null;
      let conflictBooking = null;

      if (table.status !== 'Inactive' && targetStart && targetEnd) {
        const validation = validateBookingSlot(tableBookings, targetStart, targetEnd, null, settings);
        if (!validation.valid) {
          isAvailable = false;
          conflictReason = validation.error;
          conflictBooking = validation.conflictBooking || null;
        }
      }

      return {
        ...table,
        isAvailable,
        conflictReason,
        conflictBooking,
        activeBookings: schedule.activeBookings,
        nextBooking: schedule.nextBooking,
        maxEndTimeAllowed: schedule.maxEndTimeAllowed
      };
    });

    res.json({
      success: true,
      date: targetDate,
      queryTime: targetStart,
      settings,
      tables: tableResults
    });
  } catch (err) {
    console.error('Error fetching tables from MongoDB:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Add Table
app.post('/api/tables', async (req, res) => {
  try {
    const { name, capacity, section, features } = req.body;
    if (!name || !capacity) {
      return res.status(400).json({ success: false, error: 'Table Name and Capacity are required.' });
    }

    const allTables = await Table.find().lean();
    const nextNumber = allTables.length > 0 ? Math.max(...allTables.map(t => t.tableNumber || 0)) + 1 : 1;
    const newTableData = {
      id: 'T' + nextNumber + '-' + Date.now().toString(36).substring(4),
      tableNumber: nextNumber,
      name: name.trim(),
      capacity: parseInt(capacity, 10),
      section: section || 'Main Dining Hall',
      features: Array.isArray(features) ? features : (features ? features.split(',').map(s => s.trim()) : ['Dining Table']),
      status: 'Active'
    };

    const createdTable = await Table.create(newTableData);

    res.status(201).json({
      success: true,
      table: createdTable.toObject(),
      message: `Table #${nextNumber} added successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Update Table
app.put('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTable = await Table.findOneAndUpdate(
      { id },
      { $set: req.body },
      { new: true }
    ).lean();

    if (!updatedTable) {
      return res.status(404).json({ success: false, error: 'Table not found.' });
    }

    res.json({
      success: true,
      table: updatedTable,
      message: 'Table updated successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Delete Table
app.delete('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const hasActive = await Booking.exists({ tableId: id, status: { $ne: 'Cancelled' } });
    if (hasActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete table with active reservations. Please cancel or complete them first.'
      });
    }

    const deleted = await Table.findOneAndDelete({ id });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Table not found.' });
    }

    res.json({ success: true, message: 'Table removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single table schedule
app.get('/api/tables/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const targetDate = req.query.date || getLocalDateString(0);

    const table = await Table.findOne({ id }).lean();
    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    const tableBookings = await Booking.find({
      tableId: id,
      date: targetDate,
      status: { $ne: 'Cancelled' }
    }).lean();

    tableBookings.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    res.json({
      success: true,
      table,
      date: targetDate,
      bookings: tableBookings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// BOOKING VALIDATION PRE-CHECK
// ==========================================
app.post('/api/bookings/validate', async (req, res) => {
  try {
    const { tableId, date, startTime, endTime, excludeBookingId } = req.body;

    if (!tableId || !date || !startTime || !endTime) {
      return res.status(400).json({
        valid: false,
        error: 'Please provide tableId, date, startTime, and endTime.'
      });
    }

    const settings = await getSettings();
    const tableBookings = await Booking.find({
      tableId,
      date,
      status: { $ne: 'Cancelled' }
    }).lean();

    const validation = validateBookingSlot(tableBookings, startTime, endTime, excludeBookingId, settings);
    const schedule = getTableScheduleDetails(tableBookings, startTime, settings);

    res.json({
      ...validation,
      nextBooking: schedule.nextBooking,
      maxEndTimeAllowed: schedule.maxEndTimeAllowed
    });
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// ==========================================
// CREATE BOOKING
// ==========================================
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      tableId,
      customerName,
      contact,
      email,
      guests,
      date,
      startTime,
      endTime,
      specialRequests
    } = req.body;

    if (!tableId || !customerName || !contact || !guests || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required booking fields (Table, Name, Contact, Guests, Date, Start Time, End Time).'
      });
    }

    const settings = await getSettings();
    const table = await Table.findOne({ id: tableId }).lean();
    if (!table) {
      return res.status(404).json({ success: false, error: 'Selected table does not exist.' });
    }

    if (table.status === 'Inactive') {
      return res.status(400).json({ success: false, error: 'This table is currently inactive or under maintenance.' });
    }

    // Capacity check
    const guestCount = parseInt(guests, 10);
    if (guestCount > table.capacity) {
      return res.status(400).json({
        success: false,
        error: `Selected table (${table.name}) has a maximum capacity of ${table.capacity} guests. You entered ${guestCount}. Please choose a larger table.`
      });
    }

    // Operating hours & conflict validation
    const tableBookings = await Booking.find({
      tableId,
      date,
      status: { $ne: 'Cancelled' }
    }).lean();

    const validation = validateBookingSlot(tableBookings, startTime, endTime, null, settings);
    if (!validation.valid) {
      return res.status(409).json({
        success: false,
        error: validation.error,
        conflictBooking: validation.conflictBooking || null,
        maxAllowedEndTime: validation.maxAllowedEndTime || null,
        nextBookingStart: validation.nextBookingStart || null
      });
    }

    const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
    const bookingCode = 'RES-' + Math.floor(1000 + Math.random() * 9000);
    const newBookingData = {
      id: 'BK-' + Date.now().toString(36).toUpperCase(),
      bookingCode,
      tableId,
      tableNumber: table.tableNumber,
      tableName: table.name,
      customerName: customerName.trim(),
      contact: contact.trim(),
      email: (email || '').trim(),
      guests: guestCount,
      date,
      startTime,
      endTime,
      durationMinutes,
      specialRequests: (specialRequests || '').trim(),
      status: 'Confirmed'
    };

    const newBooking = await Booking.create(newBookingData);

    console.log(`[BOOKING CREATED IN MONGODB] Code: ${bookingCode}, Table ${table.tableNumber}, ${date} ${startTime}-${endTime}`);

    res.status(201).json({
      success: true,
      message: 'Table booked successfully!',
      booking: newBooking.toObject()
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// GET BOOKINGS (Owner & Filter)
// ==========================================
app.get('/api/bookings', async (req, res) => {
  try {
    const { date, tableId, status, search } = req.query;
    const settings = await getSettings();
    const now = new Date();

    const query = {};
    if (date) query.date = date;
    if (tableId) query.tableId = tableId;
    if (status) query.status = new RegExp('^' + status + '$', 'i');

    if (search) {
      const q = search.trim();
      query.$or = [
        { customerName: { $regex: q, $options: 'i' } },
        { contact: { $regex: q, $options: 'i' } },
        { bookingCode: { $regex: q, $options: 'i' } }
      ];
    }

    let rawBookings = await Booking.find(query).lean();

    let list = rawBookings.map(b => {
      const cancelCheck = canCancelBooking(b, now, settings);
      return {
        ...b,
        canCancel: cancelCheck.allowed,
        cancellationReason: cancelCheck.reason || null,
        minutesUntilBooking: cancelCheck.minutesRemaining,
        cutoffTime: cancelCheck.cutoffTime
      };
    });

    list.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    res.json({ success: true, count: list.length, bookings: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single booking by Code or ID
app.get('/api/bookings/lookup/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const settings = await getSettings();
    const cleanCode = code.trim();

    const booking = await Booking.findOne({
      $or: [
        { bookingCode: cleanCode.toUpperCase() },
        { id: cleanCode }
      ]
    }).lean();

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking reservation not found.' });
    }

    const cancelCheck = canCancelBooking(booking, new Date(), settings);
    res.json({
      success: true,
      booking: {
        ...booking,
        canCancel: cancelCheck.allowed,
        cancellationReason: cancelCheck.reason || null,
        minutesUntilBooking: cancelCheck.minutesRemaining,
        cutoffTime: cancelCheck.cutoffTime
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// CANCEL BOOKING
// ==========================================
app.post('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { isOwnerOverride, reason } = req.body || {};
    const settings = await getSettings();

    const booking = await Booking.findOne({
      $or: [{ id }, { bookingCode: id.toUpperCase() }]
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(400).json({ success: false, error: 'Booking is already cancelled.' });
    }

    const cancelCheck = canCancelBooking(booking.toObject(), new Date(), settings);

    if (!cancelCheck.allowed && !isOwnerOverride) {
      return res.status(400).json({
        success: false,
        error: cancelCheck.reason,
        cutoffTime: cancelCheck.cutoffTime,
        minutesRemaining: cancelCheck.minutesRemaining
      });
    }

    booking.status = 'Cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || (isOwnerOverride ? 'Cancelled by Restaurant Management' : 'Cancelled by Guest');
    booking.cancelledBy = isOwnerOverride ? 'Owner/Manager' : 'Guest';

    await booking.save();

    console.log(`[BOOKING CANCELLED IN MONGODB] ID: ${booking.id}, Code: ${booking.bookingCode}`);

    res.json({
      success: true,
      message: 'Booking cancelled successfully.',
      booking: booking.toObject()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// UPDATE BOOKING STATUS (Check-in / Seated / Completed)
// ==========================================
app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Confirmed', 'Seated', 'Completed', 'No-Show', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid booking status.' });
    }

    const booking = await Booking.findOne({
      $or: [{ id }, { bookingCode: id.toUpperCase() }]
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    booking.status = status;
    booking.updatedAt = new Date();
    await booking.save();

    res.json({ success: true, booking: booking.toObject() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// DELETE BOOKING (Permanently remove from MongoDB)
// ==========================================
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Booking.findOneAndDelete({
      $or: [{ id }, { bookingCode: id.toUpperCase() }]
    });

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Booking reservation not found.' });
    }

    console.log(`[BOOKING DELETED FROM MONGODB] ID: ${deleted.id}, Code: ${deleted.bookingCode}, Guest: ${deleted.customerName}`);

    res.json({
      success: true,
      message: `Reservation ${deleted.bookingCode} was permanently deleted.`,
      booking: deleted
    });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear all cancelled bookings (bulk delete)
app.post('/api/bookings/clear-cancelled', async (req, res) => {
  try {
    const { date } = req.body || {};
    const query = { status: 'Cancelled' };
    if (date) query.date = date;

    const result = await Booking.deleteMany(query);
    console.log(`[CANCELLED BOOKINGS CLEARED] Deleted ${result.deletedCount} records.`);

    res.json({
      success: true,
      message: `${result.deletedCount} cancelled reservation(s) permanently removed.`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error clearing cancelled bookings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// WAITLIST ENDPOINTS
// ==========================================
app.get('/api/waitlist', async (req, res) => {
  try {
    const today = getLocalDateString(0);
    const targetDate = req.query.date || today;

    const waitlist = await Waitlist.find({ date: targetDate })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, waitlist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/waitlist', async (req, res) => {
  try {
    const { customerName, contact, guests, preferredTime, notes, date } = req.body;
    if (!customerName || !contact || !guests) {
      return res.status(400).json({ success: false, error: 'Name, Contact, and Guests are required.' });
    }

    const targetDate = date || getLocalDateString(0);
    const newEntryData = {
      id: 'WL-' + Date.now().toString(36).toUpperCase(),
      customerName: customerName.trim(),
      contact: contact.trim(),
      guests: parseInt(guests, 10),
      date: targetDate,
      preferredTime: preferredTime || 'Immediate Walk-in',
      notes: notes || '',
      status: 'Waiting'
    };

    const newEntry = await Waitlist.create(newEntryData);
    const waitingCount = await Waitlist.countDocuments({ date: targetDate, status: 'Waiting' });

    res.status(201).json({
      success: true,
      message: 'Added to waitlist successfully!',
      entry: newEntry.toObject(),
      queuePosition: waitingCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/waitlist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const entry = await Waitlist.findOneAndUpdate(
      { id },
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Waitlist entry not found.' });
    }

    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ADMIN DASHBOARD SUMMARY STATS
// ==========================================
app.get('/api/admin/stats', async (req, res) => {
  try {
    const today = getLocalDateString(0);

    const [totalTables, todayBookings, activeWaitlist] = await Promise.all([
      Table.countDocuments(),
      Booking.find({ date: today }).lean(),
      Waitlist.countDocuments({ date: today, status: 'Waiting' })
    ]);

    const confirmed = todayBookings.filter(b => b.status === 'Confirmed').length;
    const seated = todayBookings.filter(b => b.status === 'Seated').length;
    const cancelled = todayBookings.filter(b => b.status === 'Cancelled').length;

    res.json({
      success: true,
      stats: {
        totalTables,
        todayTotalBookings: todayBookings.length,
        todayConfirmed: confirmed,
        todaySeated: seated,
        todayCancelled: cancelled,
        activeWaitlist
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Connect to MongoDB and start Express server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✨ Restaurant Booking Server running on http://localhost:${PORT}`);
    console.log(`⚙️  Loaded configuration from .env: MONGO_URI, PORT=${PORT}, CLIENT_URL=${CLIENT_URL}`);
  });
});
