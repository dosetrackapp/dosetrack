import { useSyncExternalStore } from 'react'

// Настройки отображения дат и времени. Хранятся только на этом устройстве.
// Сами записи всегда хранятся одинаково; настройки меняют только то, как дата выглядит на экране.

export type DateFormat = 'text' | 'dots' | 'iso'
export type TimeFormat = '24h' | '12h'

export type Settings = {
  dateFormat: DateFormat
  timeFormat: TimeFormat
}

const SETTINGS_KEY = 'dosetrack-settings-v1'
const DEFAULTS: Settings = { dateFormat: 'text', timeFormat: '24h' }

function load(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return {
      dateFormat: ['text', 'dots', 'iso'].includes(parsed?.dateFormat) ? parsed.dateFormat : DEFAULTS.dateFormat,
      timeFormat: ['24h', '12h'].includes(parsed?.timeFormat) ? parsed.timeFormat : DEFAULTS.timeFormat,
    }
  } catch {
    return DEFAULTS
  }
}

let current: Settings = load()
const listeners = new Set<() => void>()

export function getSettings(): Settings {
  return current
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current))
  } catch {
    // Если сохранить не удалось, настройка действует до закрытия приложения.
  }
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Подписка компонента на настройки: при смене формата экран перерисовывается. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings)
}

// ───────────────────────── Форматирование ─────────────────────────

const pad = (value: number) => String(value).padStart(2, '0')

export function formatTime(date: Date): string {
  const hours = date.getHours()
  const minutes = pad(date.getMinutes())
  if (current.timeFormat === '12h') {
    return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`
  }
  return `${pad(hours)}:${minutes}`
}

/** Полная дата: «22 нояб. 2026 г.» / «22.11.2026» / «2026-11-22». */
export function formatDateMedium(date: Date): string {
  if (current.dateFormat === 'dots') return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
  if (current.dateFormat === 'iso') return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(date: Date): string {
  const separator = current.dateFormat === 'iso' ? ' ' : ', '
  return `${formatDateMedium(date)}${separator}${formatTime(date)}`
}

/** Короткая дата (без года или с годом) для подписей графиков и диапазонов. */
export function formatDateShort(date: Date, withYear = false): string {
  if (current.dateFormat === 'dots') {
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}${withYear ? `.${date.getFullYear()}` : ''}`
  }
  if (current.dateFormat === 'iso') {
    return `${withYear ? `${date.getFullYear()}-` : ''}${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

/** Дата с днём недели: «вс, 22 ноября 2026 г.» / «вс, 22.11.2026» / «вс, 2026-11-22». */
export function formatDateLong(date: Date): string {
  const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short' })
  if (current.dateFormat === 'dots') return `${weekday}, ${formatDateMedium(date)}`
  if (current.dateFormat === 'iso') return `${weekday}, ${formatDateMedium(date)}`
  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Подпись на оси графика: «22.11» / «11-22». */
export function formatDateAxis(date: Date): string {
  if (current.dateFormat === 'iso') return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' })
}
