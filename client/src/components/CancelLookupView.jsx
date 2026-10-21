import React, { useState } from 'react';
import { Search, Calendar, Clock, User, Phone, Users, CheckCircle, AlertTriangle, Lock, XCircle } from 'lucide-react';

export default function CancelLookupView() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelError, setCancelError] = useState(null);
  const [cancelSuccess, setCancelSuccess] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearchError(null);
    setCancelSuccess(null);
    setCancelError(null);

    try {
      const codeRes = await fetch(`/api/bookings/lookup/${encodeURIComponent(query.trim())}`);
      const codeData = await codeRes.json();

      if (codeRes.ok && codeData.success && codeData.booking) {
        setResults([codeData.booking]);
        setLoading(false);
        return;
      }

      const searchRes = await fetch(`/api/bookings?search=${encodeURIComponent(query.trim())}`);
      const searchData = await searchRes.json();

      if (searchRes.ok && searchData.success && searchData.bookings.length > 0) {
        setResults(searchData.bookings);
      } else {
        setResults([]);
        setSearchError('No reservations found matching that Reservation Code or Phone Number.');
      }
    } catch (err) {
      setSearchError('Error looking up reservation. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCancel = async () => {
    if (!cancelModalBooking) return;

    setCancellingId(cancelModalBooking.id);
    setCancelError(null);

    try {
      const res = await fetch(`/api/bookings/${cancelModalBooking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by customer via portal' })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setCancelError(data.error || 'Failed to cancel reservation.');
        setCancellingId(null);
        return;
      }

      setCancelSuccess(`Reservation ${data.booking.bookingCode} was successfully cancelled.`);
      setCancelModalBooking(null);
      setResults(prev => prev.map(b => b.id === data.booking.id ? { ...b, status: 'Cancelled', canCancel: false } : b));
    } catch (err) {
      setCancelError('Network error during cancellation.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-heading)', marginBottom: '6px' }}>
          Find Reservation
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Check your reservation details or cancel up to 30 minutes before your booked time.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              id="lookup-input"
              className="form-input"
              placeholder="Enter Reservation Code (e.g. RES-701) or Phone..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Search size={16} color="var(--primary-gold)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <button
            type="submit"
            id="lookup-search-btn"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '0 20px' }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {cancelSuccess && (
        <div className="alert-success" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          {cancelSuccess}
        </div>
      )}

      {searchError && (
        <div className="alert-danger" style={{ marginBottom: '20px', textAlign: 'center' }}>
          {searchError}
        </div>
      )}

      {/* Results List */}
      {results && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {results.map(booking => {
            const isCancelled = booking.status === 'Cancelled';
            const canCancel = booking.canCancel;

            return (
              <div 
                key={booking.id}
                className="card animate-fade"
                style={{
                  padding: '22px',
                  borderColor: isCancelled ? 'rgba(244, 63, 94, 0.25)' : 'var(--border-color)'
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '14px',
                  marginBottom: '16px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      RESERVATION CODE
                    </span>
                    <h3 style={{ fontSize: '1.35rem', color: 'var(--primary-gold)', fontWeight: 700 }}>
                      {booking.bookingCode}
                    </h3>
                  </div>

                  <span className={isCancelled ? 'badge-booked' : 'badge-available'}>
                    {booking.status}
                  </span>
                </div>

                {/* Details Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '14px',
                  marginBottom: '16px',
                  fontSize: '0.88rem'
                }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>TABLE</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>Table #{booking.tableNumber} - {booking.tableName}</div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>GUEST</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{booking.customerName} ({booking.guests} Guests)</div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>DATE</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{booking.date}</div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>TIME</div>
                    <div style={{ fontWeight: 600, color: 'var(--gold-text)' }}>
                      {booking.startTime} - {booking.endTime} ({booking.durationMinutes}m)
                    </div>
                  </div>
                </div>

                {/* Cancellation Policy Box & Button */}
                {!isCancelled && (
                  <div style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: canCancel ? 'rgba(245, 158, 11, 0.06)' : 'rgba(244, 63, 94, 0.06)',
                    border: `1px solid ${canCancel ? 'rgba(245, 158, 11, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: canCancel ? 'var(--gold-text)' : '#FDA4AF' }}>
                        {canCancel ? 'Eligible for Cancellation' : 'Cancellation Locked'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {canCancel 
                          ? 'Cancellations allowed up to 30 minutes before reservation start time.'
                          : (booking.cancellationReason || 'Cannot cancel within 30 minutes of reservation.')
                        }
                      </div>
                    </div>

                    <div>
                      {canCancel ? (
                        <button
                          id={`btn-cancel-booking-${booking.bookingCode}`}
                          onClick={() => setCancelModalBooking(booking)}
                          className="btn-danger"
                        >
                          Cancel Reservation
                        </button>
                      ) : (
                        <button
                          disabled
                          className="btn-danger"
                          style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        >
                          <Lock size={12} /> Cancellation Locked
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {cancelModalBooking && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--modal-backdrop)',
          backdropFilter: 'blur(8px)',
          zIndex: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '440px', padding: '24px', textAlign: 'center', background: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-heading)', marginBottom: '8px' }}>
              Confirm Cancellation
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '18px' }}>
              Are you sure you want to cancel reservation <strong>{cancelModalBooking.bookingCode}</strong> for Table #{cancelModalBooking.tableNumber}?
            </p>

            {cancelError && (
              <div className="alert-danger" style={{ marginBottom: '14px' }}>
                {cancelError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Keep
              </button>
              <button
                onClick={handleExecuteCancel}
                disabled={cancellingId === cancelModalBooking.id}
                className="btn-danger"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {cancellingId === cancelModalBooking.id ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
