// Quotation pricing engine - the formula supplied by the user (2026-07-20),
// replacing the original workbook's cost-rollup chain:
//
//   Line value  = MOQ × Unit price
//   Profit      = Line value × rate          (41.5% / 51.5% / 61.5%)
//   Line total  = Line value + Profit + Freight
//   Final price = Line total ÷ MOQ           (per unit)
//
// i.e. final price EA = ((MOQ × unit price) + profit% + freight) ÷ MOQ.
// Excel semantics are kept from the previous engine: blank cells read as 0,
// formatted-number text coerces ("$ 242.70" works), operand errors propagate,
// results snap to Excel's 15-significant-figure precision, and a zero or
// blank MOQ yields #DIV/0! for the per-unit figures.

import { excelCoerceNumber, toExcelPrecision, type ExcelValueError } from './quotationFormulas'

export const EXCEL_DIV_ZERO_ERROR = '#DIV/0!' as const
export type ExcelDivZeroError = typeof EXCEL_DIV_ZERO_ERROR

export type ExcelCalcError = ExcelValueError | ExcelDivZeroError
export type CellResult = number | ExcelCalcError

/** True when a cell result carries an Excel error instead of a number. */
export function isError(value: CellResult): value is ExcelCalcError {
  return typeof value !== 'number'
}

// Raised from 40/50/60 by 1.5 points on request (2026-07-20).
export const PROFIT_RATE_OPTIONS = [0.415, 0.515, 0.615] as const
export type ProfitRate = (typeof PROFIT_RATE_OPTIONS)[number]

/** Raw cell text of one row's pricing inputs. */
export interface PricingInputs {
  moq: string
  unitPrice: string
  freight: string
}

/**
 * The rate-independent part of one row's pricing, computed once per row edit
 * and shared by the list, the editor, the totals, and the quote document.
 */
export interface PricingCore {
  moq: CellResult
  /** Line value = MOQ × Unit price. */
  lineValue: CellResult
  freight: CellResult
}

export function calculatePricingCore(inputs: PricingInputs): PricingCore {
  const moq = excelCoerceNumber(inputs.moq)
  const unitPrice = excelCoerceNumber(inputs.unitPrice)
  const freight = excelCoerceNumber(inputs.freight)

  let lineValue: CellResult
  if (isError(moq)) lineValue = moq
  else if (isError(unitPrice)) lineValue = unitPrice
  else lineValue = toExcelPrecision(moq * unitPrice)

  return { moq, lineValue, freight }
}

/** Profit = Line value × rate. */
export function calculateProfitAmount(lineValue: CellResult, rate: ProfitRate): CellResult {
  if (isError(lineValue)) return lineValue
  return toExcelPrecision(lineValue * rate)
}

/** Line total = Line value + Profit + Freight. */
export function calculateLineTotal(
  lineValue: CellResult,
  profitAmount: CellResult,
  freight: CellResult,
): CellResult {
  if (isError(lineValue)) return lineValue
  if (isError(profitAmount)) return profitAmount
  if (isError(freight)) return freight
  return toExcelPrecision(lineValue + profitAmount + freight)
}

/** Final price EA = Line total ÷ MOQ; zero/blank MOQ yields #DIV/0!. */
export function calculateFinalPrice(lineTotal: CellResult, moq: CellResult): CellResult {
  if (isError(lineTotal)) return lineTotal
  if (isError(moq)) return moq
  if (moq === 0) return EXCEL_DIV_ZERO_ERROR
  return toExcelPrecision(lineTotal / moq)
}

/** Cost per unit = (Line value + Freight) ÷ MOQ - what the row costs before profit. */
export function calculateUnitCost(core: PricingCore): CellResult {
  const { moq, lineValue, freight } = core
  if (isError(lineValue)) return lineValue
  if (isError(freight)) return freight
  if (isError(moq)) return moq
  if (moq === 0) return EXCEL_DIV_ZERO_ERROR
  return toExcelPrecision((lineValue + freight) / moq)
}

/** The rate-dependent figures for one row, derived from its core. */
export interface PricingBreakdown {
  profitAmount: CellResult
  lineTotal: CellResult
  finalPrice: CellResult
}

export function calculatePricingBreakdown(core: PricingCore, rate: ProfitRate): PricingBreakdown {
  const profitAmount = calculateProfitAmount(core.lineValue, rate)
  const lineTotal = calculateLineTotal(core.lineValue, profitAmount, core.freight)
  const finalPrice = calculateFinalPrice(lineTotal, core.moq)
  return { profitAmount, lineTotal, finalPrice }
}

export interface PricingTotals {
  /** Rows included: numeric inputs and MOQ > 0 (real, priced line items). */
  lineItemCount: number
  /** Σ (Line value + Freight). */
  totalCost: number
  /** Σ Profit. */
  totalProfit: number
  /** Σ Line total = total cost + total profit. */
  grandTotal: number
}

export function calculatePricingTotals(cores: PricingCore[], rate: ProfitRate): PricingTotals {
  let lineItemCount = 0
  let totalCost = 0
  let totalProfit = 0
  let grandTotal = 0

  for (const core of cores) {
    const { moq, lineValue, freight } = core
    if (typeof moq !== 'number' || moq <= 0) continue
    if (typeof lineValue !== 'number' || typeof freight !== 'number') continue
    const { profitAmount, lineTotal } = calculatePricingBreakdown(core, rate)
    if (typeof profitAmount !== 'number' || typeof lineTotal !== 'number') continue

    lineItemCount += 1
    totalCost += lineValue + freight
    totalProfit += profitAmount
    grandTotal += lineTotal
  }

  return {
    lineItemCount,
    totalCost: toExcelPrecision(totalCost),
    totalProfit: toExcelPrecision(totalProfit),
    grandTotal: toExcelPrecision(grandTotal),
  }
}

/** Excel "General" format: plain digits, no padding. */
export function formatGeneral(result: CellResult): string {
  return typeof result === 'number' ? String(result) : result
}

/** Excel "0.00" format: two decimals, always. */
export function formatTwoDecimals(result: CellResult): string {
  return typeof result === 'number' ? result.toFixed(2) : result
}
