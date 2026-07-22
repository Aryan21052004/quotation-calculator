import { supabase } from './supabaseClient'
import type { CalculationSummary, SavedCalculation, WorksheetRowSeed } from '../types'

// CRUD + search for saved calculations. Only raw worksheet inputs and the
// selected profit rate are persisted; every calculated value is re-derived
// by the formula engine on load. Requires the table from supabase/schema.sql;
// row-level security scopes all reads/writes to the signed-in user.

const TABLE = 'calculations'

function fail(operation: string, message: string): never {
  throw new Error(`${operation} failed: ${message}`)
}

/** Coerce one stored jsonb row back into the app's raw-input shape. */
function toRowSeed(value: unknown, index: number): WorksheetRowSeed {
  const record = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >
  const text = (key: string) => (typeof record[key] === 'string' ? (record[key] as string) : '')
  return {
    sn: typeof record.sn === 'number' ? record.sn : index + 1,
    partNumber: text('partNumber'),
    // Rows saved before the field existed simply read back as ''.
    description: text('description'),
    moq: text('moq'),
    condition: text('condition'),
    unitPrice: text('unitPrice'),
    leadTime: text('leadTime'),
    freight: text('freight'),
    clearance: text('clearance'),
  }
}

/** Create a new calculation; returns its id. */
export async function saveCalculation(
  name: string,
  profitRate: number,
  rows: WorksheetRowSeed[],
  quotedBy: string,
): Promise<string> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ name: name.trim(), profit_rate: profitRate, rows, quoted_by: quotedBy.trim() })
    .select('id')
    .single()
  if (error) fail('Save', error.message)
  return data.id as string
}

/** Load one calculation in full. */
export async function openCalculation(id: string): Promise<SavedCalculation> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, profit_rate, quoted_by, rows')
    .eq('id', id)
    .single()
  if (error) fail('Open', error.message)
  const storedRows = Array.isArray(data.rows) ? data.rows : []
  return {
    id: data.id as string,
    name: data.name as string,
    profitRate: Number(data.profit_rate),
    quotedBy: typeof data.quoted_by === 'string' ? data.quoted_by : '',
    rows: storedRows.map(toRowSeed),
  }
}

/** Overwrite an existing calculation's name, rate, rows, and quoted-by. */
export async function updateCalculation(
  id: string,
  name: string,
  profitRate: number,
  rows: WorksheetRowSeed[],
  quotedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      name: name.trim(),
      profit_rate: profitRate,
      rows,
      quoted_by: quotedBy.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) fail('Update', error.message)
}

/** Delete a calculation permanently. */
export async function deleteCalculation(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) fail('Delete', error.message)
}

/**
 * List calculations, newest first, optionally filtered by a name search.
 * An empty query returns everything the user owns.
 */
export async function searchCalculations(query = ''): Promise<CalculationSummary[]> {
  let request = supabase
    .from(TABLE)
    .select('id, name, updated_at')
    .order('updated_at', { ascending: false })
  const trimmed = query.trim()
  if (trimmed !== '') {
    request = request.ilike('name', `%${trimmed}%`)
  }
  const { data, error } = await request
  if (error) fail('Search', error.message)
  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    updatedAt: row.updated_at as string,
  }))
}
