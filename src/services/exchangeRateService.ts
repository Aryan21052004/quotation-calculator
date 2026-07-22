// Live USD → INR rate: fetch from api.exchangerate.fun (free, keyless,
// CORS-open, refreshed hourly — replaced the once-daily open.er-api.com on
// 2026-07-22) and persist the last successful fetch in localStorage so a
// failed fetch — even on a fresh page load — can fall back to the cached
// rate.

const RATE_API_URL = 'https://api.exchangerate.fun/latest?base=USD'
const STORAGE_KEY = 'quotation-calculator:usd-inr-rate'

export interface StoredRate {
  /** Raw market rate, ₹ per USD (never used for conversion directly). */
  liveRate: number
  /** Epoch ms the rate was published (API timestamp; fetch time as fallback). */
  fetchedAt: number
}

export async function fetchLiveUsdInrRate(): Promise<StoredRate> {
  const response = await fetch(RATE_API_URL, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Exchange rate API returned ${response.status}`)
  }
  const body = (await response.json()) as { timestamp?: unknown; rates?: Record<string, unknown> }
  const rate = body.rates?.INR
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('Exchange rate API returned an unexpected payload')
  }
  // The API stamps when the hourly rate was published (epoch seconds);
  // surface that as "last updated" so the card reflects the rate's real age.
  const publishedAt =
    typeof body.timestamp === 'number' && Number.isFinite(body.timestamp) && body.timestamp > 0
      ? body.timestamp * 1000
      : Date.now()
  return { liveRate: rate, fetchedAt: publishedAt }
}

export function readCachedRate(): StoredRate | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as Partial<StoredRate>
    if (
      typeof parsed.liveRate !== 'number' ||
      !Number.isFinite(parsed.liveRate) ||
      parsed.liveRate <= 0 ||
      typeof parsed.fetchedAt !== 'number'
    ) {
      return null
    }
    return { liveRate: parsed.liveRate, fetchedAt: parsed.fetchedAt }
  } catch {
    return null
  }
}

export function writeCachedRate(rate: StoredRate): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rate))
  } catch {
    // Storage unavailable (private mode, quota) — the in-memory rate still works.
  }
}
