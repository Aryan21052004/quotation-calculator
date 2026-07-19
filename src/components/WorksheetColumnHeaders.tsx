import type { ColumnGroup, WorksheetColumn } from '../types'

interface WorksheetColumnHeadersProps {
  columns: WorksheetColumn[]
}

// Exact recreation of the OLD DONT USE sheet's header row (A2:M2), measured
// from the workbook: solid fills per group, Arial 10pt #333333 text (A2 alone
// names Inter in the file - normalized to Arial like its 12 siblings), bold
// and vertically centered on the orange input group only, bottom-aligned
// wrapping text on the rest, thin black borders, 27.75pt (37px) row height.
const HEADER_GROUP: Record<ColumnGroup, { fill: string; bold: boolean; valign: string }> = {
  input: { fill: '#FF9900', bold: true, valign: 'align-middle' },
  freight: { fill: '#00FF00', bold: false, valign: 'align-bottom' },
  calc: { fill: '#FF0000', bold: false, valign: 'align-bottom' },
  output: { fill: '#00FFFF', bold: false, valign: 'align-bottom' },
  // App-added profit layer - not part of the Excel sheet, so it gets its own
  // (non-Excel) indigo tint rather than borrowing a sheet color.
  profit: { fill: '#E0E7FF', bold: false, valign: 'align-bottom' },
}

const HEADER_FONT = "Arial, 'Helvetica Neue', sans-serif"

function WorksheetColumnHeaders({ columns }: WorksheetColumnHeadersProps) {
  return (
    <thead>
      {/* Column-letter gutter row, Excel-style app chrome (not part of A2:M2) */}
      <tr>
        <th className="sticky top-0 left-0 z-30 h-6 border-r border-b border-slate-300 bg-slate-100" />
        {columns.map((column) => (
          <th
            key={column.letter}
            className="sticky top-0 z-20 h-6 border-r border-b border-slate-300 bg-slate-100 text-center text-[11px] font-normal text-slate-400"
          >
            {column.letter}
          </th>
        ))}
        <th className="sticky top-0 z-20 h-6 border-b border-slate-300 bg-slate-100" />
      </tr>
      {/* Excel row 2 - the actual column headers */}
      <tr>
        <th className="sticky top-6 left-0 z-30 h-[37px] border-r border-b border-slate-300 bg-slate-100 text-[11px] font-normal text-slate-400">
          #
        </th>
        {columns.map((column) => {
          const group = HEADER_GROUP[column.group]
          return (
            <th
              key={column.letter}
              style={{ backgroundColor: group.fill, fontFamily: HEADER_FONT }}
              className={`sticky top-6 z-20 h-[37px] border-r border-b border-black px-0.5 text-center text-[10pt] leading-tight tracking-[-0.04em] text-[#333333] ${group.valign} ${
                group.bold ? 'font-bold' : 'font-normal'
              }`}
            >
              {column.label}
            </th>
          )
        })}
        <th className="sticky top-6 z-20 h-[37px] border-b border-slate-300 bg-slate-100" />
      </tr>
    </thead>
  )
}

export default WorksheetColumnHeaders
