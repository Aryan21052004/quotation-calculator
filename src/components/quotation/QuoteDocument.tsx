import {
  calculatePricingBreakdown,
  isError,
  type PricingCore,
  type ProfitRate,
} from '../../utils/pricingFormulas'
import { convertForDisplay, currencySymbol, type CurrencyDisplay } from '../../utils/exchangeRate'
import Logo from '../Logo'
import type { WorksheetRow } from './types'

interface QuoteDocumentProps {
  quoteName: string
  /** Person who prepared the quote; omitted from the header when blank. */
  quotedBy: string
  items: { row: WorksheetRow; core: PricingCore }[]
  profitRate: ProfitRate
  display: CurrencyDisplay
  /**
   * When on (and an exchange rate exists), every price on the quote is shown
   * in both currencies: the selected one first, the other beneath it.
   */
  dualCurrency: boolean
}

/** Unit price and amount for one row in one currency, rounded so they multiply out. */
interface RowFigures {
  unitPrice: number
  amount: number
}

function roundedFigures(finalPriceUsd: number, qty: number, display: CurrencyDisplay): RowFigures {
  const unitPrice = Math.round((convertForDisplay(finalPriceUsd, display) as number) * 100) / 100
  const amount = Math.round(unitPrice * qty * 100) / 100
  return { unitPrice, amount }
}

/** Symbol + grouped digits: ₹1,02,010.40 (Indian lakh grouping) or $1,153.00. */
function formatMoney(value: number, display: CurrencyDisplay): string {
  const grouped = value.toLocaleString(display.currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${currencySymbol(display)}${grouped}`
}

/**
 * Customer-facing quotation, rendered only when printing (the "Download
 * PDF" button opens the browser's print dialog). Shows final prices only -
 * no costs, freight internals, or profit margin ever appear here.
 */
function QuoteDocument({
  quoteName,
  quotedBy,
  items,
  profitRate,
  display,
  dualCurrency,
}: QuoteDocumentProps) {
  const issuedOn = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  // Prices are calculated in USD as always; when INR is selected they are
  // converted for display with the applied (live + markup) exchange rate.
  // Dual-currency mode adds the other currency as a second line per figure.
  const secondary: CurrencyDisplay | null =
    dualCurrency && display.appliedRate !== null
      ? { currency: display.currency === 'INR' ? 'USD' : 'INR', appliedRate: display.appliedRate }
      : null
  const ccyLabel =
    secondary === null ? display.currency : `${display.currency} / ${secondary.currency}`

  // Only lines a customer should see: anything identified or priced.
  // The customer pays the unit price printed on the quote, so each amount is
  // rounded-unit-price × qty and the total sums those amounts - the document
  // must add up with the figures it shows, not the full-precision internals.
  // Each currency is rounded independently so it adds up in its own terms.
  const visibleItems = items
    .map(({ row, core }) => {
      const pricing = calculatePricingBreakdown(core, profitRate)
      let main: RowFigures | null = null
      let alt: RowFigures | null = null
      if (!isError(pricing.finalPrice) && typeof core.moq === 'number' && core.moq > 0) {
        main = roundedFigures(pricing.finalPrice, core.moq, display)
        if (secondary !== null) alt = roundedFigures(pricing.finalPrice, core.moq, secondary)
      }
      return { row, main, alt }
    })
    .filter(({ row, main }) => row.partNumber.trim() !== '' || main !== null)

  const grandTotal =
    Math.round(visibleItems.reduce((sum, { main }) => sum + (main?.amount ?? 0), 0) * 100) / 100
  const altGrandTotal =
    secondary === null
      ? null
      : Math.round(visibleItems.reduce((sum, { alt }) => sum + (alt?.amount ?? 0), 0) * 100) / 100

  return (
    <div className="bg-white p-2 text-primary">
      <header className="flex items-start justify-between border-b-2 border-primary pb-6">
        <div className="flex items-center gap-3">
          <Logo className="h-11 w-11" />
          <div>
            <p className="text-xl font-bold tracking-tight">Aryan Aviation and Air Part</p>
            <p className="text-xs text-slate-500">Aviation parts &amp; services</p>
            <p className="text-xs text-slate-500">409 Pocket 2, Dwarka Sector 19, Delhi 110075</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight uppercase">Quotation</p>
          <p className="mt-1 text-sm text-slate-500">{quoteName.trim() || 'Untitled quotation'}</p>
          <p className="text-sm text-slate-500">{issuedOn}</p>
          {quotedBy.trim() !== '' && (
            <p className="text-sm text-slate-500">Quoted by {quotedBy.trim()}</p>
          )}
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
            <th className="py-2 pr-3 text-right font-semibold">Unit price ({ccyLabel})</th>
            <th className="py-2 text-right font-semibold">Amount ({ccyLabel})</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map(({ row, main, alt }, index) => (
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
                {main === null ? '—' : formatMoney(main.unitPrice, display)}
                {alt !== null && secondary !== null && (
                  <span className="block text-xs text-slate-500">
                    {formatMoney(alt.unitPrice, secondary)}
                  </span>
                )}
              </td>
              <td className="py-2.5 text-right font-medium tabular-nums">
                {main === null ? '—' : formatMoney(main.amount, display)}
                {alt !== null && secondary !== null && (
                  <span className="block text-xs font-normal text-slate-500">
                    {formatMoney(alt.amount, secondary)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} />
            <td className="py-3 pr-3 text-right text-sm font-bold uppercase">Total</td>
            <td className="py-3 text-right text-base font-bold tabular-nums">
              {formatMoney(grandTotal, display)}
              {altGrandTotal !== null && secondary !== null && (
                <span className="block text-sm font-semibold text-slate-500">
                  {formatMoney(altGrandTotal, secondary)}
                </span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>

      <section className="mt-8 border-t border-slate-300 pt-4">
        <h2 className="text-xs font-semibold tracking-wide uppercase">Terms &amp; Conditions</h2>
        <ol className="mt-2 space-y-1 text-sm text-slate-600">
          <li>1. Payment: In advance</li>
          <li>2. Cost: Ex-Delhi (India)</li>
          <li>3. Quote validity: 10 days subject to stock availability</li>
        </ol>
      </section>
    </div>
  )
}

export default QuoteDocument
