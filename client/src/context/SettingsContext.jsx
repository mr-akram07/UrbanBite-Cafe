import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';

const SettingsContext = createContext({
  settings: {
    restaurantName: 'UrbanBite Cafe',
    openTime: '11:00',
    closeTime: '23:00',
    turnoverBufferMinutes: 30,
    minBookingMinutes: 30,
    cancellationCutoffMinutes: 30,
    address: 'The Pavilion Terrace, Boulevard 4',
    phone: '+91 98765 43210'
  },
  refreshSettings: () => {},
  updateLocalSettings: () => {}
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    restaurantName: 'UrbanBite Cafe',
    openTime: '11:00',
    closeTime: '23:00',
    turnoverBufferMinutes: 30,
    minBookingMinutes: 30,
    cancellationCutoffMinutes: 30,
    address: 'The Pavilion Terrace, Boulevard 4',
    phone: '+91 98765 43210'
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/settings'));
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateLocalSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings: fetchSettings, updateLocalSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
