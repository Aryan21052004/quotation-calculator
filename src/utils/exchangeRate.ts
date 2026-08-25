// Display-currency conversion (business rule supplied 2026-07-20; markup
// raised from ₹1 to ₹1.50 on 2026-07-21; EUR/GBP/RUB added 2026-08-25).
//
// The app NEVER converts with the raw market rate. Every rate the business
// quotes at is the market rate for one unit of that currency, in rupees,
// plus a fixed rupee markup:
//
//   Applied ₹ per unit = Live ₹ per unit + markup
//
//   USD  ₹95.70 + ₹1.50 = ₹97.20 per USD
//   EUR  ₹111.58 + ₹1.50 = ₹113.08 per EUR
//   GBP  ₹130.53 + ₹1.50 = ₹132.03 per GBP
//   RUB  ₹1.1312 + ₹0.03 = ₹1.1612 per RUB
//
// The markup is smaller for roubles because one rouble is worth about a
// rupee — ₹1.50 on top of ₹1.13 would more than double it (user, 2026-08-25).
//
// The markup belongs to the FOREIGN currency, never to the rupee: there is no
// INR markup of its own (user, 2026-08-25). A rupee quote converts USD→INR
// through the applied ₹/USD rate, so it carries USD's ₹1.50 - the rule the
// app has used since 2026-07-20. Every other currency is scaled by how far
// its own applied rate sits above market, so the customer pays the markup
// rather than the market rate:
//
//   Price in X = Price in USD × live X-per-USD × (applied ₹ per X ÷ live ₹ per X)
//
// Conversion happens at DISPLAY time only: all pricing math stays in USD
// exactly as before (pricingFormulas untouched); every other currency is a
// presentation of the same USD figure. Converted amounts are rounded to two
// decimals so display-format helpers never see float noise.

import type { CellResult } from './pricingFormulas'

/** Currencies a quote can be shown in. USD is the currency pricing is done in. */
export type DisplayCurrency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'RUB'

/** Everything except USD needs a fetched rate to be displayable. */
export type ForeignCurrency = Exclude<DisplayCurrency, 'USD'>

/** Currencies quoted against the rupee. INR is the base, so it is not one. */
export type QuotedAgainstInr = Exclude<DisplayCurrency, 'INR'>

export const DISPLAY_CURRENCIES: DisplayCurrency[] = ['USD', 'INR', 'EUR', 'GBP', 'RUB']
export const FOREIGN_CURRENCIES: ForeignCurrency[] = ['INR', 'EUR', 'GBP', 'RUB']
export const INR_QUOTED_CURRENCIES: QuotedAgainstInr[] = ['USD', 'EUR', 'GBP', 'RUB']

/**
 * Markup added to each foreign currency's rupee rate, in ₹ per unit of that
 * currency. The rupee itself is the base and has no entry - quoting in INR
 * converts through USD's rate and so carries USD's markup.
 */
export const RATE_MARKUP_INR: Record<QuotedAgainstInr, number> = {
  USD: 1.5,
  EUR: 1.5,
  GBP: 1.5,
  RUB: 0.03,
}

/**
 * Live market rates per USD, keyed by currency. Partial on purpose: a cache
 * written before a currency existed - or an API response missing one - leaves
 * that currency unavailable rather than breaking the others.
 */
export type LiveRates = Partial<Record<ForeignCurrency, number>>

const SYMBOLS: Record<DisplayCurrency, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  RUB: '₽',
}

/**
 * What one unit of `currency` is worth in rupees at market: ₹ per EUR is
 * (₹ per USD) ÷ (EUR per USD). USD is the API's base, so its rupee value is
 * the INR rate itself.
 */
export function rupeesPerUnit(currency: QuotedAgainstInr, rates: LiveRates): number | null {
  const liveInr = rates.INR
  if (typeof liveInr !== 'number' || liveInr <= 0) return null
  if (currency === 'USD') return liveInr
  const live = rates[currency]
  if (typeof live !== 'number' || live <= 0) return null
  return liveInr / live
}

/** The market rupee rate plus this currency's markup — what the business quotes at. */
export function appliedRupeesPerUnit(currency: QuotedAgainstInr, rates: LiveRates): number | null {
  const market = rupeesPerUnit(currency, rates)
  return market === null ? null : market + RATE_MARKUP_INR[currency]
}

/**
 * Rate a USD price converts at to be shown in `currency`, or null when the
 * rates needed are missing. USD is the pricing currency and needs no
 * conversion, so it has no applied rate.
 */
export function appliedRateFor(currency: DisplayCurrency, rates: LiveRates): number | null {
  if (currency === 'USD') return null
  // A rupee quote converts straight through the applied ₹/USD rate.
  if (currency === 'INR') return appliedRupeesPerUnit('USD', rates)
  const live = rates[currency]
  const market = rupeesPerUnit(currency, rates)
  const applied = appliedRupeesPerUnit(currency, rates)
  if (typeof live !== 'number' || market === null || applied === null) return null
  // Scaled by how far the applied rupee rate sits above market, so the
  // customer pays the markup instead of the market rate.
  return live * (applied / market)
}

/** Every applied conversion rate that can currently be worked out. */
export function appliedRates(rates: LiveRates): LiveRates {
  const applied: LiveRates = {}
  for (const currency of FOREIGN_CURRENCIES) {
    const rate = appliedRateFor(currency, rates)
    if (rate !== null) applied[currency] = rate
  }
  return applied
}

/** How monetary values should be rendered: the currency and its applied rate. */
export interface CurrencyDisplay {
  currency: DisplayCurrency
  /** Applied rate for `currency`; null for USD and until a rate is fetched. */
  appliedRate: number | null
}

export function currencySymbol(display: CurrencyDisplay): string {
  return SYMBOLS[display.currency]
}

/**
 * Digit grouping locale. Only INR differs - it groups in lakhs (₹1,02,010.40)
 * - so the rest share en-US rather than each currency's own separators, which
 * would swap the decimal point mid-document.
 */
export function currencyLocale(display: CurrencyDisplay): string {
  return display.currency === 'INR' ? 'en-IN' : 'en-US'
}

/**
 * Converts a USD cell result for display: value × applied rate (rounded to 2
 * decimals). USD, missing rates, and Excel errors pass through untouched.
 */
export function convertForDisplay(result: CellResult, display: CurrencyDisplay): CellResult {
  if (typeof result !== 'number') return result
  if (display.currency === 'USD' || display.appliedRate === null) return result
  return Math.round(result * display.appliedRate * 100) / 100
}
