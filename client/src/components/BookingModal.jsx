import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, User, Phone, Mail, FileText, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getLocalDateString } from '../utils/dateUtils';
import { apiUrl } from '../utils/api';

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

export default function BookingModal({
  isOpen,
  onClose,
  table,
  initialDate,
  initialStartTime,
  settings,
  onBookingSuccess
}) {
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime || '18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [specialRequests, setSpecialRequests] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [conflictError, setConflictError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const minBooking = settings?.minBookingMinutes !== undefined ? settings.minBookingMinutes : 30;
  const closeMin = timeToMinutes(settings?.closeTime || '23:00');
  const bufferMins = settings?.turnoverBufferMinutes !== undefined ? settings.turnoverBufferMinutes : 30;

  useEffect(() => {
    if (table) {
      setDate(initialDate);
      setStartTime(initialStartTime || '18:00');
      const startMin = timeToMinutes(initialStartTime || '18:00');
      const defaultEndMin = Math.min(closeMin, startMin + 60);
      setEndTime(minutesToTime(defaultEndMin));
      setGuests(Math.min(2, table.capacity));
      setConflictError(null);
      setConfirmedBooking(null);
    }
  }, [table, initialDate, initialStartTime, closeMin]);

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const duration = endMin - startMin;

  useEffect(() => {
    if (!table || !isOpen || confirmedBooking) return;

    const openMin = timeToMinutes(settings?.openTime || '11:00');
    if (startMin < openMin) {
      setConflictError(`Restaurant is closed at ${startTime}. Operating hours start at ${settings?.openTime || '11:00'}.`);
      return;
    }

    if (duration < minBooking) {
      setConflictError(`Minimum booking duration is ${minBooking} minutes (currently ${duration} mins).`);
      return;
    }

    if (endMin > closeMin) {
      setConflictError(`Restaurant closes at ${settings?.closeTime || '23:00'}. Bookings must conclude by closing time.`);
      return;
    }

    let isMounted = true;
    fetch(apiUrl('/api/bookings/validate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: table.id,
        date,
        startTime,
        endTime
      })
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (!data.valid) {
          setConflictError(data.error);
        } else {
          setConflictError(null);
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [table, date, startTime, endTime, duration, minBooking, closeMin, isOpen, confirmedBooking, settings?.openTime, settings?.closeTime]);

  if (!isOpen || !table) return null;

  const possibleEndTimes = [];
  for (let m = startMin + minBooking; m <= closeMin; m += 15) {
    possibleEndTimes.push(minutesToTime(m));
  }

  const nextBooking = (table.activeBookings || []).find(b => timeToMinutes(b.startTime) > startMin);
  const maxCheckoutAllowed = nextBooking ? minutesToTime(timeToMinutes(nextBooking.startTime) - bufferMins) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (duration < minBooking) {
      setConflictError(`Please select a booking duration of at least ${minBooking} minutes.`);
      return;
    }

    setLoading(true);
    setConflictError(null);

    try {
      const response = await fetch(apiUrl('/api/bookings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: table.id,
          customerName,
          contact,
          email,
          guests: parseInt(guests, 10),
          date,
          startTime,
          endTime,
          specialRequests
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setConflictError(data.error || 'Failed to complete booking.');
        setLoading(false);
        return;
      }

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setConfirmedBooking(data.booking);
      if (onBookingSuccess) {
        onBookingSuccess(data.booking);
      }
    } catch (err) {
      setConflictError('Network error connecting to booking service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--modal-backdrop)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div 
        className="card animate-fade"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          position: 'relative',
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'var(--close-btn-bg)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        {/* Confirmation State */}
        {confirmedBooking ? (
          <div style={{ textAlign: 'center', padding: '10px 4px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--status-available-bg)',
              border: '2px solid var(--status-available)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--status-available)'
            }}>
              <CheckCircle size={30} />
            </div>

            <h2 style={{ fontSize: '1.45rem', color: 'var(--text-heading)', marginBottom: '6px' }}>
              Table Reserved!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Your reservation voucher is ready.
            </p>

            {/* Voucher Card */}
            <div style={{
              background: 'var(--voucher-bg)',
              border: '1px solid var(--border-gold)',
              borderRadius: '12px',
              padding: '18px',
              textAlign: 'left',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RESERVATION CODE</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-gold)' }}>
                    {confirmedBooking.bookingCode}
                  </div>
                </div>
                <span className="badge-available">Confirmed</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>TABLE</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{table.name} (#{table.tableNumber})</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>GUEST</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{confirmedBooking.customerName} ({confirmedBooking.guests} Pax)</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>DATE</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{confirmedBooking.date}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>TIME</div>
                  <div style={{ fontWeight: 600, color: 'var(--gold-text)' }}>
                    {confirmedBooking.startTime} - {confirmedBooking.endTime}
                  </div>
                </div>
              </div>

              <div className="alert-warning" style={{ marginTop: '14px', fontSize: '0.76rem' }}>
                Free cancellation permitted until 30 minutes before reservation.
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn-primary"
              style={{ width: '100%', padding: '11px' }}
            >
              Done & Return
            </button>
          </div>
        ) : (
          /* Booking Form */
          <div>
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary-gold)', fontWeight: 600 }}>
                RESERVE TABLE #{table.tableNumber}
              </div>
              <h2 style={{ fontSize: '1.3rem', color: 'var(--text-heading)', marginTop: '2px', fontWeight: 600 }}>
                {table.name}
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Section: {table.section} • Capacity: Up to {table.capacity} Guests
              </div>
            </div>

            {nextBooking && (
              <div className="alert-warning" style={{ marginBottom: '16px' }}>
                <strong>Table booked at {nextBooking.startTime}.</strong> Checkout allowed until <strong>{maxCheckoutAllowed}</strong> ({bufferMins}-min turnover buffer).
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    min={getLocalDateString(0)}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={startTime}
                    min={settings?.openTime || '11:00'}
                    max={settings?.closeTime || '23:00'}
                    step="900"
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartTime(newStart);
                      const sM = timeToMinutes(newStart);
                      setEndTime(minutesToTime(Math.min(closeMin, sM + Math.max(60, minBooking))));
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">End Time</label>
                  <select
                    className="form-select"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  >
                    {possibleEndTimes.map(t => (
                      <option key={t} value={t}>
                        {t} ({timeToMinutes(t) - startMin}m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Guests</label>
                  <input
                    type="number"
                    min="1"
                    max={table.capacity}
                    className="form-input"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Guest Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Phone Contact</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="guest@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">Special Requests (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Window side, Birthday"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                />
              </div>

              {conflictError && (
                <div className="alert-danger" style={{ marginBottom: '16px' }}>
                  {conflictError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !!conflictError}
                  className="btn-primary"
                  style={{ minWidth: '150px' }}
                >
                  {loading ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
