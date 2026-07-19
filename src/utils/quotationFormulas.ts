// Shared Excel-semantics primitives used by the worksheet formula engines.
// (The original workbook's one Section 3 formula, E4 = "=E3*98" - a stray
// currency-conversion leftover - was removed from the app by request; the
// helpers below remain the foundation for the cost-rollup engine.)

export const EXCEL_VALUE_ERROR = '#VALUE!' as const
export type ExcelValueError = typeof EXCEL_VALUE_ERROR

/**
 * Excel corrects arithmetic results to 15 significant figures, hiding the
 * IEEE-754 noise that raw JS arithmetic keeps (e.g. 100 + 970.8 + 485.4 is
 * 1556.1999999999998 in JS; Excel stores exactly 1556.2).
 * Shared by every formula module that mirrors Excel arithmetic.
 */
export function toExcelPrecision(value: number): number {
  return Number(value.toPrecision(15))
}

// Excel coerces formatted-number text in arithmetic - signs ("-5", "+5"),
// currency ("$ 242.70"), thousands separators ("1,234.5"), bare trailing
// decimal points ("5."), and scientific notation ("1e2") - treats blank as 0,
// and yields #VALUE! for anything else (including hex like "0x10").
const COERCIBLE_NUMBER = /^[+-]?\$?\s*[+-]?(\d{1,3}(,\d{3})*|\d*)(\.\d*)?([eE][+-]?\d+)?$/

/**
 * How Excel's arithmetic operators read a cell: number, blank-as-zero, or
 * #VALUE! for text it cannot coerce.
 */
export function excelCoerceNumber(rawValue: string): number | ExcelValueError {
  const value = rawValue.trim()
  if (value === '') return 0
  if (!COERCIBLE_NUMBER.test(value) || !/\d/.test(value)) return EXCEL_VALUE_ERROR
  const parsed = Number(value.replace(/[$,\s]/g, ''))
  return Number.isFinite(parsed) ? parsed : EXCEL_VALUE_ERROR
}
