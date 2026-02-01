/**
 * Format phone number for display (e.g., "09123456789" -> "0912 345 6789")
 */
export function formatPhoneNumberForDisplay(value: string): string {
  const cleaned = value.replace(/\D/g, "");

  if (cleaned.length <= 4) {
    return cleaned;
  }
  if (cleaned.length <= 7) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`;
}

/**
 * Remove all non-digit characters from phone number for storage
 */
export function formatPhoneNumberForStorage(value: string): string {
  return value.replace(/\D/g, "");
}
