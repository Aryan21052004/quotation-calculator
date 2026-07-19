// Section 4 (Calculated Cost Rollup, I3:M85) calculation engine. The five
// row-repeating formulas from the OLD DONT USE sheet, converted exactly and
// kept isolated - one function per column - with the sheet's own dependency
// chain I -> J -> K -> L -> M preserved in calculateCostRollup(). Excel
// semantics throughout: blank cells read as 0, formatted-number text is
// coerced ("$ 242.70" works, as the sheet itself relies on in F38:F40),
// operand errors propagate through the chain, and every result is snapped
// to Excel's 15-significant-figure precision.

import { excelCoerceNumber, toExcelPrecision, type ExcelValueError } from './quotationFormulas'

export const EXCEL_DIV_ZERO_ERROR = '#DIV/0!' as const
export type ExcelDivZeroError = typeof EXCEL_DIV_ZERO_ERROR

export type ExcelCalcError = ExcelValueError | ExcelDivZeroError
export type CellResult = number | ExcelCalcError

/** True when a cell result carries an Excel error instead of a number. */
export function isError(value: CellResult): value is ExcelCalcError {
  return typeof value !== 'number'
}

/** Column I - LINE VALUE. Excel: `=C*F` (MOQ times the column F rate). */
export function calculateLineValue(moq: CellResult, rate: CellResult): CellResult {
  if (isError(moq)) return moq
  if (isError(rate)) return rate
  return toExcelPrecision(moq * rate)
}

/** Column J - CUSTOM DUTY. Excel: `=I/2`. */
export function calculateCustomDuty(lineValue: CellResult): CellResult {
  if (isError(lineValue)) return lineValue
  return toExcelPrecision(lineValue / 2)
}

/** Column K - LANDING COST IN USD. Excel: `=G+H+I+J`. */
export function calculateLandingCost(
  freight: CellResult,
  clearance: CellResult,
  lineValue: CellResult,
  customDuty: CellResult,
): CellResult {
  if (isError(freight)) return freight
  if (isError(clearance)) return clearance
  if (isError(lineValue)) return lineValue
  if (isError(customDuty)) return customDuty
  return toExcelPrecision(freight + clearance + lineValue + customDuty)
}

/** Column L - TOTAL IN USD. Excel: `=K*1.01`. */
export function calculateTotalUsd(landingCost: CellResult): CellResult {
  if (isError(landingCost)) return landingCost
  return toExcelPrecision(landingCost * 1.01)
}

/**
 * Column M - UNIT COST IN USD. Excel: `=L/C`.
 * An error in L propagates first (Excel resolves operand errors before the
 * division); a blank or zero MOQ then yields #DIV/0!, exactly as the sheet
 * shows on its 78 template rows.
 */
export function calculateUnitCost(totalUsd: CellResult, moq: CellResult): CellResult {
  if (isError(totalUsd)) return totalUsd
  if (isError(moq)) return moq
  if (moq === 0) return EXCEL_DIV_ZERO_ERROR
  return toExcelPrecision(totalUsd / moq)
}

/** Raw cell text of one row's formula inputs: C, F, G, H. */
export interface CostRollupInputs {
  moq: string
  rate: string
  freight: string
  clearance: string
}

export interface CostRollupResults {
  lineValue: CellResult
  customDuty: CellResult
  landingCost: CellResult
  totalUsd: CellResult
  unitCost: CellResult
}

/**
 * Runs one row through the full chain in the sheet's own dependency order:
 * I -> J -> K -> L -> M. Nothing is hardcoded - every value flows from the
 * four raw inputs through the five formulas above.
 */
export function calculateCostRollup(inputs: CostRollupInputs): CostRollupResults {
  const moq = excelCoerceNumber(inputs.moq)
  const rate = excelCoerceNumber(inputs.rate)
  const freight = excelCoerceNumber(inputs.freight)
  const clearance = excelCoerceNumber(inputs.clearance)

  const lineValue = calculateLineValue(moq, rate)
  const customDuty = calculateCustomDuty(lineValue)
  const landingCost = calculateLandingCost(freight, clearance, lineValue, customDuty)
  const totalUsd = calculateTotalUsd(landingCost)
  const unitCost = calculateUnitCost(totalUsd, moq)

  return { lineValue, customDuty, landingCost, totalUsd, unitCost }
}

/** Excel "General" format, as columns I-L carry: plain digits, no padding. */
export function formatGeneral(result: CellResult): string {
  return typeof result === 'number' ? String(result) : result
}

/** Excel "0.00" format, as column M carries: two decimals, always. */
export function formatTwoDecimals(result: CellResult): string {
  return typeof result === 'number' ? result.toFixed(2) : result
}
