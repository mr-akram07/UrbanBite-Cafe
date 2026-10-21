import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Calendar, Clock, User, Phone, Users, CheckCircle, 
  XCircle, RefreshCw, Filter, Search, AlertTriangle, Lock, LogOut, BellRing, Settings, PlusCircle, Trash2, Edit2, Store, KeyRound, X
} from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';
import { useSettings } from '../context/SettingsContext';
import { apiUrl } from '../utils/api';

export default function OwnerDashboard() {
  const todayStr = getLocalDateString(0);
  const { settings: globalSettings, updateLocalSettings } = useSettings();

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('aura_owner_auth') === 'true';
  });
  const [activeAdminUser, setActiveAdminUser] = useState(() => {
    return sessionStorage.getItem('aura_owner_username') || 'admin';
  });
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Change Credentials Modal State
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credsError, setCredsError] = useState(null);
  const [credsSuccess, setCredsSuccess] = useState(null);
  const [savingCreds, setSavingCreds] = useState(false);

  // Delete Booking Modal State
  const [deleteModalBooking, setDeleteModalBooking] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [clearingCancelled, setClearingCancelled] = useState(false);

  // Filters & Data
  const [date, setDate] = useState(todayStr);
  const [tableFilter, setTableFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [bookings, setBookings] = useState([]);
  const [tables, setTables] = useState([]);
  const [stats, setStats] = useState({
    totalTables: 5,
    todayTotalBookings: 0,
    todayConfirmed: 0,
    todaySeated: 0,
    todayCancelled: 0,
    activeWaitlist: 0
  });

  const [waitlist, setWaitlist] = useState([]);
  const [activeTab, setActiveTab] = useState('reservations'); // 'reservations' | 'waitlist' | 'settings'
  const [loading, setLoading] = useState(false);

  // Settings State
  const [settings, setSettings] = useState(globalSettings || {
    restaurantName: 'UrbanBite Cafe',
    openTime: '11:00',
    closeTime: '23:00',
    turnoverBufferMinutes: 30,
    minBookingMinutes: 30,
    cancellationCutoffMinutes: 30,
    address: 'The Pavilion Terrace, Boulevard 4',
    phone: '+91 98765 43210'
  });

  useEffect(() => {
    if (globalSettings) {
      setSettings(globalSettings);
    }
  }, [globalSettings]);
  const [savingSettings, setSavingSettings] = useState(false);

  // New Table Modal / Form State
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableSection, setNewTableSection] = useState('Main Dining Hall');
  const [newTableFeatures, setNewTableFeatures] = useState('Ambient Lighting, Comfortable Seating');

  // Cancellation modal state
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [isOwnerOverride, setIsOwnerOverride] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginId.trim(),
          password: loginPassword.trim()
        })
      });

      let data = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = null;
      }

      if (!res.ok || !data || !data.success) {
        setLoginError((data && data.error) || (res.status === 401 ? 'Invalid ID or Password.' : `Server error (${res.status}). Please check backend.`));
        setLoggingIn(false);
        return;
      }

      sessionStorage.setItem('aura_owner_auth', 'true');
      const authenticatedUser = data.username || loginId.trim();
      sessionStorage.setItem('aura_owner_username', authenticatedUser);
      setActiveAdminUser(authenticatedUser);
      setIsAuthenticated(true);
      setLoggingIn(false);
    } catch (err) {
      setLoginError('Error connecting to backend service. Please verify server is awake.');
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('aura_owner_auth');
    sessionStorage.removeItem('aura_owner_username');
    setIsAuthenticated(false);
    setLoginId('');
    setLoginPassword('');
  };

  // Change Admin ID & Password
  const handleChangeCredentials = async (e) => {
    e.preventDefault();
    setCredsError(null);
    setCredsSuccess(null);

    if (newPassword && newPassword !== confirmPassword) {
      setCredsError('New passwords do not match. Please re-enter.');
      return;
    }

    if (!newUsername.trim() && !newPassword.trim()) {
      setCredsError('Please provide a new Owner ID or a new Password to update.');
      return;
    }

    setSavingCreds(true);
    try {
      const res = await fetch(apiUrl('/api/admin/change-credentials'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUsername: activeAdminUser,
          currentPassword: currentPassword.trim(),
          newUsername: newUsername.trim() || undefined,
          newPassword: newPassword.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCredsError(data.error || 'Failed to update credentials.');
        setSavingCreds(false);
        return;
      }

      setCredsSuccess('Admin credentials successfully updated in MongoDB!');
      if (data.username) {
        setActiveAdminUser(data.username);
        sessionStorage.setItem('aura_owner_username', data.username);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setCredsSuccess(null);
        setShowCredsModal(false);
      }, 2000);
    } catch (err) {
      setCredsError('Network error while updating credentials.');
    } finally {
      setSavingCreds(false);
    }
  };

  // Fetch all dashboard data
  const fetchData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [bookingsRes, statsRes, waitlistRes, tablesRes, settingsRes] = await Promise.all([
        fetch(apiUrl(`/api/bookings?date=${date}&search=${encodeURIComponent(searchTerm)}`)),
        fetch(apiUrl('/api/admin/stats')),
        fetch(apiUrl(`/api/waitlist?date=${date}`)),
        fetch(apiUrl('/api/tables')),
        fetch(apiUrl('/api/settings'))
      ]);

      const bookingsData = await bookingsRes.json();
      const statsData = await statsRes.json();
      const waitlistData = await waitlistRes.json();
      const tablesData = await tablesRes.json();
      const settingsData = await settingsRes.json();

      if (bookingsData.success) setBookings(bookingsData.bookings);
      if (statsData.success) setStats(statsData.stats);
      if (waitlistData.success) setWaitlist(waitlistData.waitlist);
      if (tablesData.success) setTables(tablesData.tables || []);
      if (settingsData.success && settingsData.settings) setSettings(settingsData.settings);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, date, searchTerm]);

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(apiUrl('/api/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('Restaurant operating hours and settings saved successfully!');
        setSettings(data.settings);
        updateLocalSettings(data.settings);
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Add Table
  const handleAddTable = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl('/api/tables'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTableName,
          capacity: newTableCapacity,
          section: newTableSection,
          features: newTableFeatures
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        setShowAddTableModal(false);
        setNewTableName('');
        fetchData();
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        alert(data.error || 'Failed to add table');
      }
    } catch (err) {
      alert('Error adding table.');
    }
  };

  // Toggle Table Active/Inactive Status
  const handleToggleTableStatus = async (table) => {
    const newStatus = table.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(apiUrl(`/api/tables/${table.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Table #${table.tableNumber} set to ${newStatus}`);
        fetchData();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      alert('Failed to update table status');
    }
  };

  // Delete Table
  const handleDeleteTable = async (tableId, tableNumber) => {
    if (!window.confirm(`Are you sure you want to remove Table #${tableNumber}?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/tables/${tableId}`), {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Table #${tableNumber} removed.`);
        fetchData();
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        alert(data.error || 'Could not delete table');
      }
    } catch (err) {
      alert('Error deleting table.');
    }
  };

  // Update booking status
  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Status updated to ${newStatus}`);
        fetchData();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Owner Cancel
  const handleOwnerCancel = async () => {
    if (!cancelModalBooking) return;
    try {
      const res = await fetch(apiUrl(`/api/bookings/${cancelModalBooking.id}/cancel`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isOwnerOverride,
          reason: cancelReason || (isOwnerOverride ? 'Emergency Manager Cancellation' : 'Cancelled by Restaurant')
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to cancel reservation');
        return;
      }

      setActionMessage(`Booking ${cancelModalBooking.bookingCode} cancelled.`);
      setCancelModalBooking(null);
      setCancelReason('');
      setIsOwnerOverride(false);
      fetchData();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      alert('Error cancelling booking.');
    }
  };

  // Permanently Delete Booking
  const handleExecuteDelete = async () => {
    if (!deleteModalBooking) return;
    setDeletingId(deleteModalBooking.id);

    try {
      const res = await fetch(apiUrl(`/api/bookings/${deleteModalBooking.id}`), {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to delete reservation.');
        setDeletingId(null);
        return;
      }

      setActionMessage(`Reservation ${deleteModalBooking.bookingCode} permanently deleted from database.`);
      setDeleteModalBooking(null);
      fetchData();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      alert('Error deleting reservation. Please check your connection.');
    } finally {
      setDeletingId(null);
    }
  };

  // Clear all cancelled bookings for current filter
  const handleClearAllCancelled = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete all ${cancelledCount} cancelled reservations?`)) return;
    setClearingCancelled(true);
    try {
      const res = await fetch(apiUrl('/api/bookings/clear-cancelled'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || 'Cancelled reservations cleared.');
        fetchData();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      alert('Error clearing cancelled reservations.');
    } finally {
      setClearingCancelled(false);
    }
  };

  // Waitlist Status
  const handleWaitlistStatus = async (id, status) => {
    try {
      await fetch(apiUrl(`/api/waitlist/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter bookings
  const filteredBookings = bookings.filter(b => {
    if (tableFilter !== 'all' && b.tableId !== tableFilter) return false;
    if (statusFilter !== 'all' && b.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    return true;
  });

  const cancelledCount = filteredBookings.filter(b => b.status === 'Cancelled').length;

  // If not authenticated, show ID & Password login screen
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '380px', margin: '48px auto' }}>
        <div className="card animate-fade" style={{ padding: '32px 28px', textAlign: 'center', background: 'var(--bg-surface)' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#60A5FA'
          }}>
            <Lock size={20} />
          </div>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-heading)', marginBottom: '6px' }}>
            Owner Login
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '22px' }}>
            Enter credentials to access manager operations.
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px', textAlign: 'left' }}>
              <label className="form-label">Owner ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="admin"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '18px', textAlign: 'left' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
              />
            </div>

            {loginError && (
              <div className="alert-danger" style={{ marginBottom: '16px' }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '0.9rem' }}
            >
              {loggingIn ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Owner Dashboard
  return (
    <div>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-heading)' }}>
            Owner Dashboard
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Operating hours: <span style={{ color: 'var(--gold-text)' }}>{settings.openTime} – {settings.closeTime}</span> • Buffer: <span style={{ color: 'var(--gold-text)' }}>{settings.turnoverBufferMinutes}m</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setShowCredsModal(true);
              setCredsError(null);
              setCredsSuccess(null);
              setCurrentPassword('');
              setNewUsername(activeAdminUser);
              setNewPassword('');
              setConfirmPassword('');
            }}
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.82rem', borderColor: 'var(--border-gold)', color: 'var(--gold-text)' }}
          >
            <KeyRound size={14} />
            Change ID / Password
          </button>

          <button
            onClick={fetchData}
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.82rem', color: '#FDA4AF', borderColor: 'rgba(244, 63, 94, 0.3)' }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="alert-success" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          {actionMessage}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Tables
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '2px' }}>
            {tables.length || stats.totalTables}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Today's Bookings
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary-gold)', marginTop: '2px' }}>
            {stats.todayTotalBookings}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Active Bookings
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-available)', marginTop: '2px' }}>
            {stats.todayConfirmed}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Waitlist
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#60A5FA', marginTop: '2px' }}>
            {stats.activeWaitlist}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Cancelled
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-booked)', marginTop: '2px' }}>
            {stats.todayCancelled}
          </div>
        </div>
      </div>

      {/* Tabs: Reservations vs Waitlist vs Settings */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '10px',
        marginBottom: '18px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('reservations')}
          style={{
            background: activeTab === 'reservations' ? 'var(--gold-gradient)' : 'var(--btn-secondary-bg)',
            color: activeTab === 'reservations' ? '#0A0D14' : 'var(--text-secondary)',
            border: 'none',
            padding: '7px 16px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          Bookings ({filteredBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('waitlist')}
          style={{
            background: activeTab === 'waitlist' ? 'var(--gold-gradient)' : 'var(--btn-secondary-bg)',
            color: activeTab === 'waitlist' ? '#0A0D14' : 'var(--text-secondary)',
            border: 'none',
            padding: '7px 16px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          Waitlist ({waitlist.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            background: activeTab === 'settings' ? 'var(--gold-gradient)' : 'var(--btn-secondary-bg)',
            color: activeTab === 'settings' ? '#0A0D14' : 'var(--text-secondary)',
            border: 'none',
            padding: '7px 16px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Settings size={14} />
          Settings & Tables
        </button>
      </div>

      {/* TAB 1: RESERVATIONS */}
      {activeTab === 'reservations' && (
        <div>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '16px', marginBottom: '18px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
              alignItems: 'center'
            }}>
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Table</label>
                <select
                  className="form-select"
                  value={tableFilter}
                  onChange={e => setTableFilter(e.target.value)}
                >
                  <option value="all">All Tables</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      Table #{t.tableNumber} - {t.name} ({t.capacity} Pax)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="form-label">Search</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Name, phone, code..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {cancelledCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                  <button
                    onClick={handleClearAllCancelled}
                    disabled={clearingCancelled}
                    className="btn-danger"
                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    title="Permanently remove all cancelled records"
                  >
                    <Trash2 size={13} />
                    {clearingCancelled ? 'Clearing...' : `Clear All Cancelled (${cancelledCount})`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bookings Table */}
          <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
            {filteredBookings.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No reservations found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: 'var(--btn-secondary-bg)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Code</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Customer Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Guests</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contact</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Table</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Timing</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => {
                    const isCancelled = b.status === 'Cancelled';

                    return (
                      <tr 
                        key={b.id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          background: isCancelled ? 'rgba(244, 63, 94, 0.02)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary-gold)' }}>
                          {b.bookingCode}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{b.customerName}</div>
                          {b.specialRequests && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {b.specialRequests}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                          {b.guests} Pax
                        </td>

                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {b.contact}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          Table #{b.tableNumber}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ color: 'var(--gold-text)', fontWeight: 500 }}>
                            {b.startTime} - {b.endTime}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {b.durationMinutes}m
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span className={b.status === 'Confirmed' ? 'badge-available' : 'badge-booked'}>
                            {b.status}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {!isCancelled ? (
                              <>
                                <button
                                  onClick={() => {
                                    setCancelModalBooking(b);
                                    setIsOwnerOverride(true);
                                  }}
                                  className="btn-secondary"
                                  style={{ padding: '5px 10px', fontSize: '0.78rem', color: '#FDA4AF', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => setDeleteModalBooking(b)}
                                  className="btn-danger"
                                  style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                                  title="Permanently Delete Booking Record"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            ) : (
                              <button
                                id={`btn-delete-booking-${b.bookingCode}`}
                                onClick={() => setDeleteModalBooking(b)}
                                className="btn-danger"
                                style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                title="Permanently Delete Booking Record"
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WAITLIST */}
      {activeTab === 'waitlist' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-heading)', marginBottom: '16px' }}>
            Waitlist Parties
          </h3>

          {waitlist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
              No parties in the waitlist.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {waitlist.map((w, idx) => (
                <div
                  key={w.id}
                  style={{
                    background: 'var(--btn-secondary-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--primary-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.82rem'
                    }}>
                      #{idx + 1}
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                        {w.customerName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {w.guests} Guests • {w.contact}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge-buffer">
                      {w.status}
                    </span>

                    {w.status === 'Waiting' && (
                      <button
                        onClick={() => handleWaitlistStatus(w.id, 'Notified')}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Notify
                      </button>
                    )}

                    {w.status !== 'Seated' && (
                      <button
                        onClick={() => handleWaitlistStatus(w.id, 'Seated')}
                        className="btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        Seat
                      </button>
                    )}

                    <button
                      onClick={() => handleWaitlistStatus(w.id, 'Cancelled')}
                      className="btn-danger"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS & TABLE MANAGEMENT */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Operating Hours & Rules Form */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-heading)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--primary-gold)" />
              Restaurant Operating Hours & Booking Rules
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Bookings will strictly not be allowed before opening or after closing time.
            </p>

            <form onSubmit={handleSaveSettings}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label className="form-label">Shop Opening Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={settings.openTime}
                    onChange={e => setSettings({ ...settings, openTime: e.target.value })}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    First allowed booking time
                  </div>
                </div>

                <div>
                  <label className="form-label">Shop Closing Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={settings.closeTime}
                    onChange={e => setSettings({ ...settings, closeTime: e.target.value })}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    All reservations must conclude by this time
                  </div>
                </div>

                <div>
                  <label className="form-label">Turnover Cleaning Buffer (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    step="5"
                    className="form-input"
                    value={settings.turnoverBufferMinutes}
                    onChange={e => setSettings({ ...settings, turnoverBufferMinutes: parseInt(e.target.value, 10) || 0 })}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Buffer required before next booking
                  </div>
                </div>

                <div>
                  <label className="form-label">Min Booking Duration (Mins)</label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    step="15"
                    className="form-input"
                    value={settings.minBookingMinutes}
                    onChange={e => setSettings({ ...settings, minBookingMinutes: parseInt(e.target.value, 10) || 30 })}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Minimum reservation length allowed
                  </div>
                </div>

                <div>
                  <label className="form-label">Cancellation Cutoff Window (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="240"
                    step="5"
                    className="form-input"
                    value={settings.cancellationCutoffMinutes}
                    onChange={e => setSettings({ ...settings, cancellationCutoffMinutes: parseInt(e.target.value, 10) || 0 })}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Free cancellation allowed until X mins prior
                  </div>
                </div>

                <div>
                  <label className="form-label">Restaurant Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.restaurantName}
                    onChange={e => setSettings({ ...settings, restaurantName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn-primary"
                  style={{ minWidth: '160px' }}
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Table Management */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-heading)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Store size={18} color="var(--primary-gold)" />
                  Restaurant Table Management ({tables.length} Tables)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Add tables, modify capacities, or toggle maintenance mode.
                </p>
              </div>

              <button
                onClick={() => setShowAddTableModal(true)}
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '7px 14px' }}
              >
                <PlusCircle size={15} /> Add Table
              </button>
            </div>

            {/* Tables List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {tables.map(table => (
                <div
                  key={table.id}
                  style={{
                    background: 'var(--btn-secondary-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary-gold)', fontWeight: 600 }}>
                        TABLE #{table.tableNumber}
                      </span>
                      <span className={table.status === 'Active' ? 'badge-available' : 'badge-booked'}>
                        {table.status}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', color: 'var(--text-heading)', marginTop: '4px' }}>
                      {table.name}
                    </h4>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Capacity: <strong>{table.capacity} Pax</strong> • {table.section}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    <button
                      onClick={() => handleToggleTableStatus(table)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '5px 10px', fontSize: '0.75rem' }}
                    >
                      {table.status === 'Active' ? 'Set Maintenance' : 'Set Active'}
                    </button>

                    <button
                      onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                      className="btn-danger"
                      style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                      title="Delete Table"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Credentials & Security Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-heading)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} color="var(--primary-gold)" />
                  Admin ID & Password Management
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Current Owner ID: <strong style={{ color: 'var(--gold-text)' }}>{activeAdminUser}</strong>. Update your login credentials stored in MongoDB.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCredsModal(true);
                  setCredsError(null);
                  setCredsSuccess(null);
                  setCurrentPassword('');
                  setNewUsername(activeAdminUser);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '8px 16px' }}
              >
                <KeyRound size={15} />
                Change Admin Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--modal-backdrop)',
          backdropFilter: 'blur(8px)',
          zIndex: 130,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-heading)', marginBottom: '6px' }}>
              Add New Dining Table
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '16px' }}>
              Add a new table to your floor plan.
            </p>

            <form onSubmit={handleAddTable}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Table Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Garden Pavilion 6"
                  value={newTableName}
                  onChange={e => setNewTableName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Max Guests (Pax)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="form-input"
                    value={newTableCapacity}
                    onChange={e => setNewTableCapacity(parseInt(e.target.value, 10) || 2)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Section</label>
                  <select
                    className="form-select"
                    value={newTableSection}
                    onChange={e => setNewTableSection(e.target.value)}
                  >
                    <option value="Main Dining Hall">Main Dining Hall</option>
                    <option value="Window View">Window View</option>
                    <option value="Terrace & Veranda">Terrace & Veranda</option>
                    <option value="Center Court">Center Court</option>
                    <option value="Private Alcove">Private Alcove</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">Features / Ambiance</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Window View, Candlelight, Sofa"
                  value={newTableFeatures}
                  onChange={e => setNewTableFeatures(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddTableModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
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
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-heading)', marginBottom: '6px' }}>
              Cancel Reservation {cancelModalBooking.bookingCode}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '14px' }}>
              {cancelModalBooking.customerName} ({cancelModalBooking.guests} Pax) • Table #{cancelModalBooking.tableNumber}
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Reason</label>
              <input
                type="text"
                className="form-input"
                placeholder="Reason for cancellation"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="btn-secondary"
              >
                Back
              </button>
              <button
                onClick={handleOwnerCancel}
                className="btn-danger"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Admin ID & Password Modal */}
      {showCredsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--modal-backdrop)',
          backdropFilter: 'blur(8px)',
          zIndex: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '440px', padding: '26px', background: 'var(--bg-surface)', position: 'relative' }}>
            <button
              onClick={() => setShowCredsModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--close-btn-bg)',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={15} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--primary-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <KeyRound size={18} />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-heading)', margin: 0 }}>
                Change Admin Credentials
              </h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '18px' }}>
              Update your Owner ID and Password stored in the database.
            </p>

            {credsSuccess && (
              <div className="alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} />
                {credsSuccess}
              </div>
            )}

            {credsError && (
              <div className="alert-danger" style={{ marginBottom: '16px' }}>
                {credsError}
              </div>
            )}

            <form onSubmit={handleChangeCredentials}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Current Password (Required)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">New Owner ID / Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. manager, admin"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Leave as is if you only want to change the password
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter new password (min 4 chars)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCredsModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCreds}
                  className="btn-primary"
                >
                  {savingCreds ? 'Saving...' : 'Update Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalBooking && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--modal-backdrop)',
          backdropFilter: 'blur(8px)',
          zIndex: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '420px', padding: '24px', textAlign: 'center', background: 'var(--bg-surface)' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.12)',
              color: '#F43F5E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px'
            }}>
              <Trash2 size={22} />
            </div>

            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-heading)', marginBottom: '8px' }}>
              Delete Reservation?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.5 }}>
              Permanently delete reservation <strong style={{ color: 'var(--primary-gold)' }}>{deleteModalBooking.bookingCode}</strong> for <strong>{deleteModalBooking.customerName}</strong> from the database? This cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteModalBooking(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Keep Record
              </button>
              <button
                id="confirm-delete-booking-btn"
                onClick={handleExecuteDelete}
                disabled={deletingId === deleteModalBooking.id}
                className="btn-danger"
                style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={13} />
                {deletingId === deleteModalBooking.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
