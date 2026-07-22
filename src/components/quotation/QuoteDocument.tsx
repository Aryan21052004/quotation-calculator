import {
  calculatePricingBreakdown,
  isError,
  type PricingCore,
  type PricingTotals,
  type ProfitRate,
} from '../../utils/pricingFormulas'
import {
  convertForDisplay,
  currencySymbol,
  type CurrencyDisplay,
} from '../../utils/exchangeRate'
import Logo from '../Logo'
import type { WorksheetRow } from './types'

interface QuoteDocumentProps {
  quoteName: string
  items: { row: WorksheetRow; core: PricingCore }[]
  profitRate: ProfitRate
  totals: PricingTotals
  display: CurrencyDisplay
}

/**
 * Customer-facing quotation, rendered only when printing (the "Download
 * PDF" button opens the browser's print dialog). Shows final prices only -
 * no costs, freight internals, or profit margin ever appear here.
 */
function QuoteDocument({ quoteName, items, profitRate, totals, display }: QuoteDocumentProps) {
  const issuedOn = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  // Prices are calculated in USD as always; when INR is selected they are
  // converted for display with the applied (live + markup) exchange rate.
  const ccy = display.currency
  const symbol = currencySymbol(display)

  // Only lines a customer should see: anything identified or priced.
  const visibleItems = items
    .map(({ row, core }) => ({ row, core, pricing: calculatePricingBreakdown(core, profitRate) }))
    .filter(({ row, pricing }) => row.partNumber.trim() !== '' || !isError(pricing.finalPrice))

  return (
    <div className="bg-white p-2 text-primary">
      <header className="flex items-start justify-between border-b-2 border-primary pb-6">
        <div className="flex items-center gap-3">
          <Logo className="h-11 w-11" />
          <div>
            <p className="text-xl font-bold tracking-tight">Aryan Aviation and Air Part</p>
            <p className="text-xs text-slate-500">Aviation parts &amp; services</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight uppercase">Quotation</p>
          <p className="mt-1 text-sm text-slate-500">{quoteName.trim() || 'Untitled quotation'}</p>
          <p className="text-sm text-slate-500">{issuedOn}</p>
        </div>
      </header>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs tracking-wide text-slate-500 uppercase">
            <th className="py-2 pr-3 font-semibold">#</th>
            <th className="py-2 pr-3 font-semibold">Part number</th>
            <th className="py-2 pr-3 font-semibold">Condition</th>
            <th className="py-2 pr-3 text-right font-semibold">Qty</th>
            <th className="py-2 pr-3 font-semibold">Lead time</th>
            <th className="py-2 pr-3 text-right font-semibold">Unit price ({ccy})</th>
            <th className="py-2 text-right font-semibold">Amount ({ccy})</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map(({ row, core, pricing }, index) => {
            const priced =
              !isError(pricing.lineTotal) && typeof core.moq === 'number' && core.moq > 0
            return (
              <tr key={row.id} className="border-b border-slate-200">
                <td className="py-2.5 pr-3 text-slate-400">{index + 1}</td>
                <td className="py-2.5 pr-3 font-medium">
                  {row.partNumber || '—'}
                  {row.description.trim() !== '' && (
                    <span className="block text-xs font-normal text-slate-500">
                      {row.description}
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3">{row.condition || '—'}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {row.moq !== '' ? row.moq : '—'}
                </td>
                {/* Storage names are interchanged: `unitPrice` holds the lead time. */}
                <td className="py-2.5 pr-3">{row.unitPrice !== '' ? row.unitPrice : '—'}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {isError(pricing.finalPrice)
                    ? '—'
                    : `${symbol}${(convertForDisplay(pricing.finalPrice, display) as number).toFixed(2)}`}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums">
                  {priced
                    ? `${symbol}${(convertForDisplay(pricing.lineTotal, display) as number).toFixed(2)}`
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} />
            <td className="py-3 pr-3 text-right text-sm font-bold uppercase">Total</td>
            <td className="py-3 text-right text-base font-bold tabular-nums">
              {symbol}
              {(convertForDisplay(totals.grandTotal, display) as number).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default QuoteDocument
