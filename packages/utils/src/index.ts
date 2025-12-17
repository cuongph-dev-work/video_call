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
