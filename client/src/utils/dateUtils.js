/**
 * Returns a YYYY-MM-DD formatted date string in the user's LOCAL timezone.
 * Avoids UTC timezone shift bugs caused by Date.prototype.toISOString().
 */
export function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format "HH:mm" (24h) to "h:mm AM/PM" (12h) e.g., "10:00" -> "10:00 AM", "20:00" -> "8:00 PM"
 */
export function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
}

