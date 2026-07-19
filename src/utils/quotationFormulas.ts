// Section 3 (Line Item Input Block, A3:H85) formulas from the OLD DONT USE
// sheet. A full audit of all 664 cells (data types, hidden-formula flags,
// merges, defined names, INDIRECT / cross-sheet references) found exactly one
// formula in the range: E4 = "=E3*98".

export const EXCEL_VALUE_ERROR = '#VALUE!' as const
export type ExcelValueError = typeof EXCEL_VALUE_ERROR

export const EXCEL_REF_ERROR = '#REF!' as const
export type ExcelRefError = typeof EXCEL_REF_ERROR

/**
 * Excel corrects arithmetic results to 15 significant figures, hiding the
 * IEEE-754 noise that raw JS arithmetic keeps (0.91 * 98 is
 * 89.18000000000001 in JS; Excel's cached E4 value is exactly 89.18).
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

/**
 * Cell E4 - the sole formula in A3:H85. Excel: `=E3*98` (fully relative
 * reference, no $ anchors - it points one row up in the same column).
 * Takes S/N 1's raw unit-price text (cell E3) and returns the product,
 * or #VALUE! exactly where Excel would show it. Pass null when the source
 * row no longer exists: deleting the referenced row in Excel leaves
 * `=#REF!*98`, which displays #REF!.
 */
export function calculateE4UnitPrice(
  e3RawValue: string | null,
): number | ExcelValueError | ExcelRefError {
  if (e3RawValue === null) return EXCEL_REF_ERROR
  const e3 = excelCoerceNumber(e3RawValue)
  if (e3 === EXCEL_VALUE_ERROR) return e3
  return toExcelPrecision(e3 * 98)
}

/** E4 carries Excel number format "0.00" - two decimals, always. */
export function formatE4UnitPrice(result: number | ExcelValueError | ExcelRefError): string {
  return typeof result === 'number' ? result.toFixed(2) : result
}
