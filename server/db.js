const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Setting = require('./models/Setting');
const Table = require('./models/Table');
const Booking = require('./models/Booking');
const Waitlist = require('./models/Waitlist');
const Admin = require('./models/Admin');

const DB_FILE = path.join(__dirname, 'db.json');

// Get date string in YYYY-MM-DD
function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const defaultTables = [
  {
    id: 'T1',
    tableNumber: 1,
    name: 'Window Romance Corner',
    capacity: 2,
    section: 'Window View',
    features: ['Candlelight Setting', 'Panoramic City View'],
    status: 'Active'
  },
  {
    id: 'T2',
    tableNumber: 2,
    name: 'Amber Leather Booth',
    capacity: 4,
    section: 'Main Dining Hall',
    features: ['Plush Velvet Booth', 'Warm Ambient Lighting'],
    status: 'Active'
  },
  {
    id: 'T3',
    tableNumber: 3,
    name: 'Garden Terrace Table',
    capacity: 4,
    section: 'Terrace & Veranda',
    features: ['Open Breeze', 'Surrounded by Greens'],
    status: 'Active'
  },
  {
    id: 'T4',
    tableNumber: 4,
    name: 'Royal Chandelier Table',
    capacity: 6,
    section: 'Center Court',
    features: ['Crystal Chandelier View', 'Family Dining Space'],
    status: 'Active'
  },
  {
    id: 'T5',
    tableNumber: 5,
    name: 'Grand VIP Suite',
    capacity: 8,
    section: 'Private Alcove',
    features: ['Private Butler Service', 'Acoustic Soundproofing'],
    status: 'Active'
  }
];

const defaultSettings = {
  restaurantName: 'UrbanBite Cafe',
  openTime: '11:00',
  closeTime: '23:00',
  turnoverBufferMinutes: 30,
  minBookingMinutes: 30,
  cancellationCutoffMinutes: 30,
  address: 'The Pavilion Terrace, Boulevard 4',
  phone: '+91 98765 43210'
};

let mongoConnected = false;

async function seedInitialData() {
  try {
    // 1. Settings Check & Seed
    const settingCount = await Setting.countDocuments();
    if (settingCount === 0) {
      let initialSettings = defaultSettings;
      if (fs.existsSync(DB_FILE)) {
        try {
          const json = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
          if (json.settings) initialSettings = { ...defaultSettings, ...json.settings };
        } catch (e) {
          console.warn('[DB MIGRATION] Notice: Could not parse db.json settings, using defaults');
        }
      }
      await Setting.create(initialSettings);
      console.log('✅ [MongoDB] Restaurant settings initialized');
    }

    // 2. Tables Check & Seed
    const tableCount = await Table.countDocuments();
    if (tableCount === 0) {
      let tablesToInsert = defaultTables;
      if (fs.existsSync(DB_FILE)) {
        try {
          const json = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
          if (Array.isArray(json.tables) && json.tables.length > 0) {
            tablesToInsert = json.tables;
          }
        } catch (e) {
          console.warn('[DB MIGRATION] Notice: Could not parse db.json tables, using defaultTables');
        }
      }
      await Table.insertMany(tablesToInsert);
      console.log(`✅ [MongoDB] ${tablesToInsert.length} Tables seeded`);
    }

    // 3. Bookings Check & Seed (if empty, migrate from db.json or seed samples)
    const bookingCount = await Booking.countDocuments();
    if (bookingCount === 0) {
      const today = getLocalDateString(0);
      const tomorrow = getLocalDateString(1);

      let bookingsToInsert = [
        {
          id: 'BK-' + Date.now().toString(36).toUpperCase() + '-1',
          bookingCode: 'RES-701',
          tableId: 'T1',
          tableNumber: 1,
          tableName: 'Window Romance Corner',
          customerName: 'Rahul Sharma',
          contact: '+91 98765 43210',
          email: 'rahul.sharma@example.com',
          guests: 2,
          date: today,
          startTime: '19:00',
          endTime: '20:00',
          durationMinutes: 60,
          specialRequests: 'Anniversary celebration with champagne',
          status: 'Confirmed'
        },
        {
          id: 'BK-' + Date.now().toString(36).toUpperCase() + '-2',
          bookingCode: 'RES-702',
          tableId: 'T1',
          tableNumber: 1,
          tableName: 'Window Romance Corner',
          customerName: 'Rahul Sharma (Advance)',
          contact: '+91 98765 43210',
          email: 'rahul.sharma@example.com',
          guests: 2,
          date: tomorrow,
          startTime: '19:00',
          endTime: '20:00',
          durationMinutes: 60,
          specialRequests: 'Window side preferred',
          status: 'Confirmed'
        },
        {
          id: 'BK-' + Date.now().toString(36).toUpperCase() + '-3',
          bookingCode: 'RES-402',
          tableId: 'T4',
          tableNumber: 4,
          tableName: 'Royal Chandelier Table',
          customerName: 'Priya Patel',
          contact: '+91 91234 56789',
          email: 'priya.patel@example.com',
          guests: 5,
          date: today,
          startTime: '20:30',
          endTime: '22:00',
          durationMinutes: 90,
          specialRequests: 'Birthday cake presentation at 9 PM',
          status: 'Confirmed'
        }
      ];

      if (fs.existsSync(DB_FILE)) {
        try {
          const json = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
          if (Array.isArray(json.bookings) && json.bookings.length > 0) {
            bookingsToInsert = json.bookings;
          }
        } catch (e) {
          console.warn('[DB MIGRATION] Notice: Could not parse db.json bookings');
        }
      }

      await Booking.insertMany(bookingsToInsert);
      console.log(`✅ [MongoDB] ${bookingsToInsert.length} Sample bookings initialized`);
    }

    // 4. Waitlist Check & Seed
    const waitlistCount = await Waitlist.countDocuments();
    if (waitlistCount === 0) {
      const today = getLocalDateString(0);
      let waitlistToInsert = [
        {
          id: 'WL-01',
          customerName: 'Aman Verma',
          contact: '+91 99887 76655',
          guests: 3,
          date: today,
          preferredTime: '19:30',
          notes: 'Any 4-seater table',
          status: 'Waiting'
        }
      ];

      if (fs.existsSync(DB_FILE)) {
        try {
          const json = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
          if (Array.isArray(json.waitlist) && json.waitlist.length > 0) {
            waitlistToInsert = json.waitlist;
          }
        } catch (e) {
          console.warn('[DB MIGRATION] Notice: Could not parse db.json waitlist');
        }
      }

      await Waitlist.insertMany(waitlistToInsert);
      console.log(`✅ [MongoDB] ${waitlistToInsert.length} Waitlist entries initialized`);
    }

    // 5. Admin Account Check & Seed
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const initialAdmin = {
        username: (process.env.ADMIN_USERNAME || 'admin').trim(),
        password: (process.env.ADMIN_PASSWORD || 'admin123').trim(),
        role: 'owner'
      };
      await Admin.create(initialAdmin);
      console.log('✅ [MongoDB] Initial Admin account initialized');
    }
  } catch (err) {
    console.error('❌ [MongoDB] Error during initial seeding:', err.message);
  }
}

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurant_booking';
  try {
    console.log(`[MongoDB] Connecting to database: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    await mongoose.connect(uri);
    mongoConnected = true;
    console.log(`🚀 [MongoDB] Connected successfully to host: ${mongoose.connection.host}, database: ${mongoose.connection.name}`);
    await seedInitialData();
    return true;
  } catch (err) {
    mongoConnected = false;
    console.error('❌ [MongoDB Connection Error]:', err.message);
    console.error('👉 Please check your MONGO_URI in server/.env or ensure MongoDB server is running.');
    return false;
  }
}

// Helper to get settings doc or default
async function getSettings() {
  try {
    let settings = await Setting.findOne().lean();
    if (!settings) {
      settings = await Setting.create(defaultSettings);
      return settings.toObject ? settings.toObject() : settings;
    }
    return settings;
  } catch (err) {
    console.error('Error fetching settings from DB:', err.message);
    return defaultSettings;
  }
}

module.exports = {
  connectDB,
  isMongoConnected: () => mongoConnected,
  getLocalDateString,
  getSettings,
  Setting,
  Table,
  Booking,
  Waitlist,
  Admin
};
