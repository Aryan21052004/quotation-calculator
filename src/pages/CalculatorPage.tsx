import { QuotationWorksheet } from '../components'

function CalculatorPage() {
  return (
    <div>
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Quotation Calculator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Build a quotation item by item — costs and totals update live.
        </p>
      </div>
      <QuotationWorksheet />
    </div>
  )
}

export default CalculatorPage
