// Подтверждения отсутствия приёма. Это отдельный тип данных: не запись о приёме,
// не событие и не нулевое количество.

export type AbsenceScope = 'substance' | 'all'

export type Absence = {
  id: string
  /** Локальный календарный день, YYYY-MM-DD. */
  date: string
  /** Вещество, к которому относится отметка. */
  substanceId: string
  /** Как отметка была создана: для одного вещества или командой «Ни одного вещества». */
  scope: AbsenceScope
  createdAt: string
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function dayKeyOfDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export function dayKeyOfIso(iso: string): string {
  return dayKeyOfDate(new Date(iso))
}

export const absenceKey = (date: string, substanceId: string) => `${date}|${substanceId}`

/** Приводит «сырые» данные к списку отметок без дубликатов (по дате и веществу остаётся самая ранняя). */
export function normalizeAbsences(
  raw: unknown,
  canonicalizeId: (id: string) => string,
  makeId: () => string,
): Absence[] {
  if (!Array.isArray(raw)) return []
  const byKey = new Map<string, Absence>()
  const usedIds = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    if (!isValidDayKey(r.date) || typeof r.substanceId !== 'string' || !r.substanceId) continue
    const substanceId = canonicalizeId(r.substanceId)
    const createdValid = typeof r.createdAt === 'string' && !Number.isNaN(new Date(r.createdAt).getTime())
    const createdAt = createdValid ? (r.createdAt as string) : new Date(0).toISOString()
    const key = absenceKey(r.date, substanceId)
    const existing = byKey.get(key)
    if (existing && existing.createdAt <= createdAt) continue
    let id = typeof r.id === 'string' && r.id ? r.id : makeId()
    if (usedIds.has(id)) id = makeId()
    if (existing) usedIds.delete(existing.id)
    usedIds.add(id)
    byKey.set(key, { id, date: r.date, substanceId, scope: r.scope === 'all' ? 'all' : 'substance', createdAt })
  }
  return [...byKey.values()]
}
