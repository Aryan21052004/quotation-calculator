interface WorksheetCalculatedCellProps {
  /** Display text; blank until the section's calculations are implemented. */
  value?: string
  ariaLabel: string
  title?: string
}

// Read-only display cell for Section 4 (Calculated Cost Rollup, I3:M85).
// Every cell in that range is Arial, horizontally centered (explicit in the
// sheet - not Excel's default number right-align), on the column's solid
// fill, which the parent <td> supplies. 20px + the td border = the 21px row.
function WorksheetCalculatedCell({ value = '', ariaLabel, title }: WorksheetCalculatedCellProps) {
  return (
    <div
      role="cell"
      aria-label={ariaLabel}
      aria-readonly="true"
      title={title}
      style={{ fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}
      className="h-[20px] px-1 text-center text-[13px] leading-[20px] text-black"
    >
      {value}
    </div>
  )
}

export default WorksheetCalculatedCell
