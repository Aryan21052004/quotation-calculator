import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchLiveUsdInrRate,
  readCachedRate,
  writeCachedRate,
  type StoredRate,
} from '../services/exchangeRateService'
import { toAppliedRate } from '../utils/exchangeRate'

export interface ExchangeRate {
  /** Raw market rate, ₹ per USD; null until a rate has ever been fetched. */
  liveRate: number | null
  /** Applied rate = live + ₹ markup — the only rate conversions may use. */
  appliedRate: number | null
  /** When the shown rate was successfully fetched. */
  lastUpdated: Date | null
  /** When the API published the hourly rate (lags the clock by up to ~80 min). */
  ratePublishedAt: Date | null
  /** True while a fetch is in flight. */
  refreshing: boolean
  /** True when the last fetch failed and the shown rate comes from cache. */
  usingCachedRate: boolean
  /** Set when the fetch failed and no cached rate exists at all. */
  errorMessage: string | null
  refresh: () => void
}

/**
 * Live USD → INR exchange rate: fetched once on mount, refreshed on demand.
 * A failed fetch keeps the last successful rate (in-memory or localStorage)
 * and flags it as cached instead of dropping to no rate.
 */
export function useExchangeRate(): ExchangeRate {
  const [stored, setStored] = useState<StoredRate | null>(() => readCachedRate())
  const [refreshing, setRefreshing] = useState(false)
  const [lastFetchFailed, setLastFetchFailed] = useState(false)

  const refresh = useCallback(() => {
    setRefreshing(true)
    fetchLiveUsdInrRate()
      .then((fresh) => {
        writeCachedRate(fresh)
        setStored(fresh)
        setLastFetchFailed(false)
      })
      .catch(() => setLastFetchFailed(true))
      .finally(() => setRefreshing(false))
  }, [])

  // Fetch once when the application loads (guarded against StrictMode's
  // double effect invocation).
  const fetchedOnMount = useRef(false)
  useEffect(() => {
    if (fetchedOnMount.current) return
    fetchedOnMount.current = true
    refresh()
  }, [refresh])

  return {
    liveRate: stored?.liveRate ?? null,
    appliedRate: stored ? toAppliedRate(stored.liveRate) : null,
    lastUpdated: stored ? new Date(stored.fetchedAt) : null,
    ratePublishedAt: stored ? new Date(stored.publishedAt) : null,
    refreshing,
    usingCachedRate: lastFetchFailed && stored !== null,
    errorMessage:
      lastFetchFailed && stored === null
        ? 'Could not load the exchange rate — INR display is unavailable.'
        : null,
    refresh,
  }
}
