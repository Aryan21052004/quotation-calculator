import type { CellValueKind } from '../types'

// UI-level validation for Section 3 (Line Item Input Block, A3:H85) raw cell
// text. Blank is always valid - the sheet's own cells are mostly empty and
// Excel imposes no data validation anywhere on this range. Rules mirror what
// each column actually holds in the workbook, including column F's
// currency-as-text entries like "$ 242.70".

const INTEGER_PATTERN = /^\d+$/
const DECIMAL_PATTERN = /^(\d+(\.\d*)?|\.\d+)$/
// Optional "$" with optional space, digits with optional thousands commas,
// optional decimals - accepts "0.27", "$ 242.70", "$1,234.56".
const CURRENCY_PATTERN = /^\$?\s*\d{1,3}(,\d{3})*(\.\d+)?$|^\$?\s*\d+(\.\d+)?$/

export function validateCellValue(kind: CellValueKind, rawValue: string): string | null {
  const value = rawValue.trim()
  if (value === '') return null

  switch (kind) {
    case 'text':
      return null
    case 'integer':
      return INTEGER_PATTERN.test(value) ? null : 'Must be a whole number'
    case 'decimal':
      return DECIMAL_PATTERN.test(value) ? null : 'Must be a number'
    case 'currency':
      return CURRENCY_PATTERN.test(value) ? null : 'Must be an amount, e.g. 242.70 or $ 242.70'
  }
}
