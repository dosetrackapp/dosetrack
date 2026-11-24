import { formatDateLong, formatDateTime, formatTime } from './settings'

// Резервная копия DoseTrack: выгрузка и восстановление данных.
// Всё происходит на устройстве: файл создаётся в браузере и никуда не отправляется.

export type BSubstance = {
  id: string
  name: string
  source: 'builtin' | 'custom'
  archived: boolean
}

export type BEntry = {
  id: string
  substanceId: string
  substanceName: string
  amount: number | null
  unit: string
  takenAt: string
  createdAt: string
  route: string
  form?: string
  comment: string
  approximate: boolean
  unknown: boolean
}

export type StoredShape = {
  substances: BSubstance[]
  entries: BEntry[]
  customRoutes: string[]
  customForms: string[]
  customUnits: string[]
  lastChoices: Record<string, { route: string; form: string }>
  lastUnitChoices: Record<string, string>
  deletedCustomRoutes: string[]
  deletedCustomForms: string[]
  deletedCustomUnits: string[]
}

const BACKUP_APP = 'DoseTrack'
const BACKUP_FORMAT_VERSION = 1

// ───────────────────────── Выгрузка ─────────────────────────

/** Формат для программы: полная копия, из которой можно восстановить журнал. */
export function buildBackupJson(data: StoredShape): string {
  return JSON.stringify(
    {
      app: BACKUP_APP,
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      entryCount: data.entries.length,
      data,
    },
    null,
    1,
  )
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fileStamp(): string {
  return dayKey(new Date())
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(value)
}

/** Формат для чтения человеком: простой текст по дням, новые сверху. */
export function buildReadableText(data: StoredShape): string {
  const nameById = new Map(data.substances.map(item => [item.id, item]))
  const sorted = [...data.entries].sort(
    (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime(),
  )

  const exported = formatDateTime(new Date())

  const lines: string[] = [
    'DoseTrack — журнал событий',
    `Выгружено: ${exported}`,
    `Записей: ${sorted.length}`,
    '',
    'Отсутствие записи не означает отсутствие приёма.',
    '',
  ]

  let currentDay = ''
  for (const entry of sorted) {
    const date = new Date(entry.takenAt)
    const key = dayKey(date)
    if (key !== currentDay) {
      currentDay = key
      lines.push(
        '',
        formatDateLong(date),
        '—'.repeat(24),
      )
    }

    const substance = nameById.get(entry.substanceId)
    const name = substance?.name ?? entry.substanceName ?? 'Без названия'
    const archived = substance?.archived ? ' (в архиве)' : ''

    let quantity: string
    if (entry.unknown || entry.amount === null) {
      quantity = 'количество неизвестно'
    } else {
      quantity = `${entry.approximate ? '≈ ' : ''}${formatNumber(entry.amount)} ${entry.unit}`
    }

    const details = [quantity, entry.route, entry.form].filter(Boolean).join(' · ')
    lines.push(`${formatTime(date)}  ${name}${archived} — ${details}`)
    if (entry.comment) lines.push(`       Комментарий: ${entry.comment.replace(/\s*\n\s*/g, ' ')}`)
  }

  return lines.join('\n').replace(/^\n+/, '') + '\n'
}

// ───────────────────────── Передача пользователю ─────────────────────────

export type DeliverResult = 'shared' | 'downloaded' | 'cancelled' | 'failed'

/** Пробует «Поделиться» (системное меню, там есть «Сохранить в Файлы»), затем обычное скачивание. */
export async function deliverFile(filename: string, mime: string, content: string): Promise<DeliverResult> {
  let file: File
  try {
    file = new File([content], filename, { type: mime })
  } catch {
    return 'failed'
  }

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    try {
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: filename })
        return 'shared'
      }
    } catch (error) {
      if ((error as DOMException | undefined)?.name === 'AbortError') return 'cancelled'
      // Другая ошибка — пробуем обычное скачивание.
    }
  }

  try {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Переходим к запасному способу.
  }

  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.focus()
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    // Временное поле не должно оставлять приложение в режиме «открыта клавиатура».
    document.documentElement.classList.remove('keyboard-open')
    return ok
  } catch {
    document.documentElement.classList.remove('keyboard-open')
    return false
  }
}

// ───────────────────────── Восстановление ─────────────────────────

// Данные из файла и из localStorage приходят как произвольный JSON и проверяются поле за полем,
// поэтому здесь сознательно используется «свободный» тип.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Raw = Record<string, any>

export type ParseResult =
  | { ok: true; data: Raw }
  | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  const clean = text.replace(/^\uFEFF/, '').trim()
  if (!clean) return { ok: false, error: 'Файл или текст пустой.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(clean)
  } catch {
    return {
      ok: false,
      error:
        'Это не файл резервной копии DoseTrack. Для восстановления нужна копия «Для программы»; текстовый вариант «Для чтения» загрузить нельзя.',
    }
  }

  const root = parsed as Raw | null
  if (root && typeof root === 'object' && root.app === BACKUP_APP && root.data && typeof root.data === 'object') {
    if (typeof root.formatVersion === 'number' && root.formatVersion > BACKUP_FORMAT_VERSION) {
      return { ok: false, error: 'Копия создана более новой версией приложения. Обнови приложение и попробуй снова.' }
    }
    return { ok: true, data: root.data as Raw }
  }
  // Допускаем и «сырой» формат хранилища.
  if (root && typeof root === 'object' && Array.isArray(root.entries)) {
    return { ok: true, data: root }
  }
  return { ok: false, error: 'Файл не похож на резервную копию DoseTrack.' }
}

export type MergeResult = {
  merged: Raw
  totalInFile: number
  addedEntries: number
  skippedEntries: number
  addedSubstances: number
}

const normName = (value: string) => value.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

/**
 * Дополняет текущий журнал данными из копии. Ничего не удаляет и не перезаписывает:
 * записи с уже существующим id пропускаются, текущие настройки имеют приоритет.
 * Результат — «сырой» объект в формате хранилища; его нормализует loadStoredData.
 */
export function mergeBackup(current: StoredShape, backup: Raw): MergeResult {
  const currentIds = new Set(current.substances.map(item => item.id))
  const nameToCurrentId = new Map(current.substances.map(item => [normName(item.name), item.id]))

  const idMap = new Map<string, string>()
  const newSubstances: BSubstance[] = []
  const knownIds = new Set(currentIds)

  const backupSubstances: Raw[] = Array.isArray(backup.substances) ? backup.substances : []
  for (const item of backupSubstances) {
    if (!item || typeof item.id !== 'string' || typeof item.name !== 'string') continue
    if (currentIds.has(item.id)) continue
    const sameName = nameToCurrentId.get(normName(item.name))
    if (sameName) {
      idMap.set(item.id, sameName)
      continue
    }
    if (knownIds.has(item.id)) continue
    knownIds.add(item.id)
    newSubstances.push({
      id: item.id,
      name: item.name,
      source: item.source === 'builtin' ? 'builtin' : 'custom',
      archived: Boolean(item.archived),
    })
  }

  const seenEntryIds = new Set(current.entries.map(entry => entry.id))
  const newEntries: Raw[] = []
  const backupEntries: Raw[] = Array.isArray(backup.entries)
    ? backup.entries.filter((value: unknown) => value && typeof value === 'object')
    : []
  let skipped = 0

  for (const entry of backupEntries) {
    if (typeof entry.id === 'string' && entry.id) {
      if (seenEntryIds.has(entry.id)) {
        skipped += 1
        continue
      }
      seenEntryIds.add(entry.id)
    }

    const originalId = typeof entry.substanceId === 'string' ? entry.substanceId : ''
    const substanceId = idMap.get(originalId) ?? originalId

    // Запись ссылается на вещество, которого нигде нет: восстанавливаем его по названию из записи.
    if (substanceId && !knownIds.has(substanceId) && typeof entry.substanceName === 'string' && entry.substanceName.trim()) {
      const sameName = nameToCurrentId.get(normName(entry.substanceName))
      if (sameName) {
        newEntries.push({ ...entry, substanceId: sameName })
        continue
      }
      knownIds.add(substanceId)
      newSubstances.push({ id: substanceId, name: entry.substanceName, source: 'custom', archived: false })
    }
    newEntries.push({ ...entry, substanceId })
  }

  const customSubstancesAdded = newSubstances.filter(item => item.source === 'custom').length

  const lastChoices = { ...(backup.lastChoices && typeof backup.lastChoices === 'object' ? backup.lastChoices : {}), ...current.lastChoices }
  const lastUnitChoices = { ...(backup.lastUnitChoices && typeof backup.lastUnitChoices === 'object' ? backup.lastUnitChoices : {}), ...current.lastUnitChoices }

  const union = (a: string[], b: unknown) => [...new Set([...a, ...strings(b)])]

  return {
    merged: {
      substances: [...current.substances, ...newSubstances],
      entries: [...current.entries, ...newEntries],
      customRoutes: union(current.customRoutes, backup.customRoutes),
      customForms: union(current.customForms, backup.customForms),
      customUnits: union(current.customUnits, backup.customUnits),
      lastChoices,
      lastUnitChoices,
      deletedCustomRoutes: union(current.deletedCustomRoutes, backup.deletedCustomRoutes),
      deletedCustomForms: union(current.deletedCustomForms, backup.deletedCustomForms),
      deletedCustomUnits: union(current.deletedCustomUnits, backup.deletedCustomUnits),
    },
    totalInFile: backupEntries.length,
    addedEntries: newEntries.length,
    skippedEntries: skipped,
    addedSubstances: customSubstancesAdded,
  }
}
