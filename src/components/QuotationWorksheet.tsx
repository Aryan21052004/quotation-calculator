import { memo, useCallback, useMemo, useState } from 'react'
import type {
  CalculationSummary,
  CellValueKind,
  ColumnGroup,
  WorksheetColumn,
  WorksheetRowSeed,
} from '../types'
import {
  deleteCalculation,
  openCalculation,
  saveCalculation,
  searchCalculations,
  updateCalculation,
} from '../services'
import SearchInput from './SearchInput'
import { excelCoerceNumber } from '../utils/quotationFormulas'
import {
  calculateCostRollup,
  formatGeneral,
  formatTwoDecimals,
  type CellResult,
  type CostRollupResults,
} from '../utils/costRollupFormulas'
import {
  PROFIT_RATE_OPTIONS,
  calculateProfitTotals,
  calculateSellingPrice,
  type ProfitRate,
} from '../utils/profitFormulas'
import WorksheetColumnHeaders from './WorksheetColumnHeaders'
import WorksheetCellInput from './WorksheetCellInput'
import WorksheetCellSelect from './WorksheetCellSelect'
import WorksheetCalculatedCell from './WorksheetCalculatedCell'

type ColumnKind = 'sn' | 'text' | 'number' | 'select' | 'formula'
/** Editable columns map 1:1 to the persisted row-seed fields (minus S/N). */
type EditableField = keyof Omit<WorksheetRowSeed, 'sn'>

interface WorksheetRow extends WorksheetRowSeed {
  id: string
}

interface ColumnDef extends WorksheetColumn {
  hideable: boolean
  kind: ColumnKind
  field?: EditableField
  inputKind?: CellValueKind
  alignRight?: boolean
}

// Part condition choices. The original sheet only ever held "NEW" (free
// text, no validation); OLD added by request.
const CONDITION_OPTIONS = ['', 'NEW', 'OLD']

// Mirrors the OLD DONT USE sheet: A-F identification/input, G-H freight,
// I-K hidden calculated columns, L-M totals. Formula columns render as
// static placeholders only - no calculation logic is implemented here.
// Widths are the sheet's own column widths converted to px (chars x 7 + 5).
const COLUMNS: ColumnDef[] = [
  { letter: 'A', label: 'S/N', width: 47, group: 'input', hideable: false, kind: 'sn' },
  {
    letter: 'B',
    label: 'PART NUMBER',
    width: 134,
    group: 'input',
    hideable: false,
    kind: 'text',
    field: 'partNumber',
    inputKind: 'text',
  },
  {
    letter: 'C',
    label: 'MOQ',
    width: 67,
    group: 'input',
    hideable: false,
    kind: 'number',
    field: 'moq',
    inputKind: 'integer',
    alignRight: true,
  },
  {
    letter: 'D',
    label: 'CONDITION',
    width: 88,
    group: 'input',
    hideable: false,
    kind: 'select',
    field: 'condition',
  },
  {
    letter: 'E',
    label: 'UNIT PRICE EA(USD)',
    width: 125,
    group: 'input',
    hideable: false,
    kind: 'number',
    field: 'unitPrice',
    inputKind: 'decimal',
    alignRight: true,
  },
  {
    letter: 'F',
    label: 'LEAD TIME',
    width: 138,
    group: 'input',
    hideable: false,
    kind: 'text',
    field: 'leadTime',
    inputKind: 'currency',
  },
  {
    letter: 'G',
    label: 'FREIGHT IN USD',
    width: 65,
    group: 'freight',
    hideable: false,
    kind: 'number',
    field: 'freight',
    inputKind: 'decimal',
    alignRight: true,
  },
  {
    letter: 'H',
    label: 'CLEARANCE AND FOREX CHARGES',
    width: 71,
    group: 'freight',
    hideable: true,
    kind: 'number',
    field: 'clearance',
    inputKind: 'decimal',
    alignRight: true,
  },
  { letter: 'I', label: 'LINE VALUE', width: 79, group: 'calc', hideable: true, kind: 'formula' },
  { letter: 'J', label: 'CUSTOM DUTY', width: 98, group: 'calc', hideable: true, kind: 'formula' },
  {
    letter: 'K',
    label: 'LANDING COST IN USD',
    width: 72,
    group: 'calc',
    hideable: true,
    kind: 'formula',
  },
  {
    letter: 'L',
    label: 'TOTAL IN USD',
    width: 75,
    group: 'output',
    hideable: true,
    kind: 'formula',
  },
  {
    letter: 'M',
    label: 'UNIT COST IN USD',
    width: 74,
    group: 'output',
    hideable: false,
    kind: 'formula',
  },
  // App-added (not in the Excel sheet): the final quoted price per unit,
  // with the selected profit share already included.
  {
    letter: 'N',
    label: 'FINAL PRICE EA (USD)',
    width: 110,
    group: 'profit',
    hideable: false,
    kind: 'formula',
  },
]

// Body-cell chrome per column group. Input/freight columns keep the app's
// soft tints; the calculated columns (Section 4, I3:M85) carry the sheet's
// exact solid fills (#FF0000 for I-K, #00FFFF for L-M) and thin black
// borders, uniform across all 83 rows in the workbook.
const CELL_TD_STYLES: Record<ColumnGroup, string> = {
  input: 'border-slate-200 bg-amber-50/50',
  freight: 'border-slate-200 bg-emerald-50/50',
  calc: 'border-black bg-[#FF0000]',
  output: 'border-black bg-[#00FFFF]',
  profit: 'border-slate-300 bg-indigo-50',
}

let rowIdCounter = 0
function makeRow(sn: number, seed: Partial<WorksheetRow> = {}): WorksheetRow {
  rowIdCounter += 1
  return {
    id: `row-${rowIdCounter}`,
    sn,
    partNumber: '',
    moq: '',
    condition: '',
    unitPrice: '',
    leadTime: '',
    freight: '',
    clearance: '',
    ...seed,
  }
}

// Freight defaults exactly as the sheet's G column holds them, by S/N
// (sheet row = S/N + 2): 100 / 110 / 400 / 120 / 150 tiers.
function freightForSn(sn: number): string {
  if (sn <= 13) return '100'
  if (sn <= 24) return '110'
  if (sn === 25) return '400'
  if (sn === 26) return '110'
  if (sn === 27) return '120'
  if (sn <= 32) return '110'
  if (sn === 33) return '150'
  if (sn <= 38) return '100'
  return '110'
}

// D column as the sheet has it: "NEW" for S/N 1-33 and 36-38, "New"
// (normalized to "NEW") for S/N 63-83, blank for the rest.
function conditionForSn(sn: number): string {
  if (sn <= 33 || (sn >= 36 && sn <= 38) || sn >= 63) return 'NEW'
  return ''
}

// The sheet's populated line items. (The original workbook had a stray
// formula in S/N 2's unit price cell, =E3*98 - an old currency-conversion
// leftover; removed by request, so that cell is a normal input now.)
const DETAIL_SEEDS: Record<number, Partial<WorksheetRow>> = {
  1: { partNumber: 'NAS1149DN316J', moq: '200', unitPrice: '0.91', leadTime: '0.27' },
  4: { moq: '5' },
  36: { partNumber: '3B1078-17', moq: '4', unitPrice: '430.82', leadTime: '$ 242.70' },
  37: { partNumber: '3B1078-15', moq: '8', unitPrice: '93.01', leadTime: '$ 53.06' },
  38: { partNumber: '3B1067-9P', moq: '2', unitPrice: '705.86', leadTime: '$ 382.58' },
}

// All 83 data rows (sheet rows 3-85), seeded cell-for-cell from the workbook;
// the H column is 0 on every sheet row.
const INITIAL_ROWS: WorksheetRow[] = Array.from({ length: 83 }, (_, index) => {
  const sn = index + 1
  return makeRow(sn, {
    condition: conditionForSn(sn),
    freight: freightForSn(sn),
    clearance: '0',
    ...DETAIL_SEEDS[sn],
  })
})

function QuotationWorksheet() {
  const [rows, setRows] = useState<WorksheetRow[]>(INITIAL_ROWS)
  const [showHidden, setShowHidden] = useState(false)
  const [profitRate, setProfitRate] = useState<ProfitRate>(0.4)

  // Saved-calculation state: which stored calculation (if any) is open,
  // its name, and the open/search panel.
  const [calcId, setCalcId] = useState<string | null>(null)
  const [calcName, setCalcName] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [summaries, setSummaries] = useState<CalculationSummary[]>([])
  const [statusMessage, setStatusMessage] = useState('')

  function rowSeeds(): WorksheetRowSeed[] {
    return rows.map((row) => ({
      sn: row.sn,
      partNumber: row.partNumber,
      moq: row.moq,
      condition: row.condition,
      unitPrice: row.unitPrice,
      leadTime: row.leadTime,
      freight: row.freight,
      clearance: row.clearance,
    }))
  }

  async function refreshList(query: string) {
    try {
      setSummaries(await searchCalculations(query))
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Search failed')
    }
  }

  async function handleSave(asNew: boolean) {
    const name = calcName.trim()
    if (name === '') {
      setStatusMessage('Enter a calculation name before saving')
      return
    }
    try {
      if (!asNew && calcId) {
        await updateCalculation(calcId, name, profitRate, rowSeeds())
        setStatusMessage(`Updated "${name}"`)
      } else {
        const id = await saveCalculation(name, profitRate, rowSeeds())
        setCalcId(id)
        setStatusMessage(`Saved "${name}"`)
      }
      if (panelOpen) void refreshList(searchQuery)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Save failed')
    }
  }

  async function handleOpen(id: string) {
    try {
      const calc = await openCalculation(id)
      setRows(calc.rows.map((seed) => makeRow(seed.sn, seed)))
      const storedRate = PROFIT_RATE_OPTIONS.find((rate) => rate === calc.profitRate)
      setProfitRate(storedRate ?? 0.4)
      setCalcId(calc.id)
      setCalcName(calc.name)
      setPanelOpen(false)
      setStatusMessage(`Opened "${calc.name}"`)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Open failed')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" permanently?`)) return
    try {
      await deleteCalculation(id)
      if (id === calcId) setCalcId(null)
      setStatusMessage(`Deleted "${name}"`)
      void refreshList(searchQuery)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  function togglePanel() {
    const next = !panelOpen
    setPanelOpen(next)
    if (next) void refreshList(searchQuery)
  }

  function handleSearchChange(query: string) {
    setSearchQuery(query)
    void refreshList(query)
  }

  // One rollup per row, computed once and shared by the row's cells AND the
  // totals below - never twice. Row objects are immutable (updateField
  // replaces only the edited row's object), so a WeakMap keyed by row
  // identity hands every untouched row its cached, identity-stable result -
  // its memoized <tr> skips re-rendering - and only edited rows compute.
  const [rollupCache] = useState(() => new WeakMap<WorksheetRow, CostRollupResults>())
  const rowRollups = rows.map((row) => {
    let result = rollupCache.get(row)
    if (!result) {
      result = calculateCostRollup({
        moq: row.moq,
        rate: row.leadTime,
        freight: row.freight,
        clearance: row.clearance,
      })
      rollupCache.set(row, result)
    }
    return result
  })

  // Totals over priced line items, straight from the same rollup results.
  const totals = calculateProfitTotals(
    rows.map((row, index) => ({
      moqRaw: excelCoerceNumber(row.moq),
      totalUsd: rowRollups[index].totalUsd,
      unitCost: rowRollups[index].unitCost,
    })),
    profitRate,
  )

  const visibleColumns = useMemo(
    () => COLUMNS.filter((column) => showHidden || !column.hideable),
    [showHidden],
  )
  // Fixed table layout only honors the exact colgroup widths when the table
  // itself has an explicit width (otherwise it compresses to the container).
  const tableWidth = 44 + visibleColumns.reduce((sum, column) => sum + column.width, 0) + 36

  function addRow() {
    const nextSn = rows.reduce((max, row) => Math.max(max, row.sn), 0) + 1
    setRows((prev) => [...prev, makeRow(nextSn)])
  }

  // Stable callbacks so memoized rows only re-render when their own data
  // changes (updateField preserves the identity of untouched row objects).
  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
  }, [])

  const updateField = useCallback((id: string, field: EditableField, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }, [])

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-soft">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
        >
          + Add row
        </button>
        <button
          type="button"
          onClick={() => setShowHidden((value) => !value)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
        >
          {showHidden ? 'Hide columns H–L' : 'Show columns H–L'}
        </button>
        <div className="flex items-center gap-1" role="group" aria-label="Profit rate">
          <span className="mr-1 text-xs font-medium text-slate-500">Profit</span>
          {PROFIT_RATE_OPTIONS.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setProfitRate(rate)}
              aria-pressed={profitRate === rate}
              className={`rounded border px-2.5 py-1.5 text-xs font-medium shadow-sm ${
                profitRate === rate
                  ? 'border-indigo-400 bg-indigo-100 text-indigo-900'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {rate * 100}%
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">{rows.length} line items</span>
      </div>

      {/* Saved calculations: save / open / update / delete / search */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <input
          type="text"
          value={calcName}
          onChange={(event) => setCalcName(event.target.value)}
          placeholder="Calculation name"
          aria-label="Calculation name"
          className="w-48 rounded border border-slate-300 px-2 py-1.5 text-xs text-primary placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handleSave(false)}
          className="rounded border border-sky-600 bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700"
        >
          {calcId ? 'Update' : 'Save'}
        </button>
        {calcId && (
          <button
            type="button"
            onClick={() => void handleSave(true)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Save as copy
          </button>
        )}
        <button
          type="button"
          onClick={togglePanel}
          aria-expanded={panelOpen}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
        >
          {panelOpen ? 'Close list' : 'Open…'}
        </button>
        {statusMessage && (
          <span role="status" className="ml-auto text-xs text-slate-500">
            {statusMessage}
          </span>
        )}
      </div>

      {panelOpen && (
        <div className="border-b border-slate-200 bg-slate-50/60 px-3 py-2">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search calculations by name…"
            ariaLabel="Search calculations"
          />
          <ul className="mt-2 max-h-48 divide-y divide-slate-100 overflow-auto">
            {summaries.map((summary) => (
              <li key={summary.id} className="flex items-center gap-3 py-1.5">
                <button
                  type="button"
                  onClick={() => void handleOpen(summary.id)}
                  className="truncate text-left text-sm text-sky-700 hover:underline"
                >
                  {summary.name}
                </button>
                <span className="ml-auto shrink-0 text-xs text-slate-400">
                  {new Date(summary.updatedAt).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(summary.id, summary.name)}
                  aria-label={`Delete ${summary.name}`}
                  className="shrink-0 text-slate-300 hover:text-rose-500"
                >
                  ×
                </button>
              </li>
            ))}
            {summaries.length === 0 && (
              <li className="py-2 text-xs text-slate-400">No calculations found.</li>
            )}
          </ul>
        </div>
      )}

      {/* Worksheet grid */}
      <div className="max-h-[70vh] overflow-auto">
        <table
          style={{ width: tableWidth }}
          className="table-fixed border-separate border-spacing-0 text-[13px]"
        >
          <colgroup>
            <col style={{ width: 44 }} />
            {visibleColumns.map((column) => (
              <col key={column.letter} style={{ width: column.width }} />
            ))}
            <col style={{ width: 36 }} />
          </colgroup>
          <WorksheetColumnHeaders columns={visibleColumns} />
          <tbody>
            {rows.map((row, index) => (
              <WorksheetBodyRow
                key={row.id}
                row={row}
                index={index}
                columns={visibleColumns}
                updateField={updateField}
                removeRow={removeRow}
                rollup={rowRollups[index]}
                profitRate={profitRate}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Profit totals across priced line items at the selected rate */}
      <div
        aria-live="polite"
        className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 border-t border-slate-200 bg-indigo-50/70 px-3 py-2 text-xs text-slate-700"
      >
        <span className="mr-auto text-slate-500">
          {totals.lineItemCount} priced line item{totals.lineItemCount === 1 ? '' : 's'} at{' '}
          {profitRate * 100}% profit
        </span>
        <span>
          Total Cost: <span className="font-medium">${totals.totalCost.toFixed(2)}</span>
        </span>
        <span>
          Total Profit: <span className="font-medium">${totals.totalProfit.toFixed(2)}</span>
        </span>
        <span className="font-semibold text-indigo-900">
          Grand Total: ${totals.grandTotal.toFixed(2)}
        </span>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-400">
        Calculated columns follow the sheet's I → J → K → L → M formula chain; the final price
        includes the selected profit share.
      </div>
    </div>
  )
}

interface WorksheetBodyRowProps {
  row: WorksheetRow
  index: number
  columns: ColumnDef[]
  updateField: (id: string, field: EditableField, value: string) => void
  removeRow: (id: string) => void
  /** The row's Section 4 chain, computed once by the parent's cache. */
  rollup: CostRollupResults
  profitRate: ProfitRate
}

// Memoized like Excel's dirty-cell recalc: a row re-renders only when its own
// data, its rollup, or the profit rate changes. The rollup arrives from the
// parent's identity-stable cache (shared with the totals), so nothing is
// computed twice; the profit breakdown derives from it via the one engine.
const WorksheetBodyRow = memo(function WorksheetBodyRow({
  row,
  index,
  columns,
  updateField,
  removeRow,
  rollup,
  profitRate,
}: WorksheetBodyRowProps) {
  // The final quoted price per unit - profit share already included.
  const finalPrice = calculateSellingPrice(rollup.unitCost, profitRate)

  return (
    <tr className={index % 2 === 1 ? 'bg-slate-50/60' : undefined}>
      <td className="sticky left-0 z-10 border-r border-b border-slate-200 bg-slate-100 text-center text-[11px] leading-[20px] text-slate-400">
        {index + 1}
      </td>
      {columns.map((column) => (
        <td key={column.letter} className={`border-r border-b p-0 ${CELL_TD_STYLES[column.group]}`}>
          {renderCell(column, row, updateField, rollup, finalPrice, profitRate)}
        </td>
      ))}
      <td className="border-b border-slate-200 text-center">
        <button
          type="button"
          onClick={() => removeRow(row.id)}
          aria-label={`Remove row ${index + 1}`}
          className="text-slate-300 hover:text-rose-500"
        >
          ×
        </button>
      </td>
    </tr>
  )
})

function renderCell(
  column: ColumnDef,
  row: WorksheetRow,
  updateField: (id: string, field: EditableField, value: string) => void,
  rollup: CostRollupResults,
  finalPrice: CellResult,
  profitRate: ProfitRate,
) {
  if (column.kind === 'sn') {
    return (
      <div className="h-[20px] px-1 text-center text-[13px] leading-[20px] text-slate-500">
        {row.sn}
      </div>
    )
  }

  if (column.kind === 'formula') {
    // Sheet row = S/N + 2. Columns I-L carry Excel's General format; M is
    // 0.00. N is the final quoted price with the profit share included.
    const sheetRow = row.sn + 2
    const pct = `${profitRate * 100}%`
    const formulaCell: Record<string, { value: string; formula: string }> = {
      I: { value: formatGeneral(rollup.lineValue), formula: `=C${sheetRow}*F${sheetRow}` },
      J: { value: formatGeneral(rollup.customDuty), formula: `=I${sheetRow}/2` },
      K: {
        value: formatGeneral(rollup.landingCost),
        formula: `=G${sheetRow}+H${sheetRow}+I${sheetRow}+J${sheetRow}`,
      },
      L: { value: formatGeneral(rollup.totalUsd), formula: `=K${sheetRow}*1.01` },
      M: { value: formatTwoDecimals(rollup.unitCost), formula: `=L${sheetRow}/C${sheetRow}` },
      N: {
        value: formatTwoDecimals(finalPrice),
        formula: `Unit Cost ÷ (1 − ${pct}) — includes ${pct} profit`,
      },
    }
    const cell = formulaCell[column.letter]
    const isProfitColumn = column.group === 'profit'
    return (
      <WorksheetCalculatedCell
        value={cell.value}
        ariaLabel={`${column.label} row ${row.sn}, calculated`}
        title={
          isProfitColumn
            ? `${column.label}: ${cell.formula}`
            : `Excel ${column.letter}${sheetRow}: ${cell.formula}`
        }
      />
    )
  }

  if (column.kind === 'select') {
    return (
      <WorksheetCellSelect
        value={row.condition}
        onChange={(value) => updateField(row.id, 'condition', value)}
        options={CONDITION_OPTIONS}
        ariaLabel={`${column.label} row ${row.sn}`}
      />
    )
  }

  const field = column.field as EditableField
  return (
    <WorksheetCellInput
      value={row[field]}
      onChange={(value) => updateField(row.id, field, value)}
      kind={column.inputKind ?? 'text'}
      align={column.alignRight ? 'right' : 'left'}
      ariaLabel={`${column.label} row ${row.sn}`}
    />
  )
}

export default QuotationWorksheet
