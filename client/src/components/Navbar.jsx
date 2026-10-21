import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Utensils, CalendarCheck, Clock, Users, Search, Lock, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const [time, setTime] = useState(new Date());
  const location = useLocation();
  const currentPath = location.pathname;
  const { theme, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isActive = (path) => {
    if (path === '/' && (currentPath === '/' || currentPath === '/book')) return true;
    return currentPath === path;
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--navbar-bg)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      transition: 'all 0.2s ease'
    }}>
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand */}
        <Link 
          to="/"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'var(--gold-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0A0D14',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
          }}>
            <Utensils size={18} strokeWidth={2.5} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: 'var(--text-heading)'
            }}>
              UrbanBite
            </span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: 'var(--gold-text)',
              background: 'var(--gold-badge-bg)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid var(--gold-badge-border)',
              letterSpacing: '0.05em'
            }}>
              CAFE
            </span>
          </div>
        </Link>

        {/* Right Section: Nav Links + Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Navigation Routes */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--nav-btn-bg)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}>
            <Link
              id="nav-link-book"
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.84rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                background: isActive('/') ? 'var(--gold-gradient)' : 'transparent',
                color: isActive('/') ? '#0A0D14' : 'var(--text-secondary)'
              }}
            >
              <CalendarCheck size={14} />
              Book Table
            </Link>

            <Link
              id="nav-link-waitlist"
              to="/waitlist"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.84rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                background: isActive('/waitlist') ? 'var(--gold-gradient)' : 'transparent',
                color: isActive('/waitlist') ? '#0A0D14' : 'var(--text-secondary)'
              }}
            >
              <Users size={14} />
              Waitlist
            </Link>

            <Link
              id="nav-link-lookup"
              to="/my-booking"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.84rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                background: isActive('/my-booking') ? 'var(--gold-gradient)' : 'transparent',
                color: isActive('/my-booking') ? '#0A0D14' : 'var(--text-secondary)'
              }}
            >
              <Search size={14} />
              My Booking
            </Link>

            <Link
              id="nav-link-owner"
              to="/owner"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.84rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                background: isActive('/owner') ? '#3B82F6' : 'transparent',
                color: isActive('/owner') ? '#FFFFFF' : (isDark ? '#93C5FD' : '#2563EB')
              }}
            >
              <Lock size={13} />
              Owner Portal
            </Link>
          </nav>

          {/* Theme Toggle Button */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun size={17} style={{ color: '#FBBF24' }} />
            ) : (
              <Moon size={17} style={{ color: '#475569' }} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
