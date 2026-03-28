/**
 * In-memory caching layer for analytics data
 * Reduces AI API calls and improves response times
 */

import { ConversationAnalytics, AnalyticsFilters } from './analytics-types';

interface CacheEntry {
  data: ConversationAnalytics;
  timestamp: number;
  ttl: number;
  filters: AnalyticsFilters;
}

class AnalyticsCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = {
    basic: 3600000,      // 1 hour for basic metrics
    ai_analysis: 21600000 // 6 hours for AI analysis
  };

  /**
   * Generate cache key from filters
   */
  private generateKey(filters: AnalyticsFilters): string {
    const parts = [
      filters.start_date || 'all',
      filters.end_date || 'all',
      filters.channel || 'all',
      filters.user_type || 'all'
    ];
    return `analytics:${parts.join(':')}`;
  }

  /**
   * Get cached analytics data
   * Returns data if cache hit and not expired, null otherwise
   */
  get(filters: AnalyticsFilters): ConversationAnalytics | null {
    const key = this.generateKey(filters);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if cache expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update cache status based on age
    const agePercentage = age / entry.ttl;
    if (agePercentage < 0.3) {
      entry.data.cache_status = 'fresh';
    } else if (agePercentage < 0.7) {
      entry.data.cache_status = 'cached';
    } else {
      entry.data.cache_status = 'stale';
    }

    return entry.data;
  }

  /**
   * Set analytics data in cache
   */
  set(filters: AnalyticsFilters, data: ConversationAnalytics, isAIAnalysis = false): void {
    const key = this.generateKey(filters);
    const ttl = isAIAnalysis ? this.DEFAULT_TTL.ai_analysis : this.DEFAULT_TTL.basic;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      filters
    });
  }

  /**
   * Clear cache entry for specific filters
   */
  clear(filters: AnalyticsFilters): void {
    const key = this.generateKey(filters);
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{
      key: string;
      age: number;
      ttl: number;
      remaining: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
      remaining: Math.max(0, entry.ttl - (now - entry.timestamp))
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Export singleton instance
export const analyticsCache = new AnalyticsCache();

// Auto-cleanup every 10 minutes
if (typeof window === 'undefined') {
  // Only run in Node.js environment
  setInterval(() => {
    analyticsCache.cleanup();
  }, 600000); // 10 minutes
}
