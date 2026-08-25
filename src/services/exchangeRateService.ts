// Live USD → foreign rates: fetch from api.exchangerate.fun (free, keyless,
// CORS-open, refreshed hourly — replaced the once-daily open.er-api.com on
// 2026-07-22) and persist the last successful fetch in localStorage so a
// failed fetch — even on a fresh page load — can fall back to the cached
// rates. One request returns every currency, so EUR costs no extra round
// trip beyond the INR rate the app already fetched.

import { FOREIGN_CURRENCIES, type LiveRates } from '../utils/exchangeRate'

const RATE_API_URL = 'https://api.exchangerate.fun/latest?base=USD'
const STORAGE_KEY = 'quotation-calculator:usd-inr-rate'

export interface StoredRate {
  /** Raw market rates per USD (never used for conversion directly). */
  rates: LiveRates
  /** Epoch ms of the successful fetch (what "Last updated" shows). */
  fetchedAt: number
  /** Epoch ms the hourly rate was published by the API. */
  publishedAt: number
}

/** Keep only the currencies the app quotes in, dropping anything unusable. */
function pickRates(source: Record<string, unknown> | undefined): LiveRates {
  const rates: LiveRates = {}
  if (source === undefined) return rates
  for (const currency of FOREIGN_CURRENCIES) {
    const value = source[currency]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      rates[currency] = value
    }
  }
  return rates
}

export async function fetchLiveUsdInrRate(): Promise<StoredRate> {
  const response = await fetch(RATE_API_URL, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Exchange rate API returned ${response.status}`)
  }
  const body = (await response.json()) as { timestamp?: unknown; rates?: Record<string, unknown> }
  const rates = pickRates(body.rates)
  // INR carries the ₹1.50 markup every other applied rate is derived from, so
  // a response without it is unusable even if the other currencies arrived.
  if (typeof rates.INR !== 'number') {
    throw new Error('Exchange rate API returned an unexpected payload')
  }
  // The API stamps when the hourly rate was published (epoch seconds).
  // Kept separately from the fetch time: the publish time lags up to ~80
  // minutes behind the clock, so "Last updated" must reflect the fetch or
  // the Refresh button appears to do nothing within an hour.
  const now = Date.now()
  const publishedAt =
    typeof body.timestamp === 'number' && Number.isFinite(body.timestamp) && body.timestamp > 0
      ? body.timestamp * 1000
      : now
  return { rates, fetchedAt: now, publishedAt }
}

export function readCachedRate(): StoredRate | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as Partial<StoredRate> & { liveRate?: unknown }
    if (typeof parsed.fetchedAt !== 'number') return null
    // Caches written before the extra currencies held a single `liveRate`,
    // which was always the INR rate; they read back as INR-only until the
    // next successful fetch fills in the rest.
    const rates =
      typeof parsed.liveRate === 'number' && Number.isFinite(parsed.liveRate) && parsed.liveRate > 0
        ? { INR: parsed.liveRate }
        : pickRates(parsed.rates as Record<string, unknown> | undefined)
    if (typeof rates.INR !== 'number') return null
    // Caches written before publishedAt existed fall back to the fetch time.
    const publishedAt =
      typeof parsed.publishedAt === 'number' && Number.isFinite(parsed.publishedAt)
        ? parsed.publishedAt
        : parsed.fetchedAt
    return { rates, fetchedAt: parsed.fetchedAt, publishedAt }
  } catch {
    return null
  }
}

export function writeCachedRate(rate: StoredRate): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rate))
  } catch {
    // Storage unavailable (private mode, quota) — the in-memory rates still work.
  }
}
