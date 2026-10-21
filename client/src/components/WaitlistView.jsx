import React, { useState, useEffect } from 'react';
import { Users, Clock, Phone, User, CheckCircle, AlertCircle, PlusCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiUrl } from '../utils/api';

export default function WaitlistView() {
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [guests, setGuests] = useState(2);
  const [preferredTime, setPreferredTime] = useState('Immediate Walk-in');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchWaitlist = () => {
    setLoading(true);
    fetch(apiUrl('/api/waitlist'))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWaitlist(data.waitlist);
        }
      })
      .catch(err => console.error('Error fetching waitlist:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(apiUrl('/api/waitlist'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          contact,
          guests: parseInt(guests, 10),
          preferredTime,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to join waitlist.');
        setSubmitting(false);
        return;
      }

      confetti({ particleCount: 50, spread: 60 });
      setSuccessMessage(`Added to waitlist! Queue position: #${data.queuePosition}`);
      setCustomerName('');
      setContact('');
      setNotes('');
      fetchWaitlist();
    } catch (err) {
      setErrorMessage('Network error joining waitlist.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeWaitingList = waitlist.filter(w => w.status === 'Waiting');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-heading)', marginBottom: '6px' }}>
          Restaurant Waitlist
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Join the priority queue when all tables are occupied.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
        {/* Form Panel */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-heading)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} color="var(--primary-gold)" />
            Join Waitlist
          </h3>

          {successMessage && (
            <div className="alert-success" style={{ marginBottom: '16px' }}>
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="alert-danger" style={{ marginBottom: '16px' }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleJoin}>
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Aman Verma"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label className="form-label">Contact Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 99887 76655"
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Guests</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="form-input"
                  value={guests}
                  onChange={e => setGuests(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Preference</label>
              <select
                className="form-select"
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
              >
                <option value="Immediate Walk-in">Immediate / Next Available Table</option>
                <option value="Within 30 mins">Within next 30 minutes</option>
                <option value="Within 1 hour">Within next 1 hour</option>
                <option value="Window View preferred">Window View Preferred</option>
                <option value="Booth preferred">Cozy Booth Preferred</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Notes (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Occasion or seating request"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: '100%', padding: '11px' }}
            >
              {submitting ? 'Adding...' : 'Confirm Waitlist Spot'}
            </button>
          </form>
        </div>

        {/* Live Queue Display */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-heading)' }}>Current Queue</h3>
            <span className="badge-buffer">
              {activeWaitingList.length} Waiting
            </span>
          </div>

          {activeWaitingList.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 16px',
              color: 'var(--text-muted)',
              background: 'var(--btn-secondary-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-color)'
            }}>
              <CheckCircle size={28} color="var(--status-available)" style={{ margin: '0 auto 8px' }} />
              <div style={{ color: 'var(--text-heading)', fontWeight: 600, fontSize: '0.95rem' }}>No Queue Currently</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                Tables are available immediately.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeWaitingList.map((entry, idx) => (
                <div
                  key={entry.id}
                  style={{
                    background: 'var(--btn-secondary-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: idx === 0 ? 'var(--gold-gradient)' : 'var(--bg-surface-hover)',
                      color: idx === 0 ? '#0A0D14' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      #{idx + 1}
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                        {entry.customerName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Party of {entry.guests} • {entry.preferredTime}
                      </div>
                    </div>
                  </div>

                  <span className="badge-buffer" style={{ fontSize: '0.72rem' }}>
                    Waiting
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
