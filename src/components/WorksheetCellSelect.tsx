interface WorksheetCellSelectProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  ariaLabel: string
}

// Dropdown worksheet cell, sized to match the 21px Excel row spacing.
function WorksheetCellSelect({ value, onChange, options, ariaLabel }: WorksheetCellSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="h-[20px] w-full bg-transparent px-0.5 py-0 text-[13px] outline-none focus:ring-1 focus:ring-sky-400 focus:ring-inset"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option === '' ? '—' : option}
        </option>
      ))}
    </select>
  )
}

export default WorksheetCellSelect
