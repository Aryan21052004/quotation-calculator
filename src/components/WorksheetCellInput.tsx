import type { CellValueKind } from '../types'
import { validateCellValue } from '../utils/worksheetValidation'

interface WorksheetCellInputProps {
  value: string
  onChange: (value: string) => void
  kind: CellValueKind
  ariaLabel: string
  /** Numeric cells right-align like Excel; text cells left-align. */
  align?: 'left' | 'right'
}

// One editable worksheet cell. Compact 20px height keeps the 21px Excel row
// spacing (plus the 1px cell border). Invalid input gets a red inset ring and
// the message via title/aria - the raw text is kept so the user can fix it.
function WorksheetCellInput({
  value,
  onChange,
  kind,
  ariaLabel,
  align = 'left',
}: WorksheetCellInputProps) {
  const error = validateCellValue(kind, value)

  return (
    <input
      type="text"
      inputMode={kind === 'integer' || kind === 'decimal' ? 'decimal' : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      aria-invalid={error !== null}
      title={error ?? undefined}
      className={`h-[20px] w-full bg-transparent px-1 py-0 text-[13px] outline-none focus:ring-1 focus:ring-sky-400 focus:ring-inset ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${error ? 'ring-1 ring-red-500 ring-inset bg-red-50' : ''}`}
    />
  )
}

export default WorksheetCellInput
