import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchLiveUsdInrRate,
  readCachedRate,
  writeCachedRate,
  type StoredRate,
} from '../services/exchangeRateService'
import { appliedRates as deriveAppliedRates, type LiveRates } from '../utils/exchangeRate'

export interface ExchangeRate {
  /** Raw market rates per USD; empty until a rate has ever been fetched. */
  liveRates: LiveRates
  /** Applied rates (live + the ₹ markup) — the only rates conversions may use. */
  appliedRates: LiveRates
  /** True once at least one currency can be converted to. */
  hasRates: boolean
  /** When the shown rates were successfully fetched. */
  lastUpdated: Date | null
  /** When the API published the hourly rate (lags the clock by up to ~80 min). */
  ratePublishedAt: Date | null
  /** True while a fetch is in flight. */
  refreshing: boolean
  /** True when the last fetch failed and the shown rates come from cache. */
  usingCachedRate: boolean
  /** Set when the fetch failed and no cached rate exists at all. */
  errorMessage: string | null
  refresh: () => void
}

const NO_RATES: LiveRates = {}

/**
 * Live USD → INR and EUR exchange rates: fetched once on mount, refreshed
 * on demand. A failed fetch keeps the last successful rates (in-memory or
 * localStorage) and flags them as cached instead of dropping to no rates.
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

  const liveRates = stored?.rates ?? NO_RATES
  // Memoized so the worksheet's display objects keep a stable identity while
  // the user types - memoized line rows must not re-render on every keystroke.
  const applied = useMemo(() => deriveAppliedRates(liveRates), [liveRates])

  return {
    liveRates,
    appliedRates: applied,
    hasRates: Object.keys(applied).length > 0,
    lastUpdated: stored ? new Date(stored.fetchedAt) : null,
    ratePublishedAt: stored ? new Date(stored.publishedAt) : null,
    refreshing,
    usingCachedRate: lastFetchFailed && stored !== null,
    errorMessage:
      lastFetchFailed && stored === null
        ? 'Could not load the exchange rates — only USD display is available.'
        : null,
    refresh,
  }
}
