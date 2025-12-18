// Utility functions

/**
 * Generates a Google Meet style meeting code
 * Format: XXX-XXXX-XXX
 * Uses uppercase letters and numbers only for easy verbal communication
 */
export function generateMeetingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [3, 4, 3]; // Format: XXX-XXXX-XXX
  
  return segments
    .map(length => {
      return Array.from({ length }, () => 
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
    })
    .join('-');
}

/**
 * Validates and formats a room code to XXX-XXXX-XXX format
 * Accepts alphanumeric input (A-Z, 0-9) and formats it correctly
 * Returns null if invalid
 */
export function validateAndFormatRoomCode(code: string): string | null {
  // Remove spaces and hyphens, convert to uppercase
  const cleaned = code.replace(/[\s-]/g, '').toUpperCase();

  // Check if it's 10 alphanumeric characters
  if (!/^[A-Z0-9]{10}$/.test(cleaned)) {
    return null;
  }

  // Format: XXX-XXXX-XXX
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 10)}`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function cn(...classes:  (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
