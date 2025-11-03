/**
 * Rate Limiting Utility for Authentication
 * Prevents brute force attacks on login endpoints
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  private readonly ESCALATION_FACTOR = 2; // Double block time on repeated violations

  constructor() {
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if an identifier (email/IP) is rate limited
   * @param identifier - Email address or IP address
   * @returns Object with isBlocked status and remaining time
   */
  check(identifier: string): { isBlocked: boolean; remainingTime?: number; attemptsLeft?: number } {
    const normalizedId = identifier.toLowerCase().trim();
    const now = Date.now();
    const entry = this.attempts.get(normalizedId);

    // No previous attempts
    if (!entry) {
      return { isBlocked: false, attemptsLeft: this.MAX_ATTEMPTS };
    }

    // Check if currently blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      const remainingTime = Math.ceil((entry.blockedUntil - now) / 1000);
      return { isBlocked: true, remainingTime };
    }

    // Check if window has expired - reset attempts
    if (now - entry.firstAttempt > this.WINDOW_MS) {
      this.attempts.delete(normalizedId);
      return { isBlocked: false, attemptsLeft: this.MAX_ATTEMPTS };
    }

    // Within window - check attempts
    const attemptsLeft = Math.max(0, this.MAX_ATTEMPTS - entry.attempts);
    return { isBlocked: false, attemptsLeft };
  }

  /**
   * Record a failed login attempt
   * @param identifier - Email address or IP address
   * @returns Updated rate limit status
   */
  recordAttempt(identifier: string): { isBlocked: boolean; remainingTime?: number; attemptsLeft?: number } {
    const normalizedId = identifier.toLowerCase().trim();
    const now = Date.now();
    const entry = this.attempts.get(normalizedId);

    if (!entry) {
      // First attempt
      this.attempts.set(normalizedId, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return { isBlocked: false, attemptsLeft: this.MAX_ATTEMPTS - 1 };
    }

    // Reset if window expired
    if (now - entry.firstAttempt > this.WINDOW_MS) {
      this.attempts.set(normalizedId, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return { isBlocked: false, attemptsLeft: this.MAX_ATTEMPTS - 1 };
    }

    // Increment attempts
    entry.attempts++;
    entry.lastAttempt = now;

    // Check if should block
    if (entry.attempts >= this.MAX_ATTEMPTS) {
      // Calculate block duration - escalate for repeated violations
      const violationCount = Math.floor(entry.attempts / this.MAX_ATTEMPTS);
      const blockDuration = this.BLOCK_DURATION_MS * Math.pow(this.ESCALATION_FACTOR, violationCount - 1);
      entry.blockedUntil = now + blockDuration;

      const remainingTime = Math.ceil(blockDuration / 1000);
      return { isBlocked: true, remainingTime };
    }

    const attemptsLeft = Math.max(0, this.MAX_ATTEMPTS - entry.attempts);
    return { isBlocked: false, attemptsLeft };
  }

  /**
   * Reset rate limit for an identifier (on successful login)
   * @param identifier - Email address or IP address
   */
  reset(identifier: string): void {
    const normalizedId = identifier.toLowerCase().trim();
    this.attempts.delete(normalizedId);
  }

  /**
   * Get current status for an identifier
   * @param identifier - Email address or IP address
   */
  getStatus(identifier: string): RateLimitEntry | null {
    const normalizedId = identifier.toLowerCase().trim();
    return this.attempts.get(normalizedId) || null;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.attempts.entries()) {
      // Remove if window expired and not currently blocked
      if (now - entry.firstAttempt > this.WINDOW_MS && (!entry.blockedUntil || entry.blockedUntil < now)) {
        this.attempts.delete(key);
      }
    }
  }

  /**
   * Get statistics (for monitoring/debugging)
   */
  getStats(): { totalEntries: number; blockedEntries: number } {
    const now = Date.now();
    let blockedCount = 0;

    for (const entry of this.attempts.values()) {
      if (entry.blockedUntil && entry.blockedUntil > now) {
        blockedCount++;
      }
    }

    return {
      totalEntries: this.attempts.size,
      blockedEntries: blockedCount
    };
  }
}

// Export singleton instance
export const loginRateLimiter = new RateLimiter();

// Helper function to format remaining time
export function formatRemainingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ثانية`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} دقيقة`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} ساعة${remainingMinutes > 0 ? ` و ${remainingMinutes} دقيقة` : ''}`;
}
