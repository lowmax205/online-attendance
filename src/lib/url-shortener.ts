/**
 * Generate a short code for an event
 * Creates a 6-character alphanumeric code (uppercase letters and numbers only)
 * @param eventId - The event ID
 * @returns string A unique 6-character code
 */
export function generateEventCode(eventId: string): string {
  // Use a hash of the event ID to generate a consistent short code
  // This ensures the same event always gets the same code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar chars: I, O, 0, 1
  let hash = 0;

  for (let i = 0; i < eventId.length; i++) {
    const char = eventId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Generate 6-character code from hash
  let code = "";
  let workingHash = Math.abs(hash);

  for (let i = 0; i < 6; i++) {
    code += chars[workingHash % chars.length];
    workingHash = Math.floor(workingHash / chars.length);
  }

  return code;
}

/**
 * Format an event code for display (adds hyphen in the middle)
 * @param code - 6-character code
 * @returns string Formatted code like "ABC-123"
 */
export function formatEventCode(code: string): string {
  if (code.length !== 6) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/**
 * Clean and validate an event code entered by user
 * @param input - User input
 * @returns string Cleaned 6-character code in uppercase
 */
export function cleanEventCode(input: string): string {
  // Remove spaces, hyphens, and convert to uppercase
  return input.replace(/[\s-]/g, "").toUpperCase().slice(0, 6);
}
