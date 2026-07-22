import type { CellValueKind } from '../../types'
import { validateCellValue } from '../../utils/worksheetValidation'
import {
  calculatePricingBreakdown,
  formatGeneral,
  formatTwoDecimals,
  isError,
  type CellResult,
  type PricingCore,
  type ProfitRate,
} from '../../utils/pricingFormulas'
import { convertForDisplay, type CurrencyDisplay } from '../../utils/exchangeRate'
import { Badge, FormField, SectionCard, SelectInput, TextArea, TextInput } from '../ui'
import type { EditableField, WorksheetRow } from './types'

// Part condition choices. The original sheet only ever held "NEW" (free
// text, no validation); the rest added by request.
const CONDITION_OPTIONS = ['', 'NEW', 'OH', 'SV', 'RE', 'INSP', 'NS']

interface LineItemEditorProps {
  row: WorksheetRow
  /** The row's pricing core, from the parent's identity-stable cache. */
  core: PricingCore
  profitRate: ProfitRate
  display: CurrencyDisplay
  onFieldChange: (id: string, field: EditableField, value: string) => void
}

/** Right panel: the selected line item edited through sectioned cards. */
function LineItemEditor({ row, core, profitRate, display, onFieldChange }: LineItemEditorProps) {
  const pct = `${profitRate * 100}%`
  const ccy = display.currency
  // Final price EA = ((MOQ × Unit price) + profit% + Freight) ÷ MOQ.
  // Calculated in USD as always; converted (applied rate) for display only.
  const { profitAmount, lineTotal, finalPrice } = calculatePricingBreakdown(core, profitRate)

  return (
    <div className="space-y-6">
      <SectionCard
        title="Part Information"
        subtitle="Identification details for this line item."
        action={<Badge tone="navy">Item #{row.sn}</Badge>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <EditableInput
            row={row}
            field="partNumber"
            label="Part number"
            kind="text"
            placeholder="e.g. NAS1149DN316J"
            onFieldChange={onFieldChange}
            className="sm:col-span-2"
          />
          <FormField
            label="Description"
            htmlFor={`item-${row.id}-description`}
            className="sm:col-span-2"
          >
            <TextArea
              id={`item-${row.id}-description`}
              value={row.description}
              placeholder="e.g. Washer, flat — cres, .164 ID × .312 OD"
              onChange={(event) => onFieldChange(row.id, 'description', event.target.value)}
            />
          </FormField>
          <FormField label="Condition" htmlFor={`item-${row.id}-condition`}>
            <SelectInput
              id={`item-${row.id}-condition`}
              options={CONDITION_OPTIONS}
              value={row.condition}
              onChange={(event) => onFieldChange(row.id, 'condition', event.target.value)}
            />
          </FormField>
          <EditableInput
            row={row}
            field="moq"
            label="MOQ"
            kind="integer"
            align="right"
            hint="Minimum order quantity"
            onFieldChange={onFieldChange}
          />
        </div>
      </SectionCard>

      <SectionCard title="Purchase & Freight" subtitle="Supplier pricing and shipping charges.">
        {/* Storage field names are interchanged (user confirmed): `leadTime`
            holds the unit price and `unitPrice` holds the lead time, so the
            labels here are swapped relative to the field names on purpose. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <EditableInput
            row={row}
            field="leadTime"
            label="Unit price EA (USD)"
            kind="currency"
            align="right"
            onFieldChange={onFieldChange}
          />
          <EditableInput
            row={row}
            field="unitPrice"
            label="Lead time"
            kind="text"
            onFieldChange={onFieldChange}
          />
          <EditableInput
            row={row}
            field="freight"
            label="Freight (USD)"
            kind="decimal"
            align="right"
            onFieldChange={onFieldChange}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Cost Breakdown"
        subtitle="Calculated automatically from your inputs."
        action={<Badge tone="sky">Live</Badge>}
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          <CalculatedTile
            label={`Line value (${ccy})`}
            result={convertForDisplay(core.lineValue, display)}
            format={formatGeneral}
            title="Line value = MOQ × Unit price"
          />
          <CalculatedTile
            label={`Profit (${pct})`}
            result={convertForDisplay(profitAmount, display)}
            format={formatTwoDecimals}
            title={`Profit = Line value × ${pct}`}
          />
          <CalculatedTile
            label={`Line total (${ccy})`}
            result={convertForDisplay(lineTotal, display)}
            format={formatTwoDecimals}
            title="Line total = Line value + Profit + Freight"
            emphasis
          />
          <div
            title={`Final price EA = Line total ÷ MOQ — includes ${pct} profit`}
            className="flex items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3"
          >
            <dt>
              <span className="block text-[13px] font-medium text-sky-200">
                Final price EA ({ccy})
              </span>
              <span className="block text-[11px] text-sky-200/70">Includes {pct} profit</span>
            </dt>
            <dd className="text-xl font-bold text-white tabular-nums">
              {formatTwoDecimals(convertForDisplay(finalPrice, display))}
            </dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  )
}

interface EditableInputProps {
  row: WorksheetRow
  field: EditableField
  label: string
  kind: CellValueKind
  align?: 'left' | 'right'
  placeholder?: string
  hint?: string
  className?: string
  onFieldChange: (id: string, field: EditableField, value: string) => void
}

// One editable field: same validation as before (raw text kept so the user
// can fix it), with the message shown inline instead of only in a tooltip.
function EditableInput({
  row,
  field,
  label,
  kind,
  align,
  placeholder,
  hint,
  className,
  onFieldChange,
}: EditableInputProps) {
  const value = row[field]
  const error = validateCellValue(kind, value)
  const id = `item-${row.id}-${field}`

  return (
    <FormField label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <TextInput
        id={id}
        value={value}
        invalid={error !== null}
        align={align}
        placeholder={placeholder}
        inputMode={kind === 'integer' || kind === 'decimal' ? 'decimal' : undefined}
        onChange={(event) => onFieldChange(row.id, field, event.target.value)}
      />
    </FormField>
  )
}

interface CalculatedTileProps {
  label: string
  result: CellResult
  format: (result: CellResult) => string
  title: string
  emphasis?: boolean
}

/** Read-only calculated value, styled clearly apart from editable inputs. */
function CalculatedTile({ label, result, format, title, emphasis = false }: CalculatedTileProps) {
  const errored = isError(result)
  return (
    <div
      title={title}
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${
        emphasis ? 'border-sky-100 bg-sky-50' : 'border-slate-200/70 bg-slate-50/80'
      }`}
    >
      <dt className={`text-[13px] ${emphasis ? 'font-medium text-sky-900' : 'text-slate-500'}`}>
        {label}
      </dt>
      <dd
        className={`text-sm font-semibold tabular-nums ${
          errored ? 'text-amber-600' : emphasis ? 'text-sky-900' : 'text-slate-700'
        }`}
      >
        {format(result)}
      </dd>
    </div>
  )
}

export default LineItemEditor
