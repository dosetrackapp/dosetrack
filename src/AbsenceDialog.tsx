import { useEffect, useMemo, useState } from 'react'
import { absenceKey, dayKeyOfDate, dayKeyOfIso, type Absence, type AbsenceScope } from './absences'
import { useDialogs } from './dialogContext'
import { formatDateLong, formatDateMedium, formatTime } from './settings'

type SubstanceLite = { id: string; name: string; archived: boolean }
type EntryLite = {
  id: string
  substanceId: string
  amount: number | null
  unit: string
  takenAt: string
  approximate: boolean
  unknown: boolean
}

export type AbsencePlan = {
  scope: AbsenceScope
  records: Array<{ date: string; substanceId: string }>
  deleteEntryIds: string[]
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const pad = (n: number) => String(n).padStart(2, '0')
const keyToDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function entryText(entry: EntryLite) {
  if (entry.unknown || entry.amount === null) return 'количество неизвестно'
  return `${entry.approximate ? '≈ ' : ''}${String(entry.amount).replace('.', ',')} ${entry.unit}`
}

export default function AbsenceDialog({
  substances,
  entries,
  absences,
  onApply,
  onClose,
}: {
  substances: SubstanceLite[]
  entries: EntryLite[]
  absences: Absence[]
  onApply: (plan: AbsencePlan) => void
  onClose: () => void
}) {
  const { alert: showAlert, confirm: showConfirm } = useDialogs()
  const [scope, setScope] = useState<'all' | string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [step, setStep] = useState<'select' | 'conflicts'>('select')
  const [decisions, setDecisions] = useState<Record<string, 'keep' | 'remove'>>({})

  const todayKey = dayKeyOfDate(new Date())

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Только вещества, по которым есть хотя бы одна запись (в том числе архивные); недавние — выше.
  const list = useMemo(() => {
    const last = new Map<string, number>()
    for (const entry of entries) {
      const time = new Date(entry.takenAt).getTime()
      if (time > (last.get(entry.substanceId) ?? -Infinity)) last.set(entry.substanceId, time)
    }
    return substances
      .filter(item => last.has(item.id))
      .sort((a, b) => (last.get(b.id) ?? 0) - (last.get(a.id) ?? 0))
  }, [substances, entries])

  const existing = useMemo(() => new Set(absences.map(item => absenceKey(item.date, item.substanceId))), [absences])
  const scopeIds = scope === 'all' ? list.map(item => item.id) : scope ? [scope] : []
  const nameOf = (id: string) => substances.find(item => item.id === id)?.name ?? 'Без названия'

  const newFor = (date: string) => scopeIds.filter(id => !existing.has(absenceKey(date, id)))
  const conflictsFor = (date: string) =>
    entries
      .filter(entry => dayKeyOfIso(entry.takenAt) === date && (scope === 'all' || entry.substanceId === scope))
      .sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())

  const dates = [...selected].sort()
  const status = (date: string): 'conflict' | 'exists' | 'new' =>
    conflictsFor(date).length > 0 ? 'conflict' : newFor(date).length === 0 ? 'exists' : 'new'
  const conflictDates = dates.filter(date => conflictsFor(date).length > 0)

  function toggle(key: string) {
    if (key > todayKey) return
    setSelected(value => (value.includes(key) ? value.filter(item => item !== key) : [...value, key]))
  }

  function changeScope(next: string) {
    setScope(next)
    setStep('select')
  }

  async function finish(choice: Record<string, 'keep' | 'remove'>) {
    const keepDates = new Set(conflictDates.filter(date => (choice[date] ?? 'keep') === 'keep'))
    const removeDates = conflictDates.filter(date => choice[date] === 'remove')
    const records = dates
      .filter(date => !keepDates.has(date))
      .flatMap(date => newFor(date).map(substanceId => ({ date, substanceId })))
    const deleteEntryIds = removeDates.flatMap(date => conflictsFor(date).map(entry => entry.id))
    const alreadyMarked = dates.filter(date => !keepDates.has(date) && newFor(date).length === 0 && conflictsFor(date).length === 0).length

    if (records.length === 0 && deleteEntryIds.length === 0) {
      await showAlert(
        alreadyMarked > 0
          ? 'Для выбранных дат такие отметки уже есть. Новые отметки не создавались.'
          : 'Новые отметки не создавались: записи в выбранные дни оставлены без изменений.',
      )
      return
    }

    const scopeText = scope === 'all' ? 'все вещества' : nameOf(scope as string)
    const lines = [`Создать отметки отсутствия приёма: ${scopeText}.`, `Новых отметок: ${records.length}.`]
    if (alreadyMarked > 0) lines.push(`Уже были отмечены дат: ${alreadyMarked}. Повторно они не создаются.`)
    if (keepDates.size > 0) lines.push(`Дат оставлено без отметки из-за записей: ${keepDates.size}.`)
    if (deleteEntryIds.length > 0) {
      lines.push(`Будут удалены записи о приёме: ${deleteEntryIds.length}. Это действие нельзя отменить.`)
    }
    if (!(await showConfirm(lines.join('\n')))) return

    onApply({ scope: scope === 'all' ? 'all' : 'substance', records, deleteEntryIds })
  }

  function submit() {
    if (!scope || dates.length === 0) return
    if (conflictDates.length > 0) {
      const next: Record<string, 'keep' | 'remove'> = {}
      conflictDates.forEach(date => { next[date] = decisions[date] ?? 'keep' })
      setDecisions(next)
      setStep('conflicts')
      return
    }
    void finish({})
  }

  // ── календарь
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const monthName = month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  const today = keyToDate(todayKey)
  const atCurrentMonth = year === today.getFullYear() && monthIndex === today.getMonth()

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true" aria-label="Отсутствие приёма" onClick={event => event.stopPropagation()}>
        <h3 className="dialog-heading">Отсутствие приёма</h3>

        {step === 'select' ? (
          <>
            <p className="muted small">
              Здесь можно отметить дни, в которые приёма не было. Это необязательно: день без записи и без отметки
              по-прежнему ничего не означает. Отметки не считаются событиями и не создают нулевых количеств.
            </p>

            <div className="control-label">ЧТО ПОДТВЕРЖДАЕМ</div>
            <div className="absence-scope" role="radiogroup" aria-label="Область подтверждения">
              <button type="button" role="radio" aria-checked={scope === 'all'} className={`substance-item${scope === 'all' ? ' active' : ''}`} onClick={() => changeScope('all')}>
                <span>Ни одного вещества</span>
              </button>
              {list.map(item => (
                <button type="button" role="radio" aria-checked={scope === item.id} key={item.id} className={`substance-item${scope === item.id ? ' active' : ''}`} onClick={() => changeScope(item.id)}>
                  <span>{item.name}{item.archived ? ' (в архиве)' : ''}</span>
                </button>
              ))}
              {list.length === 0 && <p className="muted small">Пока нет веществ с записями в журнале.</p>}
            </div>

            <div className="control-label control-label-gap">ДНИ БЕЗ ПРИЁМА</div>
            <div className="calendar-navigation">
              <button type="button" className="calendar-nav-button" aria-label="Предыдущий месяц" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>‹</button>
              <strong>{monthName}</strong>
              <button type="button" className="calendar-nav-button" aria-label="Следующий месяц" disabled={atCurrentMonth} onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>›</button>
            </div>
            <div className="calendar-grid">
              {WEEKDAYS.map(day => <div className="calendar-weekday" key={day}>{day}</div>)}
              {Array.from({ length: firstWeekday }, (_, i) => <div className="calendar-empty" key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const key = `${year}-${pad(monthIndex + 1)}-${pad(i + 1)}`
                const isSelected = selected.includes(key)
                const future = key > todayKey
                const marked = scope !== null && newFor(key).length === 0 && conflictsFor(key).length === 0
                return (
                  <button
                    type="button"
                    key={key}
                    disabled={future}
                    className={['calendar-day', isSelected ? 'pick-selected' : '', marked ? 'confirmed-absence' : '', key === todayKey ? 'today' : ''].filter(Boolean).join(' ')}
                    aria-pressed={isSelected}
                    onClick={() => toggle(key)}
                  >
                    <span>{i + 1}</span>
                    {marked && <small aria-hidden="true">○</small>}
                  </button>
                )
              })}
            </div>
            <p className="muted tiny">Будущие даты недоступны. Пунктир — отметка уже есть. Выбор предварительный: пока не нажата кнопка внизу, ничего не сохраняется.</p>

            {dates.length > 0 && (
              <div className="absence-picked">
                {dates.map(date => {
                  const st = scope ? status(date) : 'new'
                  return (
                    <button type="button" key={date} className="chip active" onClick={() => toggle(date)} aria-label={`Снять выбор: ${formatDateMedium(keyToDate(date))}`}>
                      {formatDateMedium(keyToDate(date))}
                      {st === 'exists' ? ' · уже отмечено' : st === 'conflict' ? ' · есть записи' : ''} ×
                    </button>
                  )
                })}
              </div>
            )}

            <div className="dialog-actions">
              <button type="button" className="dialog-btn" onClick={onClose}>Отмена</button>
              <button type="button" className="dialog-btn dialog-btn-primary" disabled={!scope || dates.length === 0} onClick={submit}>
                Подтвердить{dates.length > 0 ? ` (${dates.length})` : ''}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="small">
              В некоторые из выбранных дней уже есть записи. Это противоречит отметке «приёма не было».
              Выбери для каждого дня, какие сведения оставить. Ничего не удаляется без твоего согласия.
            </p>
            {conflictDates.map(date => (
              <div className="conflict-block" key={date}>
                <strong>{formatDateLong(keyToDate(date))}</strong>
                <ul className="conflict-list">
                  {conflictsFor(date).map(entry => (
                    <li key={entry.id}>{formatTime(new Date(entry.takenAt))} · {nameOf(entry.substanceId)} · {entryText(entry)}</li>
                  ))}
                </ul>
                <label className="check-row">
                  <input type="radio" name={`d-${date}`} checked={(decisions[date] ?? 'keep') === 'keep'} onChange={() => setDecisions(v => ({ ...v, [date]: 'keep' }))} />
                  Оставить записи, отметку на этот день не создавать
                </label>
                <label className="check-row">
                  <input type="radio" name={`d-${date}`} checked={decisions[date] === 'remove'} onChange={() => setDecisions(v => ({ ...v, [date]: 'remove' }))} />
                  Создать отметку и удалить эти записи
                </label>
              </div>
            ))}
            <div className="dialog-actions">
              <button type="button" className="dialog-btn" onClick={() => setStep('select')}>Назад</button>
              <button type="button" className="dialog-btn dialog-btn-primary" onClick={() => void finish(decisions)}>Применить</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function EntryConflictDialog({
  substanceName,
  dayLabel,
  entryText: preview,
  onSaveEntry,
  onKeepAbsence,
  onBack,
}: {
  substanceName: string
  dayLabel: string
  entryText: string
  onSaveEntry: () => void
  onKeepAbsence: () => void
  onBack: () => void
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog dialog-wide" role="alertdialog" aria-modal="true" aria-label="Противоречие данных">
        <h3 className="dialog-heading">Данные противоречат друг другу</h3>
        <p className="small">
          На {dayLabel} ты ранее подтвердил(а), что приёма вещества «{substanceName}» не было. Теперь ты сохраняешь запись об этом веществе в тот же день.
        </p>
        <div className="conflict-block">
          <div><span className="muted tiny">Отметка:</span> приёма не было ({substanceName}, {dayLabel})</div>
          <div><span className="muted tiny">Новая запись:</span> {preview}</div>
        </div>
        <p className="muted small">Выбери, что оставить. Будет удалена только отметка, которая противоречит этой записи.</p>
        <div className="dialog-stack">
          <button type="button" className="dialog-btn dialog-btn-primary" onClick={onSaveEntry}>Сохранить запись и удалить отметку</button>
          <button type="button" className="dialog-btn" onClick={onKeepAbsence}>Оставить отметку, запись не создавать</button>
          <button type="button" className="dialog-btn" onClick={onBack}>Вернуться к форме</button>
        </div>
      </div>
    </div>
  )
}
