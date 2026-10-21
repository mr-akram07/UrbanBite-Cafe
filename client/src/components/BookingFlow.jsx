import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, CheckCircle, AlertCircle, ChevronRight, ShieldCheck, Store } from 'lucide-react';
import BookingModal from './BookingModal';
import { getLocalDateString, formatTime12 } from '../utils/dateUtils';
import { useSettings } from '../context/SettingsContext';

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function BookingFlow() {
  const navigate = useNavigate();
  const todayStr = getLocalDateString(0);
  const tomorrowStr = getLocalDateString(1);
  const { settings: globalSettings, updateLocalSettings } = useSettings();

  const [settings, setSettings] = useState(globalSettings || {
    restaurantName: 'UrbanBite Cafe',
    openTime: '11:00',
    closeTime: '23:00',
    turnoverBufferMinutes: 30,
    minBookingMinutes: 30,
    cancellationCutoffMinutes: 30
  });

  useEffect(() => {
    if (globalSettings) {
      setSettings(globalSettings);
    }
  }, [globalSettings]);

  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('18:00');
  const [duration, setDuration] = useState(60);
  const [guestFilter, setGuestFilter] = useState('all');

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableForModal, setSelectedTableForModal] = useState(null);

  const fetchTablesAndSettings = () => {
    setLoading(true);
    fetch(`/api/tables?date=${date}&startTime=${startTime}&duration=${duration}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTables(data.tables || []);
          if (data.settings) {
            setSettings(data.settings);
            // Ensure startTime is within open/close range
            const openM = timeToMinutes(data.settings.openTime || '11:00');
            const closeM = timeToMinutes(data.settings.closeTime || '23:00');
            const curM = timeToMinutes(startTime);
            if (curM < openM || curM >= closeM) {
              setStartTime(data.settings.openTime || '11:00');
            }
          }
        }
      })
      .catch(err => console.error('Error fetching tables:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTablesAndSettings();
  }, [date, startTime, duration]);

  const filteredTables = tables.filter(t => {
    if (guestFilter === '2') return t.capacity >= 2;
    if (guestFilter === '4') return t.capacity >= 4;
    if (guestFilter === '6+') return t.capacity >= 6;
    return true;
  });

  const availableCount = tables.filter(t => t.isAvailable).length;

  // Generate dynamic time slots strictly constrained by Admin Open & Close Times
  const openMin = timeToMinutes(settings.openTime || '11:00');
  const closeMin = timeToMinutes(settings.closeTime || '23:00');
  const minBooking = settings.minBookingMinutes !== undefined ? settings.minBookingMinutes : 30;

  const validTimeSlots = [];
  for (let m = openMin; m <= closeMin - minBooking; m += 30) {
    validTimeSlots.push(minutesToTime(m));
  }

  // Calculate maximum allowed duration for selected start time so it doesn't exceed closing time
  const currentStartMin = timeToMinutes(startTime);
  const maxPossibleDuration = Math.max(minBooking, closeMin - currentStartMin);

  return (
    <div>
      {/* Date & Time Selector Card */}
      <div 
        className="card"
        style={{
          padding: '22px 24px',
          marginBottom: '28px'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-heading)', fontWeight: 600 }}>
              Dining Schedule
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Operating Hours Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: 'var(--gold-text)',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              padding: '4px 10px',
              borderRadius: '6px'
            }}>
              <Store size={13} />
              <span>Hours: {formatTime12(settings.openTime)} – {formatTime12(settings.closeTime)}</span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setDate(todayStr)}
                className="btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                  borderColor: date === todayStr ? 'var(--primary-gold)' : 'var(--border-color)',
                  color: date === todayStr ? 'var(--gold-text)' : 'var(--text-secondary)'
                }}
              >
                Today
              </button>
              <button
                onClick={() => setDate(tomorrowStr)}
                className="btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                  borderColor: date === tomorrowStr ? 'var(--primary-gold)' : 'var(--border-color)',
                  color: date === tomorrowStr ? 'var(--gold-text)' : 'var(--text-secondary)'
                }}
              >
                Tomorrow
              </button>
            </div>
          </div>
        </div>

        {/* Inputs Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px'
        }}>
          <div>
            <label className="form-label">
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Date
            </label>
            <input
              type="date"
              id="booking-date-input"
              className="form-input"
              value={date}
              min={todayStr}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">
              <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> Seating Time
            </label>
            <select
              id="booking-time-select"
              className="form-select"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              {validTimeSlots.map(timeStr => {
                const [h, m] = timeStr.split(':').map(Number);
                const ampm = h >= 12 ? 'PM' : 'AM';
                const displayH = h % 12 || 12;
                return (
                  <option key={timeStr} value={timeStr}>
                    {timeStr} ({displayH}:{m === 0 ? '00' : m} {ampm})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="form-label">
              <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> Duration (Min {minBooking}m)
            </label>
            <select
              id="booking-duration-select"
              className="form-select"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {[30, 45, 60, 90, 120, 150, 180]
                .filter(d => d >= minBooking && d <= maxPossibleDuration)
                .map(d => (
                  <option key={d} value={d}>
                    {d < 60 ? `${d} Minutes` : `${d / 60} Hour${d / 60 > 1 ? 's' : ''} (${d}m)`}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              <Users size={12} style={{ display: 'inline', marginRight: '4px' }} /> Party Size
            </label>
            <select
              id="booking-guests-filter"
              className="form-select"
              value={guestFilter}
              onChange={(e) => setGuestFilter(e.target.value)}
            >
              <option value="all">All Tables</option>
              <option value="2">2+ Guests</option>
              <option value="4">4+ Guests</option>
              <option value="6+">6+ Guests</option>
            </select>
          </div>
        </div>
      </div>

      {/* Header with Table Count */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)' }}>
          Available Tables ({availableCount} of {tables.length})
        </div>

        {availableCount === 0 && (
          <button
            onClick={() => navigate('/waitlist')}
            className="btn-primary"
            style={{ fontSize: '0.82rem', padding: '7px 14px' }}
          >
            All Busy • Join Waitlist
          </button>
        )}
      </div>

      {/* Tables Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '18px',
        marginBottom: '40px'
      }}>
        {filteredTables.map((table) => {
          const isAvail = table.isAvailable;
          const nextB = table.nextBooking;
          const maxAllowed = table.maxEndTimeAllowed;

          return (
            <div
              key={table.id}
              className="card card-interactive"
              style={{
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: isAvail ? 'var(--border-color)' : 'rgba(244, 63, 94, 0.3)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--primary-gold)', fontWeight: 600, letterSpacing: '0.04em' }}>
                      TABLE #{table.tableNumber}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--text-heading)', marginTop: '2px', fontWeight: 600 }}>
                      {table.name}
                    </h3>
                  </div>

                  <span className={isAvail ? 'badge-available' : 'badge-booked'}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isAvail ? '#10B981' : '#F43F5E',
                      display: 'inline-block'
                    }} />
                    {isAvail ? 'Available' : (table.status === 'Inactive' ? 'Maintenance' : 'Reserved')}
                  </span>
                </div>

                <div style={{
                  fontSize: '0.84rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>Up to {table.capacity} Guests</span>
                  <span>•</span>
                  <span>{table.section}</span>
                </div>

                {!isAvail && table.conflictReason && (
                  <div className="alert-danger" style={{ marginBottom: '14px' }}>
                    {table.conflictReason}
                  </div>
                )}

                {nextB && (
                  <div className="alert-warning" style={{ marginBottom: '14px' }}>
                    <strong>Next booked at {nextB.startTime}.</strong>
                    <div style={{ marginTop: '2px', color: 'var(--text-secondary)' }}>
                      Checkout allowed until <strong>{maxAllowed}</strong> ({settings.turnoverBufferMinutes || 30}m turnover buffer).
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '12px' }}>
                {isAvail ? (
                  <button
                    id={`btn-book-table-${table.tableNumber}`}
                    onClick={() => setSelectedTableForModal(table)}
                    className="btn-primary"
                    style={{ width: '100%', padding: '10px 14px' }}
                  >
                    Reserve Table #{table.tableNumber}
                    <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    disabled
                    className="btn-primary"
                    style={{ width: '100%', padding: '10px', opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    {table.status === 'Inactive' ? 'Table Under Maintenance' : 'Slot Unavailable'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Modal */}
      {selectedTableForModal && (
        <BookingModal
          isOpen={!!selectedTableForModal}
          table={selectedTableForModal}
          initialDate={date}
          initialStartTime={startTime}
          settings={settings}
          onClose={() => setSelectedTableForModal(null)}
          onBookingSuccess={() => {
            fetchTablesAndSettings();
          }}
        />
      )}
    </div>
  );
}
