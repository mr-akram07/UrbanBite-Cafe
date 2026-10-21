import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import BookingFlow from './components/BookingFlow';
import WaitlistView from './components/WaitlistView';
import CancelLookupView from './components/CancelLookupView';
import OwnerDashboard from './components/OwnerDashboard';
import { useSettings } from './context/SettingsContext';
import { formatTime12 } from './utils/dateUtils';

export default function App() {
  const { settings } = useSettings();

  const openDisplay = settings?.openTime ? formatTime12(settings.openTime) : '11:00 AM';
  const closeDisplay = settings?.closeTime ? formatTime12(settings.closeTime) : '11:00 PM';
  const bufferDisplay = settings?.turnoverBufferMinutes !== undefined ? settings.turnoverBufferMinutes : 30;
  const cutoffDisplay = settings?.cancellationCutoffMinutes !== undefined ? settings.cancellationCutoffMinutes : 30;
  const restaurantTitle = settings?.restaurantName || 'UrbanBite Cafe';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Main Navigation Bar */}
      <Navbar />

      {/* Main Routed Content Area */}
      <main style={{ flex: 1, padding: '24px 20px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Routes>
            {/* Table Booking Route (Home) */}
            <Route 
              path="/" 
              element={
                <>
                  <HeroBanner />
                  <BookingFlow />
                </>
              } 
            />
            <Route path="/book" element={<Navigate to="/" replace />} />

            {/* Waitlist Route */}
            <Route path="/waitlist" element={<WaitlistView />} />

            {/* My Booking & Cancellation Route */}
            <Route path="/my-booking" element={<CancelLookupView />} />
            <Route path="/lookup" element={<Navigate to="/my-booking" replace />} />

            {/* Owner Management Route */}
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/admin" element={<Navigate to="/owner" replace />} />

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      {/* Simple Clean Dynamic Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        background: 'var(--footer-bg)',
        padding: '24px 20px',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <strong style={{ color: 'var(--text-heading)' }}>{restaurantTitle}</strong> • Service Hours: {openDisplay} – {closeDisplay}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Table turnover buffer: {bufferDisplay} mins • Free cancellation up to {cutoffDisplay} mins before reservation
          </div>
        </div>
      </footer>
    </div>
  );
}
