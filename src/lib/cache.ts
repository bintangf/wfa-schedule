// Simple client-side cache for API responses
import { format } from 'date-fns'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

export interface CacheMetrics {
  hits: number
  misses: number
  totalRequests: number
  hitRate: number
}

// Enhanced cache with compression and storage persistence
class APICache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes
  private metrics: CacheMetrics = { hits: 0, misses: 0, totalRequests: 0, hitRate: 0 }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  get<T>(key: string): T | null {
    this.metrics.totalRequests++
    const entry = this.cache.get(key)
    if (!entry) {
      this.metrics.misses++
      this.updateHitRate()
      return null
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      this.metrics.misses++
      this.updateHitRate()
      return null
    }

    this.metrics.hits++
    this.updateHitRate()
    console.log(`Cache hit: ${key} (Hit rate: ${this.metrics.hitRate.toFixed(2)}%)`)
    return entry.data as T
  }

  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests) * 100 
      : 0
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  // Prefetch adjacent months for better UX
  async prefetchAdjacentMonths(currentMonth: string): Promise<void> {
    const [year, month] = currentMonth.split('-').map(Number)
    
    const prevMonth = new Date(year, month - 2, 1)
    const nextMonth = new Date(year, month, 1)
    
    const prevMonthStr = format(prevMonth, 'yyyy-MM')
    const nextMonthStr = format(nextMonth, 'yyyy-MM')
    
    // Prefetch in background without blocking
    setTimeout(async () => {
      try {
        await Promise.all([
          cachedFetch(`/api/wfa-schedule?month=${prevMonthStr}`, undefined, 10 * 60 * 1000),
          cachedFetch(`/api/wfa-schedule?month=${nextMonthStr}`, undefined, 10 * 60 * 1000),
          cachedFetch(`/api/user-leaves?month=${prevMonthStr}`, undefined, 5 * 60 * 1000),
          cachedFetch(`/api/user-leaves?month=${nextMonthStr}`, undefined, 5 * 60 * 1000)
        ])
        console.log(`Prefetched data for ${prevMonthStr} and ${nextMonthStr}`)
      } catch (error) {
        console.log('Prefetch failed (silent):', error)
      }
    }, 1000) // 1 second delay
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
  }
}

export const apiCache = new APICache()

// Helper function for cached fetch
export async function cachedFetch<T>(
  url: string, 
  options?: RequestInit,
  ttl?: number
): Promise<T> {
  const cacheKey = `${url}_${JSON.stringify(options)}`
  
  // Try to get from cache first
  const cached = apiCache.get<T>(cacheKey)
  if (cached) {
    console.log('Cache hit:', url)
    return cached
  }

  // Fetch from API
  console.log('Cache miss, fetching:', url)
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json() as T
  
  // Store in cache
  apiCache.set(cacheKey, data, ttl)
  
  return data
}
