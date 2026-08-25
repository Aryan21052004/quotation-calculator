import type { CalculationSummary } from '../../types'
import { PROFIT_RATE_OPTIONS, type ProfitRate } from '../../utils/pricingFormulas'
import SearchInput from '../SearchInput'
import { Badge, Button, FormField, SectionCard, Switch, TextInput } from '../ui'

interface QuotationDetailsCardProps {
  calcName: string
  onCalcNameChange: (name: string) => void
  /** Person preparing the quote; printed on the customer-facing document. */
  quotedBy: string
  onQuotedByChange: (name: string) => void
  /** True when a stored calculation is open (Save becomes Update). */
  hasOpenCalculation: boolean
  onSave: (asNew: boolean) => void
  panelOpen: boolean
  onTogglePanel: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  summaries: CalculationSummary[]
  onOpenCalculation: (id: string) => void
  onDeleteCalculation: (id: string, name: string) => void
  statusMessage: string
  profitRate: ProfitRate
  onProfitRateChange: (rate: ProfitRate) => void
  /** When on, the quote's payment term reads "Net 15 days" instead of "In advance". */
  net15Payment: boolean
  onNet15PaymentChange: (on: boolean) => void
  /** Opens the browser print dialog with the customer-facing quote. */
  onDownloadPdf: () => void
}

/** Top card: quotation name, profit margin, and the saved-calculation actions. */
function QuotationDetailsCard({
  calcName,
  onCalcNameChange,
  quotedBy,
  onQuotedByChange,
  hasOpenCalculation,
  onSave,
  panelOpen,
  onTogglePanel,
  searchQuery,
  onSearchChange,
  summaries,
  onOpenCalculation,
  onDeleteCalculation,
  statusMessage,
  profitRate,
  onProfitRateChange,
  net15Payment,
  onNet15PaymentChange,
  onDownloadPdf,
}: QuotationDetailsCardProps) {
  return (
    <SectionCard
      title="Quotation Details"
      subtitle="Name the quotation and choose your profit margin."
      action={
        statusMessage ? (
          <p role="status" className="text-sm text-slate-500">
            {statusMessage}
          </p>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <FormField label="Quotation name" htmlFor="quotation-name" className="w-full sm:w-72">
          <TextInput
            id="quotation-name"
            value={calcName}
            placeholder="Untitled quotation"
            onChange={(event) => onCalcNameChange(event.target.value)}
          />
        </FormField>

        <FormField label="Quoted by" htmlFor="quotation-quoted-by" className="w-full sm:w-56">
          <TextInput
            id="quotation-quoted-by"
            value={quotedBy}
            placeholder="e.g. Aryan"
            onChange={(event) => onQuotedByChange(event.target.value)}
          />
        </FormField>

        <div>
          <span className="block text-[13px] font-medium text-slate-600">Profit margin</span>
          <div
            role="group"
            aria-label="Profit margin"
            className="mt-1.5 inline-flex rounded-xl border border-slate-300 bg-white p-1 shadow-sm"
          >
            {PROFIT_RATE_OPTIONS.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => onProfitRateChange(rate)}
                aria-pressed={profitRate === rate}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none ${
                  profitRate === rate
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {rate * 100}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-[13px] font-medium text-slate-600">Payment terms</span>
          <label className="mt-1.5 flex h-[34px] cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-600">
            <Switch
              checked={net15Payment}
              onChange={onNet15PaymentChange}
              ariaLabel="Net 15 days payment terms"
            />
            {net15Payment ? 'Net 15 days' : 'In advance'}
          </label>
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => onSave(false)}>
            {hasOpenCalculation ? 'Update' : 'Save'}
          </Button>
          {hasOpenCalculation && <Button onClick={() => onSave(true)}>Save as copy</Button>}
          <Button
            onClick={onDownloadPdf}
            title="Opens your browser's print dialog — choose 'Save as PDF' to share the quote"
          >
            Download PDF
          </Button>
          <Button onClick={onTogglePanel} aria-expanded={panelOpen}>
            {panelOpen ? 'Close list' : 'Open…'}
          </Button>
        </div>
      </div>

      {panelOpen && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-primary">Saved calculations</h3>
            <Badge>{summaries.length}</Badge>
          </div>
          <div className="mt-2.5">
            <SearchInput
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search calculations by name…"
              ariaLabel="Search calculations"
            />
          </div>
          <ul className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
            {summaries.map((summary) => (
              <li
                key={summary.id}
                className="flex items-center gap-3 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white"
              >
                <button
                  type="button"
                  onClick={() => onOpenCalculation(summary.id)}
                  className="min-w-0 flex-1 truncate rounded text-left text-sm font-medium text-primary transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none"
                >
                  {summary.name}
                </button>
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(summary.updatedAt).toLocaleString()}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={`Delete ${summary.name}`}
                  onClick={() => onDeleteCalculation(summary.id, summary.name)}
                >
                  ×
                </Button>
              </li>
            ))}
            {summaries.length === 0 && (
              <li className="px-2.5 py-3 text-sm text-slate-400">No calculations found.</li>
            )}
          </ul>
        </div>
      )}
    </SectionCard>
  )
}

export default QuotationDetailsCard
