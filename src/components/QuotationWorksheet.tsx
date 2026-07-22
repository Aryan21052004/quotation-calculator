import { useCallback, useMemo, useState } from 'react'
import type { CalculationSummary } from '../types'
import {
  deleteCalculation,
  openCalculation,
  saveCalculation,
  searchCalculations,
  updateCalculation,
} from '../services'
import {
  PROFIT_RATE_OPTIONS,
  calculatePricingCore,
  calculatePricingTotals,
  type PricingCore,
  type ProfitRate,
} from '../utils/pricingFormulas'
import type { CurrencyDisplay, DisplayCurrency } from '../utils/exchangeRate'
import { useExchangeRate } from '../hooks/useExchangeRate'
import ExchangeRateCard from './quotation/ExchangeRateCard'
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
    description: '',
    moq: '',
    condition: '',
    unitPrice: '',
    leadTime: '',
    freight: '',
    clearance: '',
    ...seed,
  }
}

// The quotation starts with a single empty line item; everything is
// entered by the user (the old sample row was removed by request).
// NOTE: the stored field names are historical and INTERCHANGED (user
// confirmed): `leadTime` holds the real unit price and `unitPrice` holds
// the lead time. Kept as-is so saved calculations still load; the UI and
// the pricing engine apply the swapped meaning.
const INITIAL_ROWS: WorksheetRow[] = [makeRow(1)]

function QuotationWorksheet() {
  const [rows, setRows] = useState<WorksheetRow[]>(INITIAL_ROWS)
  const [profitRate, setProfitRate] = useState<ProfitRate>(0.415)
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_ROWS[0]?.id ?? null)

  // Display currency. All pricing stays in USD; INR is a display-time
  // conversion with the applied (live + markup) exchange rate. INR only takes
  // effect once a rate is available; memoized so memoized list rows keep
  // identical props while the user types.
  const exchangeRate = useExchangeRate()
  const [currency, setCurrency] = useState<DisplayCurrency>('USD')
  const { appliedRate } = exchangeRate
  const display: CurrencyDisplay = useMemo(
    () => ({
      currency: currency === 'INR' && appliedRate !== null ? 'INR' : 'USD',
      appliedRate,
    }),
    [currency, appliedRate],
  )

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
      description: row.description,
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
      // Saves from before the +1.5pt change hold 0.4/0.5/0.6; snap any
      // stored value to the closest current option.
      const storedRate = PROFIT_RATE_OPTIONS.reduce((best, rate) =>
        Math.abs(rate - calc.profitRate) < Math.abs(best - calc.profitRate) ? rate : best,
      )
      setProfitRate(storedRate)
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

  // One pricing core per row (MOQ, line value, freight), computed once and
  // shared by the list, the editor AND the totals - never twice. Row objects
  // are immutable (updateField replaces only the edited row's object), so a
  // WeakMap keyed by row identity hands every untouched row its cached,
  // identity-stable result - its memoized list row skips re-rendering - and
  // only edited rows compute. Rate-dependent figures derive from the core.
  const [coreCache] = useState(() => new WeakMap<WorksheetRow, PricingCore>())
  const rowCores = rows.map((row) => {
    let result = coreCache.get(row)
    if (!result) {
      // Field names are interchanged in storage: `leadTime` is the unit price.
      result = calculatePricingCore({
        moq: row.moq,
        unitPrice: row.leadTime,
        freight: row.freight,
      })
      coreCache.set(row, result)
    }
    return result
  })

  // Totals over priced line items, straight from the same pricing cores.
  const totals = calculatePricingTotals(rowCores, profitRate)

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
          items={rows.map((row, index) => ({ row, core: rowCores[index] }))}
          profitRate={profitRate}
          totals={totals}
          display={display}
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

        <ExchangeRateCard rate={exchangeRate} currency={currency} onCurrencyChange={setCurrency} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <LineItemList
            items={rows.map((row, index) => ({ row, core: rowCores[index] }))}
            profitRate={profitRate}
            display={display}
            selectedId={selectedRow?.id ?? null}
            onSelect={selectRow}
            onRemove={removeRow}
            onAdd={addRow}
          />

          {selectedRow ? (
            <LineItemEditor
              row={selectedRow}
              core={rowCores[selectedIndex]}
              profitRate={profitRate}
              display={display}
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

        <SummaryCard totals={totals} profitRate={profitRate} display={display} />
      </div>
    </div>
  )
}

export default QuotationWorksheet
