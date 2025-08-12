/**
 * Phone number utilities for formatting and validation
 */

/**
 * Format phone number as user types
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Don't format if empty
  if (!digits) return '';
  
  // Handle international numbers (starting with +)
  if (value.startsWith('+')) {
    if (digits.length <= 1) return '+';
    if (digits.length <= 4) return `+${digits.slice(1)}`;
    if (digits.length <= 7) return `+${digits.slice(1, 4)} ${digits.slice(4)}`;
    if (digits.length <= 10) return `+${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    return `+${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  }
  
  // Handle US numbers
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  
  // For longer numbers, assume international
  if (digits.length > 10) {
    return `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
  }
  
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

/**
 * Validate phone number format
 */
export const validatePhoneNumber = (value: string): { isValid: boolean; error?: string } => {
  if (!value || value.trim() === '') {
    return { isValid: true }; // Optional field
  }
  
  // Remove all non-digit characters for validation
  const digits = value.replace(/\D/g, '');
  
  // Check minimum and maximum length
  if (digits.length < 10) {
    return { 
      isValid: false, 
      error: 'Phone number must contain at least 10 digits' 
    };
  }
  
  if (digits.length > 15) {
    return { 
      isValid: false, 
      error: 'Phone number must contain no more than 15 digits' 
    };
  }
  
  // Check for valid format patterns
  const phonePatterns = [
    /^\+?[1-9]\d{9,14}$/, // International format
    /^\(\d{3}\)\s\d{3}-\d{4}$/, // US format: (123) 456-7890
    /^\+\d{1,4}\s\(\d{3}\)\s\d{3}-\d{4}$/, // International with US format
    /^\+\d{1,4}\s\d{2,4}\s\d{3,4}\s?\d{3,4}$/ // International spaced format
  ];
  
  const isValidFormat = phonePatterns.some(pattern => pattern.test(value));
  
  if (!isValidFormat) {
    return { 
      isValid: false, 
      error: 'Please enter a valid phone number format (e.g., +1 (555) 123-4567 or (555) 123-4567)' 
    };
  }
  
  return { isValid: true };
};

/**
 * Clean phone number for storage (remove formatting)
 */
export const cleanPhoneNumber = (value: string): string => {
  if (!value) return '';
  
  // Keep + for international numbers, remove everything else except digits
  if (value.startsWith('+')) {
    return '+' + value.replace(/[^\d]/g, '');
  }
  
  return value.replace(/\D/g, '');
};