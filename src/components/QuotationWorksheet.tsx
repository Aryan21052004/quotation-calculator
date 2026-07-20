import { useCallback, useState } from 'react'
import type { CalculationSummary } from '../types'
import {
  deleteCalculation,
  openCalculation,
  saveCalculation,
  searchCalculations,
  updateCalculation,
} from '../services'
import { excelCoerceNumber } from '../utils/quotationFormulas'
import { calculateCostRollup, type CostRollupResults } from '../utils/costRollupFormulas'
import {
  PROFIT_RATE_OPTIONS,
  calculateProfitTotals,
  type ProfitRate,
} from '../utils/profitFormulas'
import QuotationDetailsCard from './quotation/QuotationDetailsCard'
import LineItemList from './quotation/LineItemList'
import LineItemEditor from './quotation/LineItemEditor'
import SummaryCard from './quotation/SummaryCard'
import QuoteDocument from './quotation/QuoteDocument'
import { SectionCard } from './ui'
import type { EditableField, WorksheetRow } from './quotation/types'

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

// The quotation starts with a single line item (workbook S/N 1,
// cell-for-cell); everything else is added by the user.
const INITIAL_ROWS: WorksheetRow[] = [
  makeRow(1, {
    partNumber: 'NAS1149DN316J',
    moq: '200',
    condition: 'NEW',
    unitPrice: '0.91',
    leadTime: '0.27',
    freight: '100',
    clearance: '0',
  }),
]

function QuotationWorksheet() {
  const [rows, setRows] = useState<WorksheetRow[]>(INITIAL_ROWS)
  const [profitRate, setProfitRate] = useState<ProfitRate>(0.4)
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_ROWS[0]?.id ?? null)

  // Saved-calculation state: which stored calculation (if any) is open,
  // its name, and the open/search panel.
  const [calcId, setCalcId] = useState<string | null>(null)
  const [calcName, setCalcName] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [summaries, setSummaries] = useState<CalculationSummary[]>([])
  const [statusMessage, setStatusMessage] = useState('')

  function rowSeeds() {
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
      const nextRows = calc.rows.map((seed) => makeRow(seed.sn, seed))
      setRows(nextRows)
      setSelectedId(nextRows[0]?.id ?? null)
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

  // One rollup per row, computed once and shared by the list, the editor AND
  // the totals - never twice. Row objects are immutable (updateField replaces
  // only the edited row's object), so a WeakMap keyed by row identity hands
  // every untouched row its cached, identity-stable result - its memoized
  // list row skips re-rendering - and only edited rows compute.
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

  // Derive the selection so a removed row falls back gracefully.
  const selectedRow = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null
  const selectedIndex = selectedRow ? rows.indexOf(selectedRow) : -1

  function addRow() {
    const nextSn = rows.reduce((max, row) => Math.max(max, row.sn), 0) + 1
    const row = makeRow(nextSn)
    setRows((prev) => [...prev, row])
    setSelectedId(row.id)
  }

  // Stable callbacks so memoized list rows only re-render when their own
  // data changes (updateField preserves the identity of untouched rows).
  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
    setSelectedId((current) => (current === id ? null : current))
  }, [])

  const updateField = useCallback((id: string, field: EditableField, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }, [])

  const selectRow = useCallback((id: string) => setSelectedId(id), [])

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Customer-facing quote: rendered only by the print dialog (the
          Download PDF button), with internals (costs, margin) excluded. */}
      <div className="hidden print:block">
        <QuoteDocument
          quoteName={calcName}
          items={rows.map((row, index) => ({ row, rollup: rowRollups[index] }))}
          profitRate={profitRate}
          totals={totals}
        />
      </div>

      <div className="space-y-6 print:hidden">
        <QuotationDetailsCard
          calcName={calcName}
          onCalcNameChange={setCalcName}
          hasOpenCalculation={calcId !== null}
          onSave={(asNew) => void handleSave(asNew)}
          panelOpen={panelOpen}
          onTogglePanel={togglePanel}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          summaries={summaries}
          onOpenCalculation={(id) => void handleOpen(id)}
          onDeleteCalculation={(id, name) => void handleDelete(id, name)}
          statusMessage={statusMessage}
          profitRate={profitRate}
          onProfitRateChange={setProfitRate}
          onDownloadPdf={() => window.print()}
        />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <LineItemList
            items={rows.map((row, index) => ({ row, rollup: rowRollups[index] }))}
            profitRate={profitRate}
            selectedId={selectedRow?.id ?? null}
            onSelect={selectRow}
            onRemove={removeRow}
            onAdd={addRow}
          />

          {selectedRow ? (
            <LineItemEditor
              row={selectedRow}
              rollup={rowRollups[selectedIndex]}
              profitRate={profitRate}
              onFieldChange={updateField}
            />
          ) : (
            <SectionCard title="No item selected">
              <p className="text-sm text-slate-500">
                Add a line item to start building this quotation.
              </p>
            </SectionCard>
          )}
        </div>

        <SummaryCard totals={totals} profitRate={profitRate} />
      </div>
    </div>
  )
}

export default QuotationWorksheet
