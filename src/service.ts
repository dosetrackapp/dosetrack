import { useSyncExternalStore } from 'react'

// Служебные даты напоминания о резервной копии. Хранятся отдельно от журнала,
// не входят ни в JSON-, ни в TXT-выгрузку и не переносятся при импорте.

const SERVICE_KEY = 'dosetrack-service-v1'
const WEEK_MS = 7 * 24 * 3600 * 1000

type Service = {
  /** Последнее нажатие кнопки открытия раздела резервной копии (мс). */
  lastBackupOpenAt: number | null
  /** Последнее закрытие напоминания (мс). */
  reminderDismissedAt: number | null
  /** Когда приложение впервые запущено с этой функцией: точка отсчёта, пока копию не открывали. */
  firstSeenAt: number
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function persist(value: Service) {
  try {
    localStorage.setItem(SERVICE_KEY, JSON.stringify(value))
  } catch {
    // Без хранилища напоминание просто работает до закрытия приложения.
  }
}

function load(): Service {
  try {
    const raw = localStorage.getItem(SERVICE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        lastBackupOpenAt: num(p?.lastBackupOpenAt),
        reminderDismissedAt: num(p?.reminderDismissedAt),
        firstSeenAt: num(p?.firstSeenAt) ?? Date.now(),
      }
    }
  } catch {
    // Повреждённые служебные данные не должны мешать запуску.
  }
  const fresh: Service = { lastBackupOpenAt: null, reminderDismissedAt: null, firstSeenAt: Date.now() }
  persist(fresh)
  return fresh
}

let current = load()
const listeners = new Set<() => void>()

function update(patch: Partial<Service>) {
  current = { ...current, ...patch }
  persist(current)
  listeners.forEach(l => l())
}

export const markBackupOpened = () => update({ lastBackupOpenAt: Date.now() })
export const dismissBackupReminder = () => update({ reminderDismissedAt: Date.now() })

/** Нужно ли показывать напоминание. Чистая функция: удобно проверять. */
export function shouldRemind(s: Service, now: number): boolean {
  const ref = s.lastBackupOpenAt ?? s.firstSeenAt
  if (now - ref <= WEEK_MS) return false
  const d = s.reminderDismissedAt
  // Закрытие действует 7 дней, но только если оно было после последнего обращения к копии.
  if (d !== null && d > ref && now - d <= WEEK_MS) return false
  return true
}

export function getService(): Service {
  return current
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useService(): Service {
  return useSyncExternalStore(subscribe, getService)
}
