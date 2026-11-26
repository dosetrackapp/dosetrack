// Объединение совместимых единиц измерения в аналитике.
// Работает только на уровне вычислений: сохранённые записи и их единицы не изменяются.

export const MASS_UNITS = ['мкг', 'мг', 'г'] as const
export type MassUnit = (typeof MASS_UNITS)[number]

// Коэффициенты перевода в базовую единицу — миллиграмм.
const MG_FACTOR: Record<MassUnit, number> = { мкг: 0.001, мг: 1, г: 1000 }

/** Ключ группы, в которую входят все массы. */
export const MASS_GROUP = '__mass__'

export function isMassUnit(unit: string): unit is MassUnit {
  return (MASS_UNITS as readonly string[]).includes(unit)
}

/** Убирает погрешность двоичной арифметики (0.1 + 0.2), не меняя значимых знаков. */
export function clean(value: number): number {
  return Math.round(value * 1e9) / 1e9
}

/** Переводит количество в базовую единицу группы: для массы — в мг, для остальных — без изменений. */
export function toBase(amount: number, unit: string): number {
  return isMassUnit(unit) ? clean(amount * MG_FACTOR[unit]) : amount
}

export function fromMg(valueMg: number, unit: MassUnit): number {
  return clean(valueMg / MG_FACTOR[unit])
}

/** Группа единицы: все массы — одна группа, любая другая единица (в том числе своя) — сама по себе. */
export function groupKey(unit: string): string {
  return isMassUnit(unit) ? MASS_GROUP : unit
}

/** Совместимы ли две единицы (можно ли сравнивать и суммировать). */
export function compatible(a: string, b: string): boolean {
  return groupKey(a) === groupKey(b)
}

/** Подпись группы по умолчанию (для немассовых — сама единица). */
export function groupLabel(key: string, display: MassUnit | null): string {
  return key === MASS_GROUP ? (display ?? 'мг') : key
}

/** Удобная единица для отображения массы по величине в мг. */
export function autoMassUnit(maxMg: number): MassUnit {
  if (maxMg >= 1000) return 'г'
  if (maxMg > 0 && maxMg < 1) return 'мкг'
  return 'мг'
}
