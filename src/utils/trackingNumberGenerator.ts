/**
 * Tracking Number Generator
 * 
 * Utility to generate unique tracking numbers for shipments
 */

/**
 * Generate a random numeric string of specified length
 */
export function generateTrackingNumber(length: number = 10): string {
  // Define characters to use (only digits)
  const characters = '0123456789';
  let result = '';
  
  // Generate a timestamp component for uniqueness
  const timestamp = Date.now().toString().slice(-6);
  
  // Calculate how many random characters we need
  const randomLength = Math.max(length - timestamp.length, 0);
  
  // Add random characters
  for (let i = 0; i < randomLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  
  // Combine timestamp and random characters
  result = timestamp + result;
  
  // Trim or pad to exact length
  return result.slice(0, length).padStart(length, '0');
} 