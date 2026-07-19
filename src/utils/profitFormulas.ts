// Profit layer on top of the Section 4 cost rollup. This is an app feature,
// not part of the OLD DONT USE sheet (the workbook has no profit, selling
// price, margin, or totals formulas - verified in the full formula audit).
// Semantics chosen by the user: the selected rate is the profit share OF THE
// SELLING PRICE (margin basis), so at 40% the shown price is 40% profit:
//   Selling  = Unit Cost / (1 - rate)
//   Profit   = Selling - Unit Cost
//   Margin   = Profit / Selling   (derived, never hardcoded to the rate)
// One engine, reused by every cell and by the totals - formulas exist only
// here, and all inputs flow from the existing cost-rollup results.

import { toExcelPrecision } from './quotationFormulas'
import { EXCEL_DIV_ZERO_ERROR, isError, type CellResult } from './costRollupFormulas'

export const PROFIT_RATE_OPTIONS = [0.4, 0.5, 0.6] as const
export type ProfitRate = (typeof PROFIT_RATE_OPTIONS)[number]

/** Selling Price = Unit Cost / (1 - rate). Errors in the cost propagate. */
export function calculateSellingPrice(unitCost: CellResult, rate: ProfitRate): CellResult {
  if (isError(unitCost)) return unitCost
  return toExcelPrecision(unitCost / (1 - rate))
}

/** Profit = Selling Price - Unit Cost. */
export function calculateProfit(sellingPrice: CellResult, unitCost: CellResult): CellResult {
  if (isError(sellingPrice)) return sellingPrice
  if (isError(unitCost)) return unitCost
  return toExcelPrecision(sellingPrice - unitCost)
}

/** Margin = Profit / Selling Price - derived, equals the rate when valid. */
export function calculateMargin(profit: CellResult, sellingPrice: CellResult): CellResult {
  if (isError(profit)) return profit
  if (isError(sellingPrice)) return sellingPrice
  if (sellingPrice === 0) return EXCEL_DIV_ZERO_ERROR
  return toExcelPrecision(profit / sellingPrice)
}

/** The three per-unit profit figures for one row, from its unit cost. */
export interface ProfitBreakdown {
  sellingPrice: CellResult
  profit: CellResult
  margin: CellResult
}

export function calculateProfitBreakdown(unitCost: CellResult, rate: ProfitRate): ProfitBreakdown {
  const sellingPrice = calculateSellingPrice(unitCost, rate)
  const profit = calculateProfit(sellingPrice, unitCost)
  const margin = calculateMargin(profit, sellingPrice)
  return { sellingPrice, profit, margin }
}

/** What the totals need from each row: raw MOQ text plus rollup results. */
export interface ProfitTotalsRowInput {
  moqRaw: number | CellResult
  totalUsd: CellResult
  unitCost: CellResult
}

export interface ProfitTotals {
  /** Rows included: numeric chain and MOQ > 0 (real, priced line items). */
  lineItemCount: number
  totalCost: number
  totalProfit: number
  grandTotal: number
}

/**
 * Sums the priced line items: line cost is the row's TOTAL IN USD (L), line
 * selling/profit scale the per-unit figures by MOQ. Rows whose chain is an
 * error or whose MOQ is not a positive number are excluded from the sums.
 */
export function calculateProfitTotals(
  rows: ProfitTotalsRowInput[],
  rate: ProfitRate,
): ProfitTotals {
  let lineItemCount = 0
  let totalCost = 0
  let totalProfit = 0
  let grandTotal = 0

  for (const row of rows) {
    const { moqRaw, totalUsd, unitCost } = row
    if (typeof moqRaw !== 'number' || moqRaw <= 0) continue
    if (typeof totalUsd !== 'number' || typeof unitCost !== 'number') continue
    const { sellingPrice, profit } = calculateProfitBreakdown(unitCost, rate)
    if (typeof sellingPrice !== 'number' || typeof profit !== 'number') continue

    lineItemCount += 1
    totalCost += totalUsd
    totalProfit += profit * moqRaw
    grandTotal += sellingPrice * moqRaw
  }

  return {
    lineItemCount,
    totalCost: toExcelPrecision(totalCost),
    totalProfit: toExcelPrecision(totalProfit),
    grandTotal: toExcelPrecision(grandTotal),
  }
}

/** Percent display for the margin cell, two decimals: 0.4 -> "40.00%". */
export function formatPercent(result: CellResult): string {
  return typeof result === 'number' ? `${(result * 100).toFixed(2)}%` : result
}
