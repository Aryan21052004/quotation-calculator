// USD → INR display conversion (business rule supplied 2026-07-20;
// markup raised from ₹1 to ₹1.50 on 2026-07-21).
//
// The app NEVER converts with the raw market rate. Every conversion uses
//
//   Applied rate = Live rate + ₹1.50
//
// and happens at DISPLAY time only: all pricing math stays in USD exactly
// as before (pricingFormulas untouched); INR is a presentation of the same
// USD figure. Converted amounts are rounded to the paisa so display-format
// helpers never see float noise from the multiplication.

import type { CellResult } from './pricingFormulas'

/** Fixed markup added to the live rate, in ₹ per USD. */
export const RATE_MARKUP_INR = 1.5

/** Applied rate = Live rate + the ₹ markup — the only rate conversions may use. */
export function toAppliedRate(liveRate: number): number {
  return liveRate + RATE_MARKUP_INR
}

export type DisplayCurrency = 'USD' | 'INR'

/** How monetary values should be rendered: the currency and, for INR, the applied rate. */
export interface CurrencyDisplay {
  currency: DisplayCurrency
  /** Applied rate (live + ₹ markup); null until a rate has ever been fetched. */
  appliedRate: number | null
}

export function currencySymbol(display: CurrencyDisplay): string {
  return display.currency === 'INR' ? '₹' : '$'
}

/**
 * Converts a USD cell result for display: INR = USD × applied rate (rounded
 * to 2 decimals); USD and Excel errors pass through untouched.
 */
export function convertForDisplay(result: CellResult, display: CurrencyDisplay): CellResult {
  if (typeof result !== 'number') return result
  if (display.currency !== 'INR' || display.appliedRate === null) return result
  return Math.round(result * display.appliedRate * 100) / 100
}
