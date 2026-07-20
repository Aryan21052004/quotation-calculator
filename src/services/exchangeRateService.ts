// Live USD → INR rate: fetch from open.er-api.com (free, keyless, CORS-open)
// and persist the last successful fetch in localStorage so a failed fetch —
// even on a fresh page load — can fall back to the cached rate.

const RATE_API_URL = 'https://open.er-api.com/v6/latest/USD'
const STORAGE_KEY = 'quotation-calculator:usd-inr-rate'

export interface StoredRate {
  /** Raw market rate, ₹ per USD (never used for conversion directly). */
  liveRate: number
  /** Epoch ms of the successful fetch. */
  fetchedAt: number
}

export async function fetchLiveUsdInrRate(): Promise<StoredRate> {
  const response = await fetch(RATE_API_URL, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Exchange rate API returned ${response.status}`)
  }
  const body = (await response.json()) as { result?: string; rates?: Record<string, unknown> }
  const rate = body.rates?.INR
  if (body.result !== 'success' || typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('Exchange rate API returned an unexpected payload')
  }
  return { liveRate: rate, fetchedAt: Date.now() }
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
