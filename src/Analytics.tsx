import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { formatDateAxis, formatDateLong, formatDateShort, formatTime } from './settings'

// ─────────────────────────────────────────────────────────────
// Типы (структурно совместимы с Entry из App.tsx)
// ─────────────────────────────────────────────────────────────

export type AnalyticsSubstance = { id: string; name: string }

export type AnalyticsEntry = {
  id: string
  substanceId: string
  amount: number | null
  unit: string
  takenAt: string
  route: string
  form?: string
  comment: string
  approximate: boolean
  unknown: boolean
}

export type HistoryJump = { substanceId: string; from: string; to: string }

type Props = {
  substances: AnalyticsSubstance[]
  entries: AnalyticsEntry[]
  onEditEntry: (entryId: string) => void
  onOpenHistory: (jump: HistoryJump) => void
}

type Period = 7 | 30 | 90 | 365 | 0

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 7, label: '7 дн.' },
  { value: 30, label: '30 дн.' },
  { value: 90, label: '90 дн.' },
  { value: 365, label: 'Год' },
  { value: 0, label: 'Всё' },
]

type Row = {
  entry: AnalyticsEntry
  time: number
  day: string
  wd: number
  block: number
}

type SheetSel =
  | { sid: string; kind: 'range'; from: string; to: string }
  | { sid: string; kind: 'cell'; wd: number; block: number }

// ─────────────────────────────────────────────────────────────
// Даты и форматирование
// ─────────────────────────────────────────────────────────────

const MS_HOUR = 3600000
const MS_DAY = 86400000

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const WEEKDAYS_LONG = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
const BLOCK_LABELS = ['00–04', '04–08', '08–12', '12–16', '16–20', '20–24']

const EVENT_COLOR = 'rgb(100, 160, 130)'
const QUANTITY_COLOR = 'rgb(110, 145, 190)'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function dayKeyOf(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function keyToDate(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftKey(key: string, days: number) {
  const date = keyToDate(key)
  return dayKeyOf(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))
}

function diffDays(from: string, to: string) {
  return Math.round((keyToDate(to).getTime() - keyToDate(from).getTime()) / MS_DAY)
}

function weekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

function mondayKey(key: string) {
  return shiftKey(key, -weekdayIndex(keyToDate(key)))
}

function dayShort(key: string, withYear = false) {
  return formatDateShort(keyToDate(key), withYear)
}

function dayLong(key: string) {
  return formatDateLong(keyToDate(key))
}

function dayAxis(key: string) {
  return formatDateAxis(keyToDate(key))
}

function timeOf(row: Row) {
  return formatTime(new Date(row.time))
}

function rangeLabel(from: string, to: string) {
  const currentYear = new Date().getFullYear()
  const withYear = keyToDate(from).getFullYear() !== keyToDate(to).getFullYear()
    || keyToDate(to).getFullYear() !== currentYear
  return from === to ? dayShort(from, withYear) : `${dayShort(from, withYear)} – ${dayShort(to, withYear)}`
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(value)
}

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.round(milliseconds / 60000)
  if (totalMinutes < 60) return `${totalMinutes} мин`
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) {
    const minutes = totalMinutes % 60
    return minutes > 0 ? `${totalHours} ч ${minutes} мин` : `${totalHours} ч`
  }
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return hours > 0 ? `${days} дн ${hours} ч` : `${days} дн`
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

function eventsWord(n: number) {
  return `${n} ${plural(n, 'событие', 'события', 'событий')}`
}

function signed(value: number, digits = 3) {
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits
  if (rounded === 0) return '0'
  return `${rounded > 0 ? '+' : '−'}${formatQuantity(Math.abs(rounded))}`
}

function toRow(entry: AnalyticsEntry): Row {
  const date = new Date(entry.takenAt)
  return {
    entry,
    time: date.getTime(),
    day: dayKeyOf(date),
    wd: weekdayIndex(date),
    block: Math.floor(date.getHours() / 4),
  }
}

function hasAmount(entry: AnalyticsEntry) {
  return !entry.unknown && entry.amount !== null && Number.isFinite(entry.amount)
}

// ─────────────────────────────────────────────────────────────
// Расчёты
// ─────────────────────────────────────────────────────────────

type UnitStat = {
  unit: string
  total: number
  known: number
  unknown: number
  approx: number
  days: number
  maxDay: { key: string; total: number } | null
}

type Metrics = {
  events: number
  days: number
  perDay: number | null
  intervals: number[]
  median: number | null
  q1: number | null
  q3: number | null
  units: Map<string, UnitStat>
  unknownCount: number
  approxCount: number
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const index = (sorted.length - 1) * p
  const lo = Math.floor(index)
  const hi = Math.ceil(index)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo)
}

// Записи list должны быть отсортированы по времени.
function computeMetrics(list: Row[]): Metrics {
  const dayKeys = new Set<string>()
  const acc = new Map<string, { total: number; known: number; unknown: number; approx: number; dayTotals: Map<string, number> }>()
  let unknownCount = 0
  let approxCount = 0

  for (const row of list) {
    dayKeys.add(row.day)
    const entry = row.entry
    let unitAcc = acc.get(entry.unit)
    if (!unitAcc) {
      unitAcc = { total: 0, known: 0, unknown: 0, approx: 0, dayTotals: new Map() }
      acc.set(entry.unit, unitAcc)
    }
    if (hasAmount(entry)) {
      const amount = entry.amount as number
      unitAcc.total += amount
      unitAcc.known += 1
      unitAcc.dayTotals.set(row.day, (unitAcc.dayTotals.get(row.day) ?? 0) + amount)
      if (entry.approximate) {
        unitAcc.approx += 1
        approxCount += 1
      }
    } else {
      unitAcc.unknown += 1
      unknownCount += 1
    }
  }

  const intervals: number[] = []
  for (let i = 1; i < list.length; i += 1) {
    const diff = list[i].time - list[i - 1].time
    if (diff >= 0) intervals.push(diff)
  }
  const sorted = [...intervals].sort((a, b) => a - b)

  const units = new Map<string, UnitStat>()
  acc.forEach((value, unit) => {
    let maxDay: UnitStat['maxDay'] = null
    value.dayTotals.forEach((total, key) => {
      if (!maxDay || total > maxDay.total) maxDay = { key, total }
    })
    units.set(unit, {
      unit,
      total: value.total,
      known: value.known,
      unknown: value.unknown,
      approx: value.approx,
      days: value.dayTotals.size,
      maxDay,
    })
  })

  return {
    events: list.length,
    days: dayKeys.size,
    perDay: dayKeys.size > 0 ? list.length / dayKeys.size : null,
    intervals,
    median: percentile(sorted, 0.5),
    q1: percentile(sorted, 0.25),
    q3: percentile(sorted, 0.75),
    units,
    unknownCount,
    approxCount,
  }
}

type Bucket = { key: string; from: string; to: string; label: string; weekly: boolean; rows: Row[] }

function buildBuckets(from: string, to: string, periodRows: Row[]): { buckets: Bucket[]; weekly: boolean } {
  const totalDays = diffDays(from, to) + 1
  const weekly = totalDays > 120
  const byDay = new Map<string, Row[]>()
  periodRows.forEach(row => {
    const list = byDay.get(row.day) ?? []
    list.push(row)
    byDay.set(row.day, list)
  })

  const buckets: Bucket[] = []
  if (!weekly) {
    for (let i = 0; i < totalDays; i += 1) {
      const key = shiftKey(from, i)
      buckets.push({ key: `${key}|${key}`, from: key, to: key, label: dayAxis(key), weekly, rows: byDay.get(key) ?? [] })
    }
  } else {
    let start = mondayKey(from)
    while (start <= to) {
      const bFrom = start < from ? from : start
      const end = shiftKey(start, 6)
      const bTo = end > to ? to : end
      const rows: Row[] = []
      for (let k = bFrom; k <= bTo; k = shiftKey(k, 1)) rows.push(...(byDay.get(k) ?? []))
      buckets.push({ key: `${bFrom}|${bTo}`, from: bFrom, to: bTo, label: dayAxis(bFrom), weekly, rows })
      start = shiftKey(start, 7)
    }
  }
  return { buckets, weekly }
}

function bucketTitle(bucket: Bucket) {
  return bucket.weekly ? rangeLabel(bucket.from, bucket.to) : dayLong(bucket.from)
}

const INTERVAL_BINS = [
  { label: 'до 1 ч', max: MS_HOUR },
  { label: '1–3 ч', max: 3 * MS_HOUR },
  { label: '3–6 ч', max: 6 * MS_HOUR },
  { label: '6–12 ч', max: 12 * MS_HOUR },
  { label: '12–24 ч', max: MS_DAY },
  { label: '1–2 дня', max: 2 * MS_DAY },
  { label: '2–7 дней', max: 7 * MS_DAY },
  { label: 'более 7 дн.', max: Infinity },
]

// ─────────────────────────────────────────────────────────────
// Столбчатый график (SVG)
// ─────────────────────────────────────────────────────────────

type Bar = {
  key: string
  from: string
  to: string
  value: number
  has: boolean
  approximate?: boolean
  unknownMark?: boolean
  label: string
  tooltip: string
}

function niceTicks(max: number, integer: boolean): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: 1, ticks: integer ? [0, 1] : [0, 0.5, 1] }
  if (integer && max <= 4) {
    const top = Math.ceil(max)
    return { top, ticks: Array.from({ length: top + 1 }, (_, i) => i) }
  }
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  const steps = integer ? [1, 2, 4, 6, 8, 10] : [1, 2, 2.5, 5, 10]
  const top = (steps.find(step => step * magnitude >= max - 1e-9) ?? 10) * magnitude
  return { top, ticks: [0, top / 2, top] }
}

function BarChart({
  bars,
  selectedKey,
  onSelect,
  color,
  integer,
  average,
  ariaLabel,
  hint,
}: {
  bars: Bar[]
  selectedKey: string | null
  onSelect: (bar: Bar | null) => void
  color: string
  integer?: boolean
  average?: Array<number | null>
  ariaLabel: string
  hint: string
}) {
  const patternId = `hatch${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [hoverKey, setHoverKey] = useState<string | null>(null)

  const W = 600
  const H = 176
  const PL = 38
  const PR = 14
  const PT = 14
  const PB = 24
  const plotW = W - PL - PR
  const plotH = H - PT - PB
  const n = bars.length
  const slot = plotW / n
  const barW = Math.min(26, Math.max(2, slot * 0.7))
  const maxValue = Math.max(0, ...bars.map(bar => bar.value))
  const { top, ticks } = niceTicks(maxValue, Boolean(integer))
  const y = (value: number) => PT + plotH - (value / top) * plotH
  const labelStep = Math.max(1, Math.ceil(n / 7))
  const showValues = n <= 14

  const readoutBar = bars.find(bar => bar.key === (hoverKey ?? selectedKey))

  function onKeyDown(event: ReactKeyboardEvent<SVGSVGElement>) {
    if (event.key === 'Escape') {
      onSelect(null)
      return
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const current = bars.findIndex(bar => bar.key === selectedKey)
    const step = event.key === 'ArrowRight' ? 1 : -1
    const next = current < 0
      ? (step > 0 ? 0 : n - 1)
      : Math.min(n - 1, Math.max(0, current + step))
    onSelect(bars[next])
  }

  // Линия скользящего среднего: разрывается там, где данных нет.
  let averagePath = ''
  if (average) {
    let drawing = false
    average.forEach((value, i) => {
      if (value === null) {
        drawing = false
        return
      }
      const x = PL + slot * i + slot / 2
      averagePath += `${drawing ? 'L' : 'M'}${x.toFixed(1)} ${y(value).toFixed(1)} `
      drawing = true
    })
  }

  return (
    <div className="chart-wrap">
      <div className="chart-readout" aria-live="polite">
        {readoutBar ? readoutBar.tooltip : hint}
      </div>
      <svg
        className="bar-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={color} fillOpacity="0.3" />
            <rect width="3" height="6" fill={color} />
          </pattern>
        </defs>

        {ticks.map(tick => (
          <g key={tick}>
            <line className={tick === 0 ? 'axis-line' : 'grid-line'} x1={PL} x2={W - PR} y1={y(tick)} y2={y(tick)} />
            <text x={PL - 6} y={y(tick) + 3} textAnchor="end">{formatQuantity(tick)}</text>
          </g>
        ))}

        {bars.map((bar, i) => {
          const cx = PL + slot * i + slot / 2
          const height = bar.has ? Math.max(2, (bar.value / top) * plotH) : 0
          const barTop = PT + plotH - height
          const dim = selectedKey !== null && selectedKey !== bar.key
          return (
            <g key={bar.key}>
              {bar.has && (
                <rect
                  x={cx - barW / 2}
                  y={barTop}
                  width={barW}
                  height={height}
                  rx={Math.min(3, barW / 2)}
                  fill={bar.approximate ? `url(#${patternId})` : color}
                  opacity={dim ? 0.45 : 1}
                  stroke={selectedKey === bar.key ? '#f0f1f5' : undefined}
                  strokeWidth={1.5}
                />
              )}
              {bar.has && showValues && (
                <text className="bar-value" x={cx} y={barTop - 3} textAnchor="middle">
                  {formatQuantity(bar.value)}
                </text>
              )}
              {bar.unknownMark && (
                <text className="unknown-mark" x={cx} y={barTop - (bar.has && showValues ? 14 : 3)} textAnchor="middle">?</text>
              )}
            </g>
          )
        })}

        {averagePath && <path className="avg-line" d={averagePath} />}

        {bars.map((bar, i) =>
          (n - 1 - i) % labelStep === 0 ? (
            <text key={`label-${bar.key}`} x={PL + slot * i + slot / 2} y={H - 6} textAnchor="middle">
              {bar.label}
            </text>
          ) : null,
        )}

        {bars.map((bar, i) => (
          <rect
            key={`hit-${bar.key}`}
            className={`bar-hit${selectedKey === bar.key ? ' selected' : ''}`}
            x={PL + slot * i}
            y={PT}
            width={slot}
            height={H - PT}
            onPointerEnter={() => setHoverKey(bar.key)}
            onPointerLeave={() => setHoverKey(null)}
            onClick={() => onSelect(selectedKey === bar.key ? null : bar)}
          >
            <title>{bar.tooltip}</title>
          </rect>
        ))}
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Календарь-теплокарта
// ─────────────────────────────────────────────────────────────

function levelOf(count: number, max: number) {
  if (count <= 0) return 0
  if (max <= 4) return count
  return Math.min(4, Math.ceil((count / max) * 4))
}

function ActivityCalendar({
  rows,
  month,
  onMonthChange,
  selectedDay,
  onSelectDay,
  todayKey,
}: {
  rows: Row[]
  month: Date
  onMonthChange: (month: Date) => void
  selectedDay: string | null
  onSelectDay: (key: string | null) => void
  todayKey: string
}) {
  const { counts, maxCount } = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach(row => map.set(row.day, (map.get(row.day) ?? 0) + 1))
    return { counts: map, maxCount: Math.max(0, ...map.values()) }
  }, [rows])

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const monthName = month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  const prefix = `${year}-${pad(monthIndex + 1)}-`

  let monthEvents = 0
  let monthDays = 0
  counts.forEach((count, key) => {
    if (key.startsWith(prefix)) {
      monthEvents += count
      monthDays += 1
    }
  })

  const today = keyToDate(todayKey)

  return (
    <div className="calendar-block">
      <div className="calendar-navigation">
        <button type="button" className="calendar-nav-button" aria-label="Предыдущий месяц"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}>‹</button>
        <strong>{monthName}</strong>
        <button type="button" className="calendar-nav-button" aria-label="Следующий месяц"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}>›</button>
      </div>
      <div className="calendar-summary">
        <span className="muted small">
          {monthEvents > 0
            ? `${eventsWord(monthEvents)} в ${monthDays} ${plural(monthDays, 'день', 'дня', 'дней')}`
            : 'В этом месяце записей нет'}
        </span>
        {!(year === today.getFullYear() && monthIndex === today.getMonth()) && (
          <button type="button" className="link-button"
            onClick={() => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))}>
            К текущему месяцу
          </button>
        )}
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map(day => <div className="calendar-weekday" key={day}>{day}</div>)}
        {Array.from({ length: firstWeekday }, (_, i) => <div className="calendar-empty" key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const key = `${prefix}${pad(day)}`
          const count = counts.get(key) ?? 0
          const level = levelOf(count, maxCount)
          const isSelected = selectedDay === key
          return (
            <button
              type="button"
              key={key}
              className={[
                'calendar-day',
                count > 0 ? `has-entries level-${level}` : '',
                isSelected ? 'selected' : '',
                key === todayKey ? 'today' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectDay(isSelected ? null : key)}
              aria-label={`${day} ${monthName}, записей: ${count}`}
            >
              <span>{day}</span>
              {count > 0 && <small>{count}</small>}
            </button>
          )
        })}
      </div>

      <div className="calendar-legend">
        <span>меньше</span>
        {[1, 2, 3, 4].map(l => <span key={l} className={`legend-swatch level-${l}`} />)}
        <span>больше событий в день</span>
      </div>
      <p className="muted tiny legend-note">
        Серые дни — записей нет. Это не означает, что приёма не было.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Нижняя панель с деталями
// ─────────────────────────────────────────────────────────────

function DetailsSheet({
  title,
  subtitle,
  rows,
  multiDay,
  emptyText,
  onClose,
  onEdit,
  onOpenHistory,
}: {
  title: string
  subtitle: string
  rows: Row[]
  multiDay: boolean
  emptyText: string
  onClose: () => void
  onEdit: (entryId: string) => void
  onOpenHistory?: () => void
}) {
  const LIMIT = 40
  const metrics = computeMetrics(rows)
  const totals = [...metrics.units.values()].filter(unit => unit.known > 0)
  const shown = rows.slice(0, LIMIT)

  return (
    <div className="sheet" role="dialog" aria-label={title}>
      <div className="sheet-head">
        <div>
          <strong>{title}</strong>
          <div className="muted small">{subtitle}</div>
        </div>
        <button type="button" className="calendar-close" onClick={onClose} aria-label="Закрыть">×</button>
      </div>

      {rows.length === 0 && <p className="muted small">{emptyText}</p>}

      {rows.length > 1 && totals.length > 0 && (
        <div className="sheet-totals">
          {totals.map(unit => (
            <span className="daily-total" key={unit.unit}>
              {unit.approx > 0 && '≈ '}{formatQuantity(unit.total)} {unit.unit}
            </span>
          ))}
          {metrics.unknownCount > 0 && (
            <span className="muted tiny">+ {metrics.unknownCount} без количества</span>
          )}
        </div>
      )}

      {shown.map(row => {
        const entry = row.entry
        return (
          <div className="sheet-event" key={entry.id}>
            <strong>{multiDay ? `${dayShort(row.day)}, ${timeOf(row)}` : timeOf(row)}</strong>
            <span>
              {hasAmount(entry)
                ? `${entry.approximate ? '≈ ' : ''}${formatQuantity(entry.amount as number)} ${entry.unit}`
                : 'Количество неизвестно'}
            </span>
            <button type="button" className="link-button" onClick={() => onEdit(entry.id)}>Изменить</button>
            {(entry.route || entry.form) && (
              <span className="muted small sheet-meta">{[entry.route, entry.form].filter(Boolean).join(' · ')}</span>
            )}
            {entry.comment && <p className="muted small sheet-meta">{entry.comment}</p>}
          </div>
        )
      })}

      {rows.length > LIMIT && (
        <p className="muted tiny">Показаны первые {LIMIT} из {rows.length}. Полный список — в истории.</p>
      )}

      {onOpenHistory && rows.length > 0 && (
        <button type="button" className="secondary-button sheet-history" onClick={onOpenHistory}>
          Открыть в истории
        </button>
      )}
    </div>
  )
}

function Fold({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <details className="fold" open>
      <summary>
        <span>{title}</span>
        <span className="fold-chevron">⌄</span>
      </summary>
      {hint && <p className="muted small fold-hint">{hint}</p>}
      {children}
    </details>
  )
}

// ─────────────────────────────────────────────────────────────
// Основной компонент
// ─────────────────────────────────────────────────────────────

export default function Analytics({ substances, entries, onEditEntry, onOpenHistory }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>(7)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [unitPick, setUnitPick] = useState<{ sid: string; unit: string } | null>(null)
  const [showAverage, setShowAverage] = useState(true)
  const [sheet, setSheet] = useState<SheetSel | null>(null)

  const todayKey = dayKeyOf(new Date())

  const totals = useMemo(() => {
    const count = new Map<string, number>()
    const last = new Map<string, number>()
    for (const entry of entries) {
      count.set(entry.substanceId, (count.get(entry.substanceId) ?? 0) + 1)
      const time = new Date(entry.takenAt).getTime()
      if (time > (last.get(entry.substanceId) ?? -Infinity)) last.set(entry.substanceId, time)
    }
    return { count, last }
  }, [entries])

  // Сверху — вещество с самой свежей записью, снизу — с самой давней.
  const withData = substances
    .filter(item => (totals.count.get(item.id) ?? 0) > 0)
    .sort((a, b) => (totals.last.get(b.id) ?? 0) - (totals.last.get(a.id) ?? 0))
  let defaultId = ''
  let defaultTime = -Infinity
  withData.forEach(item => {
    const time = totals.last.get(item.id) ?? -Infinity
    if (time > defaultTime) {
      defaultTime = time
      defaultId = item.id
    }
  })
  const activeId = withData.some(item => item.id === selectedId) ? (selectedId as string) : defaultId
  const substance = withData.find(item => item.id === activeId)

  // Правило относится к React Compiler, который в проекте не подключён: он не может доказать, что записи
  // дальше не изменяются. На работу кода это не влияет, поэтому правило здесь отключено.
  /* eslint-disable react-hooks/preserve-manual-memoization */
  const rows = useMemo(
    () => entries.filter(entry => entry.substanceId === activeId).map(toRow).sort((a, b) => a.time - b.time),
    [entries, activeId],
  )
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const view = useMemo(() => {
    let from: string
    let to: string
    if (period > 0) {
      from = shiftKey(todayKey, -(period - 1))
      to = todayKey
    } else {
      from = rows.length ? rows[0].day : todayKey
      const last = rows.length ? rows[rows.length - 1].day : todayKey
      to = last > todayKey ? last : todayKey
    }
    const periodRows = rows.filter(row => row.day >= from && row.day <= to)
    const current = computeMetrics(periodRows)

    let previous: Metrics | null = null
    let prevFrom = ''
    let prevTo = ''
    if (period > 0) {
      prevTo = shiftKey(from, -1)
      prevFrom = shiftKey(from, -period)
      previous = computeMetrics(rows.filter(row => row.day >= prevFrom && row.day <= prevTo))
    }

    const totalDays = diffDays(from, to) + 1
    const { buckets, weekly } = buildBuckets(from, to, periodRows)

    const heat: number[][] = Array.from({ length: 7 }, () => Array(6).fill(0))
    periodRows.forEach(row => { heat[row.wd][row.block] += 1 })

    return { from, to, periodRows, current, previous, prevFrom, prevTo, totalDays, buckets, weekly, heat }
  }, [rows, period, todayKey])

  const sheetOpen = sheet !== null && sheet.sid === activeId

  useEffect(() => {
    if (!sheetOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setSheet(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  if (withData.length === 0 || !substance) {
    return (
      <section className="panel empty">
        <div className="empty-symbol">⌁</div>
        <strong>Пока недостаточно данных</strong>
        <p>Аналитика появится после первых записей.</p>
      </section>
    )
  }

  const { current, previous, buckets, weekly, heat, totalDays } = view

  // ── единицы
  const unitList = [...current.units.values()]
    .filter(unit => unit.known > 0)
    .sort((a, b) => b.known - a.known || a.unit.localeCompare(b.unit, 'ru-RU'))
  const chartUnit =
    unitList.find(unit => unit.unit === unitPick?.unit && unitPick.sid === activeId)?.unit ?? unitList[0]?.unit

  // ── столбцы
  const selectedKey = sheet && sheet.sid === activeId && sheet.kind === 'range' ? `${sheet.from}|${sheet.to}` : null
  const selectRange = (bar: Bar | null) =>
    setSheet(bar ? { sid: activeId, kind: 'range', from: bar.from, to: bar.to } : null)

  const eventBars: Bar[] = buckets.map(bucket => ({
    key: bucket.key,
    from: bucket.from,
    to: bucket.to,
    value: bucket.rows.length,
    has: bucket.rows.length > 0,
    label: bucket.label,
    tooltip: bucket.rows.length > 0
      ? `${bucketTitle(bucket)}: ${eventsWord(bucket.rows.length)}`
      : `${bucketTitle(bucket)}: записей в журнале нет`,
  }))

  let quantityBars: Bar[] = []
  let averageLine: Array<number | null> | undefined
  if (chartUnit) {
    quantityBars = buckets.map(bucket => {
      let total = 0
      let known = 0
      let unknown = 0
      let approximate = false
      bucket.rows.forEach(row => {
        if (row.entry.unit !== chartUnit) return
        if (hasAmount(row.entry)) {
          total += row.entry.amount as number
          known += 1
          if (row.entry.approximate) approximate = true
        } else {
          unknown += 1
        }
      })
      const title = bucketTitle(bucket)
      let tooltip = `${title}: нет записей с этой единицей`
      if (known > 0) {
        tooltip = `${title}: ${approximate ? '≈ ' : ''}${formatQuantity(total)} ${chartUnit}${unknown > 0 ? ` (и ${unknown} без количества)` : ''}`
      } else if (unknown > 0) {
        tooltip = `${title}: есть событие с неизвестным количеством`
      }
      return {
        key: bucket.key,
        from: bucket.from,
        to: bucket.to,
        value: total,
        has: known > 0,
        approximate,
        unknownMark: unknown > 0,
        label: bucket.label,
        tooltip,
      }
    })

    if (showAverage && !weekly) {
      // Среднее считается только по дням с известными записями в окне 7 дней.
      averageLine = quantityBars.map((_, i) => {
        const values = quantityBars.slice(Math.max(0, i - 6), i + 1).filter(bar => bar.has).map(bar => bar.value)
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
      })
    }
  }

  // ── детали
  let sheetRows: Row[] = []
  let sheetTitle = ''
  let sheetSubtitle = ''
  let sheetMultiDay = false
  let sheetEmpty = ''
  let sheetJump: HistoryJump | null = null
  if (sheet && sheet.sid === activeId) {
    if (sheet.kind === 'range') {
      sheetRows = rows.filter(row => row.day >= sheet.from && row.day <= sheet.to)
      sheetMultiDay = sheet.from !== sheet.to
      sheetTitle = sheetMultiDay ? rangeLabel(sheet.from, sheet.to) : dayLong(sheet.from)
      sheetSubtitle = sheetRows.length > 0 ? eventsWord(sheetRows.length) : 'Нет записей'
      sheetEmpty = 'За этот период в журнале нет записей. Это не означает, что приёма не было.'
      sheetJump = { substanceId: activeId, from: sheet.from, to: sheet.to }
    } else {
      sheetRows = view.periodRows.filter(row => row.wd === sheet.wd && row.block === sheet.block)
      sheetMultiDay = true
      sheetTitle = `${WEEKDAYS_LONG[sheet.wd]}, ${BLOCK_LABELS[sheet.block]} ч`
      sheetSubtitle = `${eventsWord(sheetRows.length)} за выбранный период`
      sheetEmpty = 'В это время записей нет.'
    }
  }

  // ── время приёмов
  const heatMax = Math.max(0, ...heat.flat())
  const colTotals = BLOCK_LABELS.map((_, b) => heat.reduce((sum, rowValues) => sum + rowValues[b], 0))
  const selectedCell = sheet && sheet.sid === activeId && sheet.kind === 'cell' ? sheet : null

  // ── интервалы
  const bins = INTERVAL_BINS.map(bin => ({ label: bin.label, count: 0 }))
  current.intervals.forEach(interval => {
    const index = INTERVAL_BINS.findIndex(bin => interval < bin.max)
    bins[index].count += 1
  })
  const binMax = Math.max(1, ...bins.map(bin => bin.count))

  // ── сравнение периодов
  const compareRows: Array<{ label: string; now: string; before: string; delta: string }> = []
  if (previous) {
    compareRows.push({
      label: 'События',
      now: String(current.events),
      before: String(previous.events),
      delta: signed(current.events - previous.events),
    })
    compareRows.push({
      label: 'Дней с записями',
      now: String(current.days),
      before: String(previous.days),
      delta: signed(current.days - previous.days),
    })
    if (current.perDay !== null && previous.perDay !== null) {
      compareRows.push({
        label: 'Событий в день с записями',
        now: formatQuantity(Math.round(current.perDay * 10) / 10),
        before: formatQuantity(Math.round(previous.perDay * 10) / 10),
        delta: signed(current.perDay - previous.perDay, 1),
      })
    }
    const allUnits = new Set<string>([...current.units.keys(), ...previous.units.keys()])
    ;[...allUnits].sort((a, b) => a.localeCompare(b, 'ru-RU')).forEach(unit => {
      const now = current.units.get(unit)
      const before = previous.units.get(unit)
      if ((now?.known ?? 0) === 0 && (before?.known ?? 0) === 0) return
      const nowKnown = (now?.known ?? 0) > 0
      const beforeKnown = (before?.known ?? 0) > 0
      compareRows.push({
        label: `Сумма, ${unit}`,
        now: nowKnown ? `${now!.approx > 0 ? '≈ ' : ''}${formatQuantity(now!.total)}` : '—',
        before: beforeKnown ? `${before!.approx > 0 ? '≈ ' : ''}${formatQuantity(before!.total)}` : '—',
        delta: nowKnown && beforeKnown ? signed(now!.total - before!.total) : '—',
      })
    })
  }

  const periodCaption = period === 0
    ? `Весь журнал: ${rangeLabel(view.from, view.to)}`
    : `${rangeLabel(view.from, view.to)} · ${period} ${plural(period, 'день', 'дня', 'дней')}`

  return (
    <div className={`analytics${sheetOpen ? ' sheet-open' : ''}`}>
      <section className="panel analytics-controls">
        <div className="control-label">ВЕЩЕСТВО</div>
        <div className="substance-list" role="tablist" aria-label="Вещество">
          {withData.map(item => (
            <button
              type="button"
              role="tab"
              aria-selected={item.id === activeId}
              key={item.id}
              className={`substance-item${item.id === activeId ? ' active' : ''}`}
              onClick={() => setSelectedId(item.id)}
            >
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        <div className="control-label control-label-gap">ПЕРИОД</div>
        <div className="segmented" role="group" aria-label="Период">
          {PERIODS.map(option => (
            <button
              type="button"
              key={option.value}
              className={period === option.value ? 'active' : ''}
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="period-caption">{periodCaption}</div>
      </section>

      <section className="panel analytics-card">
        <div className="section-heading">
          <h2>{substance.name}</h2>
          <span className="tag">{eventsWord(current.events)}</span>
        </div>

        <div className="stats-grid-4">
          <div className="stat">
            <span>События</span>
            <strong>{current.events}</strong>
            {previous && <small>прошлый период: {previous.events}</small>}
          </div>
          <div className="stat">
            <span>Дней с записями</span>
            <strong>{current.days}</strong>
            <small>из {totalDays} в периоде</small>
          </div>
          <div className="stat">
            <span>Событий в день с записями</span>
            <strong>{current.perDay === null ? '—' : formatQuantity(Math.round(current.perDay * 10) / 10)}</strong>
            <small>среднее по дням с записями</small>
          </div>
          <div className="stat">
            <span>Медианный интервал</span>
            <strong>{current.median === null ? '—' : formatDuration(current.median)}</strong>
            <small>
              {current.q1 !== null && current.q3 !== null
                ? `типично ${formatDuration(current.q1)} – ${formatDuration(current.q3)}`
                : 'нужно минимум две записи'}
            </small>
          </div>
        </div>

        {current.events === 0 && (
          <p className="muted small analytics-empty-note">
            В выбранном периоде в журнале нет записей по этому веществу. Это не означает, что приёма не было.
            Попробуй другой период.
          </p>
        )}

        {unitList.length > 0 && (
          <div className="chart-block">
            <h4>Количества за период</h4>
            <p className="muted small">Каждая единица считается отдельно, разные единицы не суммируются.</p>
            <div className="unit-cards">
              {unitList.map(unit => (
                <div className="unit-card" key={unit.unit}>
                  <div className="unit-card-head">
                    <strong>{unit.unit}</strong>
                    <span className="muted tiny">{unit.known} {plural(unit.known, 'запись', 'записи', 'записей')} с количеством</span>
                  </div>
                  <div className="unit-card-total">
                    {unit.approx > 0 && '≈ '}{formatQuantity(unit.total)}<small>всего</small>
                  </div>
                  <div className="unit-card-meta">
                    <span>В день с записями: {unit.approx > 0 && '≈ '}{formatQuantity(Math.round((unit.total / unit.days) * 100) / 100)}</span>
                    {unit.maxDay && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => setSheet({ sid: activeId, kind: 'range', from: unit.maxDay!.key, to: unit.maxDay!.key })}
                      >
                        Максимум за день: {formatQuantity(unit.maxDay.total)} · {dayShort(unit.maxDay.key)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(current.unknownCount > 0 || current.approxCount > 0) && (
          <div className="unknown-info">
            {current.unknownCount > 0 && (
              <div>Записей с неизвестным количеством: {current.unknownCount}. Они учтены в числе событий, но не вошли в суммы.</div>
            )}
            {current.approxCount > 0 && (
              <div>Приблизительных записей: {current.approxCount}. Они включены в суммы и отмечены знаком ≈.</div>
            )}
          </div>
        )}
      </section>

      <section className="panel analytics-card">
        <div className="chart-block chart-block-first">
          <h4>События по {weekly ? 'неделям' : 'дням'}</h4>
          <p className="muted small">
            Число событий, внесённых в журнал. Нажми на столбец — откроются записи.
          </p>
          <BarChart
            bars={eventBars}
            selectedKey={selectedKey}
            onSelect={selectRange}
            color={EVENT_COLOR}
            integer
            ariaLabel={`События по ${weekly ? 'неделям' : 'дням'}. Стрелки влево и вправо переключают столбцы`}
            hint="Наведи или нажми на столбец, чтобы увидеть значение"
          />
          <p className="chart-note">Пустое место — в журнале нет записей. Это не показатель отсутствия приёма.</p>
        </div>

        <div className="chart-block">
          <h4>Известные количества</h4>
          {chartUnit ? (
            <>
              <p className="muted small">Одна единица на график. Выбери единицу:</p>
              <div className="chip-row chip-row-compact">
                {unitList.map(unit => (
                  <button
                    type="button"
                    key={unit.unit}
                    className={`chip${unit.unit === chartUnit ? ' active' : ''}`}
                    onClick={() => setUnitPick({ sid: activeId, unit: unit.unit })}
                  >
                    {unit.unit}
                  </button>
                ))}
                {!weekly && (
                  <button
                    type="button"
                    className={`chip chip-line${showAverage ? ' active' : ''}`}
                    aria-pressed={showAverage}
                    onClick={() => setShowAverage(value => !value)}
                  >
                    <span className="line-swatch" /> Среднее за 7 дн.
                  </button>
                )}
              </div>
              <BarChart
                bars={quantityBars}
                selectedKey={selectedKey}
                onSelect={selectRange}
                color={QUANTITY_COLOR}
                average={averageLine}
                ariaLabel={`Количества в единице ${chartUnit} по ${weekly ? 'неделям' : 'дням'}`}
                hint="Наведи или нажми на столбец, чтобы увидеть сумму"
              />
              <p className="chart-note">
                «?» — событие записано, но количество неизвестно. Штриховка — в сумме есть приблизительные значения.
                {!weekly && showAverage && ' Линия — среднее только по дням с записями в окне из 7 дней; дни без записей в среднее не входят.'}
              </p>
            </>
          ) : (
            <p className="muted small">В выбранном периоде нет записей с известным количеством.</p>
          )}
        </div>
      </section>

      <section className="panel analytics-card">
        <Fold title="Календарь" hint="Оттенок зависит от числа событий за день. Нажми на день, чтобы увидеть записи.">
          <ActivityCalendar
            rows={rows}
            month={month}
            onMonthChange={setMonth}
            selectedDay={selectedKey && selectedKey.split('|')[0] === selectedKey.split('|')[1] ? selectedKey.split('|')[0] : null}
            onSelectDay={key => setSheet(key ? { sid: activeId, kind: 'range', from: key, to: key } : null)}
            todayKey={todayKey}
          />
        </Fold>

        <Fold title="Время приёмов" hint="Когда в течение недели чаще появлялись записи за выбранный период. Нажми на ячейку, чтобы увидеть события.">
          {current.events === 0 ? (
            <p className="muted small">Нет записей в выбранном периоде.</p>
          ) : (
            <div className="heat-grid">
              <div />
              {WEEKDAYS.map(name => <div className="heat-head" key={name}>{name}</div>)}
              <div className="heat-head">Σ</div>
              {BLOCK_LABELS.map((label, block) => (
                <Fragment key={label}>
                  <div className="heat-row-label">{label}</div>
                  {WEEKDAYS.map((name, wd) => {
                    const count = heat[wd][block]
                    const isSelected = selectedCell?.wd === wd && selectedCell.block === block
                    return (
                      <button
                        type="button"
                        key={name}
                        className={[
                          'heat-cell',
                          count > 0 ? `has-count level-${levelOf(count, heatMax)}` : '',
                          isSelected ? 'selected' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => {
                          setSheet(isSelected ? null : { sid: activeId, kind: 'cell', wd, block })
                        }}
                        aria-label={`${WEEKDAYS_LONG[wd]}, ${label} ч: ${eventsWord(count)}`}
                      >
                        {count > 0 ? count : ''}
                      </button>
                    )
                  })}
                  <div className="heat-total">{colTotals[block]}</div>
                </Fragment>
              ))}
              <div className="heat-head">Σ</div>
              {heat.map((dayValues, wd) => (
                <div className="heat-total" key={WEEKDAYS[wd]}>{dayValues.reduce((a, b) => a + b, 0)}</div>
              ))}
              <div className="heat-total">{current.events}</div>
            </div>
          )}
        </Fold>

        <Fold title="Интервалы между событиями" hint="Сколько проходило времени между соседними записями. Интервал может включать события, которых нет в журнале.">
          {current.intervals.length === 0 ? (
            <p className="muted small">Нужно как минимум две записи в выбранном периоде.</p>
          ) : (
            <div className="hist">
              {bins.map(bin => (
                <div className="hist-row" key={bin.label}>
                  <span>{bin.label}</span>
                  <div className="hist-track">
                    <div className="hist-fill" style={{ width: `${(bin.count / binMax) * 100}%` }} />
                  </div>
                  <span className="hist-count">
                    {bin.count} · {Math.round((bin.count / current.intervals.length) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </Fold>

        {previous && (
          <Fold
            title="Сравнение с предыдущим периодом"
            hint={`Сейчас: ${rangeLabel(view.from, view.to)}. Раньше: ${rangeLabel(view.prevFrom, view.prevTo)}.`}
          >
            <table className="compare-table">
              <thead>
                <tr><th /><th>Сейчас</th><th>Раньше</th><th>Разница</th></tr>
              </thead>
              <tbody>
                {compareRows.map(row => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.now}</td>
                    <td>{row.before}</td>
                    <td className="delta">{row.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="chart-note">
              Сравнение отражает только то, что внесено в журнал. Оно зависит от того, насколько полно записи велись в оба периода.
            </p>
          </Fold>
        )}
      </section>

      {sheet && sheet.sid === activeId && (
        <DetailsSheet
          title={sheetTitle}
          subtitle={sheetSubtitle}
          rows={sheetRows}
          multiDay={sheetMultiDay}
          emptyText={sheetEmpty}
          onClose={() => setSheet(null)}
          onEdit={onEditEntry}
          onOpenHistory={sheetJump ? () => onOpenHistory(sheetJump as HistoryJump) : undefined}
        />
      )}
    </div>
  )
}
