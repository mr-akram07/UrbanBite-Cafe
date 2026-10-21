import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { Sparkles, Clock, ShieldCheck } from 'lucide-react';

export default function HeroBanner() {
  const { settings } = useSettings();
  const { isDark } = useTheme();
  const buffer = settings?.turnoverBufferMinutes !== undefined ? settings.turnoverBufferMinutes : 30;

  return (
    <div style={{
      position: 'relative',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
      marginBottom: '24px',
      minHeight: '175px',
      display: 'flex',
      alignItems: 'center',
      background: 'var(--bg-surface)',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.25s ease'
    }}>
      {/* Background Hero Image */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(/restaurant_hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 45%',
        filter: isDark 
          ? 'brightness(0.35) saturate(1.15)' 
          : 'brightness(1.02) saturate(1.15)',
        opacity: isDark ? 1 : 0.75,
        transition: 'all 0.25s ease'
      }} />

      {/* Adaptive Theme Gradient Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: isDark
          ? 'linear-gradient(90deg, rgba(9, 13, 22, 0.95) 0%, rgba(9, 13, 22, 0.78) 52%, rgba(9, 13, 22, 0.28) 100%)'
          : 'linear-gradient(90deg, rgba(255, 255, 255, 0.97) 0%, rgba(255, 255, 255, 0.88) 50%, rgba(255, 255, 255, 0.35) 100%)',
        transition: 'all 0.25s ease'
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        padding: '28px 32px',
        maxWidth: '640px'
      }}>
        {/* Experience Tag */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'var(--gold-text)',
          background: 'var(--gold-badge-bg)',
          border: '1px solid var(--gold-badge-border)',
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '10px'
        }}>
          <Sparkles size={12} color="var(--primary-gold)" />
          <span>Curated Dining Experience</span>
        </div>

        <h1 style={{
          fontSize: '1.85rem',
          fontWeight: 700,
          color: 'var(--text-heading)',
          marginBottom: '8px',
          lineHeight: 1.2
        }}>
          Table Reservation
        </h1>

        <p style={{
          fontSize: '0.92rem',
          color: 'var(--text-secondary)',
          margin: 0,
          lineHeight: 1.55
        }}>
          Select your date and preferred seating time. Built-in <strong>{buffer}-minute turnover buffer</strong> guarantees your table is thoroughly sanitized and ready for your arrival.
        </p>
      </div>
    </div>
  );
}
