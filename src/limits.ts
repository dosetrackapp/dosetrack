import { clean, compatible, toBase } from './units'

// Пользовательские лимиты. Это только число, с которым приложение сравнивает записанные количества.
// Приложение не предлагает значений и не оценивает их.

export type LimitType = 'event' | 'day' | 'week'
export type LimitValue = { value: number; unit: string }
export type SubstanceLimits = Partial<Record<LimitType, LimitValue>>
export type LimitsMap = Record<string, SubstanceLimits>

export const LIMIT_TYPES: LimitType[] = ['event', 'day', 'week']
export const LIMIT_LABEL: Record<LimitType, string> = {
  event: 'На событие',
  day: 'На день',
  week: 'На неделю',
}

export type LimitState = 'normal' | 'near' | 'over'

export const STATE_LABEL: Record<Exclude<LimitState, 'normal'>, string> = {
  near: 'Лимит',
  over: 'Превышение лимита',
}

export function normalizeLimits(raw: unknown, canonicalizeId: (id: string) => string): LimitsMap {
  const result: LimitsMap = {}
  if (!raw || typeof raw !== 'object') return result
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const next: SubstanceLimits = {}
    for (const type of LIMIT_TYPES) {
      const item = (value as Record<string, unknown>)[type] as Record<string, unknown> | undefined
      if (
        item && typeof item.value === 'number' && Number.isFinite(item.value) && item.value > 0 &&
        typeof item.unit === 'string' && item.unit.trim()
      ) {
        next[type] = { value: item.value, unit: item.unit }
      }
    }
    if (Object.keys(next).length > 0) {
      const key = canonicalizeId(id)
      result[key] = { ...(result[key] ?? {}), ...next }
    }
  }
  return result
}

/** Состояние по доле от лимита: <95% — обычное, 95–100% включительно — «Лимит», >100% — превышение. */
export function stateOf(total: number, limit: LimitValue, entriesUnit?: string): LimitState {
  const t = entriesUnit ? toBase(total, entriesUnit) : total
  const l = toBase(limit.value, limit.unit)
  const ratio = clean(t / l)
  if (ratio > 1) return 'over'
  if (ratio >= 0.95) return 'near'
  return 'normal'
}

/** Целые проценты, согласованные с цветом: «Лимит» не показывается как 94%, превышение — как 100%. */
export function percentOf(totalBase: number, limitBase: number): number {
  const ratio = clean(totalBase / limitBase)
  let pct = Math.floor(ratio * 100 + 1e-9)
  if (ratio > 1 && pct <= 100) pct = 101
  return pct
}

export type LimitEntry = { amount: number | null; unit: string; unknown: boolean }

/** Количество в базовой единице лимита или null, если запись не участвует в расчёте. */
export function countedAmount(entry: LimitEntry, limit: LimitValue): number | null {
  if (entry.unknown || entry.amount === null || !Number.isFinite(entry.amount)) return null
  if (!compatible(entry.unit, limit.unit)) return null
  return toBase(entry.amount, entry.unit)
}

export function limitBase(limit: LimitValue): number {
  return toBase(limit.value, limit.unit)
}

export function stateOfBase(totalBase: number, limit: LimitValue): LimitState {
  const ratio = clean(totalBase / limitBase(limit))
  if (ratio > 1) return 'over'
  if (ratio >= 0.95) return 'near'
  return 'normal'
}

export const worse = (a: LimitState, b: LimitState): LimitState =>
  a === 'over' || b === 'over' ? 'over' : a === 'near' || b === 'near' ? 'near' : 'normal'
