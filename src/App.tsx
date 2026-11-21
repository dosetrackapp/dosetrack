import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { builtinSubstanceDefinitions } from './substancesCatalog'
import Analytics, { type HistoryJump } from './Analytics'
import { useDialogs } from './Dialogs'

type Substance = {
  id: string
  name: string
  source: 'builtin' | 'custom'
  archived: boolean
}

type Entry = {
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

type Tab = 'record' | 'history' | 'analytics' | 'substances'

const STORAGE_KEY = 'dosetrack-data-v1'
// Копия исходных данных на случай, если их не удалось прочитать при запуске.
const BACKUP_KEY = 'dosetrack-data-v1-unreadable-backup'

// crypto.randomUUID доступен только в защищённом контексте (HTTPS или localhost).
// При открытии приложения с телефона по адресу вида http://192.168.x.x:5173 его нет.
function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Полный базовый каталог загружается из отдельного файла.
const initialSubstances: Substance[] = builtinSubstanceDefinitions.map(item => ({
  id: item.id,
  name: item.name,
  source: 'builtin',
  archived: false,
}))

type ChoiceOption = {
  icon: string
  label: string
}

type LastChoice = {
  route: string
  form: string
}

type UnitCatalogItem = {
  recommendedUnits: string[]
  defaultUnit: string
}

type SubstanceCatalogItem = {
  routes: string[]
  forms: string[]
  defaultRoute: string
  defaultForm: string
}

const routeOptions: ChoiceOption[] = [
  { icon: '💊', label: 'Перорально' },
  { icon: '👃', label: 'Интраназально' },
  { icon: '🚬', label: 'Курение' },
  { icon: '💉', label: 'Инъекционно' },
  { icon: '🌫️', label: 'Вдыхание паров / газов' },
  { icon: '👅', label: 'Через слизистые' },
  { icon: '🩹', label: 'Трансдермально' },
  { icon: '➕', label: 'Другой способ' },
]

const unitOptions = ['мг', 'мкг', 'г', 'мл', 'таблетки', 'капсулы']

const formOptions: ChoiceOption[] = [
  { icon: '💊', label: 'Таблетка' },
  { icon: '💊', label: 'Капсула' },
  { icon: '🧂', label: 'Порошок / кристаллы' },
  { icon: '🌿', label: 'Растительное сырьё' },
  { icon: '💧', label: 'Жидкость / раствор' },
  { icon: '🟤', label: 'Смола / экстракт / концентрат' },
  { icon: '🍬', label: 'Съедобный продукт' },
  { icon: '🃏', label: 'Марка' },
  { icon: '🌫️', label: 'Газ' },
  { icon: '🧩', label: 'Другая форма' },
]

// В таблице намеренно задано по одному базовому значению для каждого поля.
// Остальные варианты остаются доступны в интерфейсе как альтернативы.
const substanceCatalog: Record<string, SubstanceCatalogItem> = Object.fromEntries(
  builtinSubstanceDefinitions.map(item => [item.id, {
    routes: [item.route],
    forms: [item.form],
    defaultRoute: item.route,
    defaultForm: item.form,
  }]),
)

const unitCatalog: Record<string, UnitCatalogItem> = Object.fromEntries(
  builtinSubstanceDefinitions.map(item => [item.id, {
    recommendedUnits: [item.recordUnit],
    defaultUnit: item.defaultUnit,
  }]),
)

const builtinSubstanceById = new Map<string, (typeof builtinSubstanceDefinitions)[number]>(
  builtinSubstanceDefinitions.map(item => [item.id, item]),
)

const catalogIdToStableId: Record<string, string> = {
  sub_042: 'pregabalin',
  sub_043: 'gabapentin',
  sub_069: 'sertraline',
}

function normalizeSubstanceTerm(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
}

type SubstanceMatch = { item: Substance; rank: number; alias?: string }

// Поиск по основному и альтернативным названиям.
// rank: 0 — точное название, 1 — точный синоним, 2/3 — начало названия/синонима,
// 4/5 — вхождение в название/синоним. Порядок внутри ранга — порядок каталога.
function rankSubstances(query: string, pool: Substance[]): SubstanceMatch[] {
  const q = normalizeSubstanceTerm(query)
  if (!q) return []

  const matches: Array<SubstanceMatch & { order: number }> = []

  pool.forEach((item, order) => {
    const name = normalizeSubstanceTerm(item.name)
    const aliases = (builtinSubstanceById.get(item.id)?.aliases ?? []).map(raw => ({
      raw,
      value: normalizeSubstanceTerm(raw),
    }))

    let rank = -1
    let alias: string | undefined

    if (name === q) {
      rank = 0
    } else {
      const exactAlias = aliases.find(a => a.value === q)
      const startAlias = aliases.find(a => a.value.startsWith(q))
      const includeAlias = aliases.find(a => a.value.includes(q))
      if (exactAlias) { rank = 1; alias = exactAlias.raw }
      else if (name.startsWith(q)) rank = 2
      else if (startAlias) { rank = 3; alias = startAlias.raw }
      else if (name.includes(q)) rank = 4
      else if (includeAlias) { rank = 5; alias = includeAlias.raw }
    }

    if (rank < 0) return
    if (alias && name.includes(q)) alias = undefined
    matches.push({ item, rank, alias, order })
  })

  matches.sort((a, b) => a.rank - b.rank || a.order - b.order)
  return matches.map(({ item, rank, alias }) => ({ item, rank, alias }))
}

// Однозначное точное совпадение по названию или синониму (иначе — пустой или неоднозначный результат).
function resolveExactSubstances(text: string, pool: Substance[]): Substance[] {
  const exact = rankSubstances(text, pool).filter(match => match.rank <= 1)
  const byName = exact.filter(match => match.rank === 0)
  return (byName.length > 0 ? byName : exact).map(match => match.item)
}

function findBuiltinByName(value: string) {
  const normalized = normalizeSubstanceTerm(value)
  return builtinSubstanceDefinitions.find(item =>
    normalizeSubstanceTerm(item.name) === normalized,
  )
}

function findBuiltinMatchesByNameOrAlias(value: string) {
  const normalized = normalizeSubstanceTerm(value)
  const exactNames = builtinSubstanceDefinitions.filter(item =>
    normalizeSubstanceTerm(item.name) === normalized,
  )
  if (exactNames.length > 0) return exactNames

  return builtinSubstanceDefinitions.filter(item =>
    item.aliases.some(alias => normalizeSubstanceTerm(alias) === normalized),
  )
}

function suggestedUnit(substanceId: string, lastUnitChoices: Record<string, string>): string {
  return lastUnitChoices[substanceId] || unitCatalog[substanceId]?.defaultUnit || 'мг'
}

function suggestedChoices(substanceId: string, lastChoices: Record<string, LastChoice>): LastChoice {
  const previous = lastChoices[substanceId]
  if (previous) return previous

  const catalogItem = substanceCatalog[substanceId]
  return {
    route: catalogItem?.defaultRoute ?? '',
    form: catalogItem?.defaultForm ?? '',
  }
}

function loadStoredData(): {
  substances: Substance[]
  entries: Entry[]
  customRoutes: string[]
  customForms: string[]
  lastChoices: Record<string, LastChoice>
  customUnits: string[]
  lastUnitChoices: Record<string, string>
  deletedCustomRoutes: string[]
  deletedCustomForms: string[]
  deletedCustomUnits: string[]
} {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : null
    const storedSubstances = Array.isArray(parsed?.substances) ? parsed.substances : []

    const idRemap: Record<string, string> = {}
    const archivedByBuiltinId: Record<string, boolean> = {}
    const customById = new Map<string, Substance>()

    // Миграция прежних встроенных ID и защита от дубликатов,
    // если пользователь ранее вручную добавил вещество из нового каталога.
    for (const item of storedSubstances) {
      if (!item || typeof item.id !== 'string' || typeof item.name !== 'string') continue

      const canonicalId = catalogIdToStableId[item.id] ?? item.id
      const builtinById = builtinSubstanceById.get(canonicalId)
      const builtinByName = findBuiltinByName(item.name)
      const builtin = builtinById ?? builtinByName

      if (builtin) {
        idRemap[item.id] = builtin.id
        if (builtinById || archivedByBuiltinId[builtin.id] === undefined) {
          archivedByBuiltinId[builtin.id] = Boolean(item.archived)
        }
      } else {
        customById.set(item.id, {
          id: item.id,
          name: item.name,
          source: 'custom',
          archived: Boolean(item.archived),
        })
      }
    }

    const builtins: Substance[] = initialSubstances.map(item => ({
      ...item,
      archived: archivedByBuiltinId[item.id] ?? false,
    }))
    const builtinNames = new Set(builtins.map(item => normalizeSubstanceTerm(item.name)))
    const custom = [...customById.values()].filter(item =>
      !builtinNames.has(normalizeSubstanceTerm(item.name)),
    )

    const rawEntries: Array<Record<string, any>> = Array.isArray(parsed?.entries)
      ? parsed.entries.filter((value: unknown) => value && typeof value === 'object')
      : []
    const entries: Entry[] = rawEntries.map(entry => {
      const storedId = typeof entry.substanceId === 'string' ? entry.substanceId : ''
      let substanceId = idRemap[storedId] ?? catalogIdToStableId[storedId] ?? storedId
      const builtinById = builtinSubstanceById.get(substanceId)
      const builtinByName = !builtinById && typeof entry.substanceName === 'string'
        ? findBuiltinByName(entry.substanceName)
        : undefined
      if (builtinByName) substanceId = builtinByName.id
      const builtin = builtinById ?? builtinByName

      const isValidDate = (value: unknown): value is string =>
        typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
      const takenAt = isValidDate(entry.takenAt)
        ? entry.takenAt
        : isValidDate(entry.createdAt) ? entry.createdAt : new Date(0).toISOString()
      const amount = typeof entry.amount === 'number' && Number.isFinite(entry.amount)
        ? entry.amount
        : null

      return {
        ...entry,
        id: typeof entry.id === 'string' && entry.id ? entry.id : makeId(),
        substanceId,
        substanceName: builtin?.name ?? (typeof entry.substanceName === 'string' ? entry.substanceName : ''),
        amount,
        unit: typeof entry.unit === 'string' && entry.unit.trim() ? entry.unit : 'мг',
        takenAt,
        createdAt: isValidDate(entry.createdAt) ? entry.createdAt : takenAt,
        route: typeof entry.route === 'string' ? entry.route : '',
        form: typeof entry.form === 'string' ? entry.form : '',
        comment: typeof entry.comment === 'string' ? entry.comment : '',
        approximate: Boolean(entry.approximate),
        // Неизвестное количество не превращается в ноль.
        unknown: Boolean(entry.unknown) || amount === null,
      }
    })

    const deletedCustomRoutes: string[] = Array.isArray(parsed?.deletedCustomRoutes)
      ? [...new Set<string>(parsed.deletedCustomRoutes.filter((value: unknown): value is string => typeof value === 'string'))]
      : []
    const deletedCustomForms: string[] = Array.isArray(parsed?.deletedCustomForms)
      ? [...new Set<string>(parsed.deletedCustomForms.filter((value: unknown): value is string => typeof value === 'string'))]
      : []
    const deletedCustomUnits: string[] = Array.isArray(parsed?.deletedCustomUnits)
      ? [...new Set<string>(parsed.deletedCustomUnits.filter((value: unknown): value is string => typeof value === 'string'))]
      : []

    const savedRoutes = Array.isArray(parsed?.customRoutes)
      ? parsed.customRoutes.filter((value: unknown): value is string => typeof value === 'string')
      : []
    const legacyRoutes = entries
      .map(entry => typeof entry.route === 'string' ? entry.route.trim() : '')
      .filter(value => value && !routeOptions.some(option => option.label === value))
    const customRoutes = [...new Set([...savedRoutes, ...legacyRoutes])]
      .filter(value => !deletedCustomRoutes.includes(value))

    const savedForms = Array.isArray(parsed?.customForms)
      ? parsed.customForms.filter((value: unknown): value is string => typeof value === 'string' && Boolean(value.trim()))
      : []
    const legacyForms = entries
      .map(entry => typeof entry.form === 'string' ? entry.form.trim() : '')
      .filter(value => value && !formOptions.some(option => option.label === value))
    const customForms = [...new Set([...savedForms, ...legacyForms])]
      .filter(value => !deletedCustomForms.includes(value))

    const savedCustomUnits = Array.isArray(parsed?.customUnits)
      ? parsed.customUnits.filter((value: unknown): value is string => typeof value === 'string' && Boolean(value.trim()))
      : []
    const legacyUnits = entries
      .map(entry => typeof entry.unit === 'string' ? entry.unit.trim() : '')
      .filter(value => value && !unitOptions.includes(value))
    const customUnits = [...new Set([...savedCustomUnits, ...legacyUnits])]
      .filter(value => !deletedCustomUnits.includes(value))

    const canonicalizeSubstanceId = (id: string) => idRemap[id] ?? catalogIdToStableId[id] ?? id

    const lastUnitChoices: Record<string, string> = {}
    if (parsed?.lastUnitChoices && typeof parsed.lastUnitChoices === 'object') {
      for (const [id, value] of Object.entries(parsed.lastUnitChoices as Record<string, unknown>)) {
        if (typeof value === 'string' && value.trim() && !deletedCustomUnits.includes(value)) {
          lastUnitChoices[canonicalizeSubstanceId(id)] = value
        }
      }
    }

    const lastChoices: Record<string, LastChoice> = {}
    if (parsed?.lastChoices && typeof parsed.lastChoices === 'object') {
      for (const [id, value] of Object.entries(parsed.lastChoices as Record<string, any>)) {
        if (value && typeof value === 'object') {
          const canonicalId = canonicalizeSubstanceId(id)
          const route = typeof value.route === 'string' ? value.route : ''
          const form = typeof value.form === 'string' ? value.form : ''
          lastChoices[canonicalId] = {
            route: deletedCustomRoutes.includes(route) ? (substanceCatalog[canonicalId]?.defaultRoute ?? '') : route,
            form: deletedCustomForms.includes(form) ? (substanceCatalog[canonicalId]?.defaultForm ?? '') : form,
          }
        }
      }
    }

    return {
      substances: [...builtins, ...custom],
      entries,
      customRoutes,
      customForms,
      lastChoices,
      customUnits,
      lastUnitChoices,
      deletedCustomRoutes,
      deletedCustomForms,
      deletedCustomUnits,
    }
  } catch (error) {
    console.error('DoseTrack: не удалось прочитать сохранённые данные', error)
    // Не даём следующему автосохранению молча затереть данные, которые не удалось разобрать.
    try {
      if (saved && !localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, saved)
    } catch {
      // Резервная копия — лучшее из возможного.
    }
    return {
      substances: initialSubstances,
      entries: [],
      customRoutes: [],
      customForms: [],
      lastChoices: {},
      customUnits: [],
      lastUnitChoices: {},
      deletedCustomRoutes: [],
      deletedCustomForms: [],
      deletedCustomUnits: [],
    }
  }
}

function localDateTime() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toLocalDateTime(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function localDayKey(value: string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 3,
  }).format(value)
}

function App() {
  // Собственные диалоги вместо alert / confirm / prompt (в Telegram WebView они ненадёжны).
  const { alert: showAlert, confirm: showConfirm, prompt: showPrompt } = useDialogs()

  const [initialData] = useState(() => loadStoredData())
  const [substances, setSubstances] = useState<Substance[]>(initialData.substances)
  const [entries, setEntries] = useState<Entry[]>(initialData.entries)
  const [customRoutes, setCustomRoutes] = useState<string[]>(initialData.customRoutes)
  const [customForms, setCustomForms] = useState<string[]>(initialData.customForms)
  const [lastChoices, setLastChoices] = useState<Record<string, LastChoice>>(initialData.lastChoices)
  const [customUnits, setCustomUnits] = useState<string[]>(initialData.customUnits)
  const [lastUnitChoices, setLastUnitChoices] = useState<Record<string, string>>(initialData.lastUnitChoices)
  const [deletedCustomRoutes, setDeletedCustomRoutes] = useState<string[]>(initialData.deletedCustomRoutes)
  const [deletedCustomForms, setDeletedCustomForms] = useState<string[]>(initialData.deletedCustomForms)
  const [deletedCustomUnits, setDeletedCustomUnits] = useState<string[]>(initialData.deletedCustomUnits)

  const [tab, setTab] = useState<Tab>('record')
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)

  // Фильтры журнала — не влияют на сохранённые записи.
  const [historySearch, setHistorySearch] = useState('')
  const [historySubstanceFilter, setHistorySubstanceFilter] = useState('all')
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')
  const [historySort, setHistorySort] = useState<
    'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
  >('date-desc')

  const [substanceSearch, setSubstanceSearch] = useState('')
  const [substanceDropdownOpen, setSubstanceDropdownOpen] = useState(false)
  // Единственный источник правды о выбранном веществе: substanceId.
  // Текст поля (substanceSearch) всегда должен совпадать с названием выбранного вещества,
  // иначе substanceId сбрасывается.
  const [substanceId, setSubstanceId] = useState('')
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [substanceError, setSubstanceError] = useState('')
  const substanceInputRef = useRef<HTMLInputElement>(null)
  // Для какого вещества в форму подставлены значения по умолчанию (единица, способ, форма).
  const defaultsForIdRef = useRef('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState(() => suggestedUnit('', initialData.lastUnitChoices))
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false)
  const [customUnitDraft, setCustomUnitDraft] = useState('')
  const [takenAt, setTakenAt] = useState(localDateTime())
  const [route, setRoute] = useState('')
  const [form, setForm] = useState('')
  const [routeExpanded, setRouteExpanded] = useState(false)
  const [formExpanded, setFormExpanded] = useState(false)
  const [showCustomRouteInput, setShowCustomRouteInput] = useState(false)
  const [showCustomFormInput, setShowCustomFormInput] = useState(false)
  const [customRouteDraft, setCustomRouteDraft] = useState('')
  const [customFormDraft, setCustomFormDraft] = useState('')
  const [comment, setComment] = useState('')
  const [approximate, setApproximate] = useState(false)
  const [unknown, setUnknown] = useState(false)

  const activeSubstances = useMemo(
    () => substances.filter(item => !item.archived),
    [substances],
  )

  const visibleEntries = useMemo(() => {
    const activeIds = new Set(activeSubstances.map(item => item.id))
    return entries.filter(entry => activeIds.has(entry.substanceId))
  }, [entries, activeSubstances])

  const selectedCatalog = substanceCatalog[substanceId]
  const selectedUnitCatalog = unitCatalog[substanceId]
  const editingOriginalEntry = editingEntryId
    ? entries.find(entry => entry.id === editingEntryId)
    : undefined
  const availableUnits = [
    ...(selectedUnitCatalog?.recommendedUnits ?? unitOptions),
    ...unitOptions.filter(option => !(selectedUnitCatalog?.recommendedUnits ?? unitOptions).includes(option)),
    ...customUnits.filter(option => !unitOptions.includes(option) && !deletedCustomUnits.includes(option)),
  ]
  // Единица из редактируемой записи всегда остаётся доступной, даже если её убрали из списка.
  if (unit && !availableUnits.includes(unit)) {
    availableUnits.unshift(unit)
  }
  // Сначала показываем характерные для вещества варианты, но не скрываем остальные.
  const availableRouteOptions = selectedCatalog
    ? [...routeOptions.filter(option => selectedCatalog.routes.includes(option.label)), ...routeOptions.filter(option => !selectedCatalog.routes.includes(option.label))]
    : routeOptions
  const availableFormOptions = selectedCatalog
    ? [...formOptions.filter(option => selectedCatalog.forms.includes(option.label)), ...formOptions.filter(option => !selectedCatalog.forms.includes(option.label))]
    : formOptions

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ substances, entries, customRoutes, customForms, lastChoices, customUnits, lastUnitChoices, deletedCustomRoutes, deletedCustomForms, deletedCustomUnits }),
      )
    } catch (error) {
      // Переполнение хранилища или запрет доступа не должны ломать интерфейс.
      console.error('DoseTrack: не удалось сохранить данные', error)
    }
  }, [substances, entries, customRoutes, customForms, lastChoices, customUnits, lastUnitChoices, deletedCustomRoutes, deletedCustomForms, deletedCustomUnits])


  useEffect(() => {
    if (activeSuggestionIndex < 0) return
    document.getElementById(`substance-option-${activeSuggestionIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeSuggestionIndex])

  // Поиск, фильтрация и сортировка записей истории.
  const filteredHistoryEntries = useMemo(() => {
    const query = historySearch.trim().toLocaleLowerCase('ru-RU')

    const result = visibleEntries.filter(entry => {
      if (
        historySubstanceFilter !== 'all' &&
        entry.substanceId !== historySubstanceFilter
      ) {
        return false
      }

      const day = localDayKey(entry.takenAt)

      if (historyDateFrom && day < historyDateFrom) return false
      if (historyDateTo && day > historyDateTo) return false

      if (query) {
        const searchableText = [
          entry.substanceName,
          entry.comment,
          entry.route,
          entry.form ?? '',
          entry.amount === null ? '' : String(entry.amount),
          entry.unit,
          entry.unknown ? 'неизвестно' : '',
          entry.approximate ? 'примерно приблизительно' : '',
        ].join(' ').toLocaleLowerCase('ru-RU')

        if (!searchableText.includes(query)) return false
      }

      return true
    })

    result.sort((a, b) => {
      if (historySort === 'date-asc') {
        return a.takenAt.localeCompare(b.takenAt)
      }

      if (historySort === 'amount-desc' || historySort === 'amount-asc') {
        // Разные единицы не сравниваются напрямую: сначала группируем по единице.
        if (a.unit !== b.unit) {
          return a.unit.localeCompare(b.unit, 'ru-RU')
        }

        // Записи с неизвестным количеством остаются в конце своей группы.
        if (a.amount === null && b.amount !== null) return 1
        if (a.amount !== null && b.amount === null) return -1
        if (a.amount === null && b.amount === null) {
          return b.takenAt.localeCompare(a.takenAt)
        }

        const difference = (a.amount ?? 0) - (b.amount ?? 0)
        return historySort === 'amount-asc' ? difference : -difference
      }

      return b.takenAt.localeCompare(a.takenAt)
    })

    return result
  }, [
    visibleEntries,
    historySearch,
    historySubstanceFilter,
    historyDateFrom,
    historyDateTo,
    historySort,
  ])

  function resetHistoryFilters() {
    setHistorySearch('')
    setHistorySubstanceFilter('all')
    setHistoryDateFrom('')
    setHistoryDateTo('')
    setHistorySort('date-desc')
  }

  // Вещества, доступные для выбора: активные + вещество редактируемой записи (даже если оно в архиве).
  function selectableSubstances(): Substance[] {
    const originalSubstanceId = editingEntryId
      ? entries.find(entry => entry.id === editingEntryId)?.substanceId
      : undefined
    return substances.filter(item => !item.archived || item.id === originalSubstanceId)
  }

  function applyDefaultsFor(id: string) {
    const suggestion = suggestedChoices(id, lastChoices)
    setUnit(suggestedUnit(id, lastUnitChoices))
    setShowCustomUnitInput(false)
    setCustomUnitDraft('')
    setRoute(suggestion.route)
    setForm(suggestion.form)
    setRouteExpanded(false)
    setFormExpanded(false)
    setShowCustomRouteInput(false)
    setShowCustomFormInput(false)
  }

  function chooseSubstance(nextId: string) {
    const nextSubstance = substances.find(item => item.id === nextId)
    if (!nextSubstance) return

    setSubstanceId(nextId)
    setSubstanceSearch(nextSubstance.name)
    setSubstanceDropdownOpen(false)
    setActiveSuggestionIndex(-1)
    setSubstanceError('')

    // Если пользователь стёр часть текста и снова выбрал то же вещество,
    // уже выбранные единица, способ и форма не затираются.
    if (defaultsForIdRef.current === nextId) return
    defaultsForIdRef.current = nextId
    applyDefaultsFor(nextId)
  }

  function addSubstance(name: string) {
    const cleanName = name.trim().replace(/\s+/g, ' ')
    if (!cleanName) return

    const warnArchived = () => {
      setSubstanceError('Это вещество находится в архиве. Восстанови его на вкладке «Вещества».')
      setSubstanceDropdownOpen(false)
    }

    const builtinMatches = findBuiltinMatchesByNameOrAlias(cleanName)
    if (builtinMatches.length === 1) {
      const builtin = substances.find(item => item.id === builtinMatches[0].id)
      if (builtin?.archived && builtin.id !== editingOriginalEntry?.substanceId) {
        warnArchived()
        return
      }
      chooseSubstance(builtinMatches[0].id)
      return
    }
    if (builtinMatches.length > 1) {
      setSubstanceDropdownOpen(true)
      return
    }

    const existing = substances.find(
      item => normalizeSubstanceTerm(item.name) === normalizeSubstanceTerm(cleanName),
    )
    if (existing) {
      if (existing.archived && existing.id !== editingOriginalEntry?.substanceId) {
        warnArchived()
        return
      }
      chooseSubstance(existing.id)
      return
    }

    const newSubstance: Substance = {
      id: makeId(),
      name: cleanName,
      source: 'custom',
      archived: false,
    }

    setSubstances(previous => [...previous, newSubstance])
    setSubstanceId(newSubstance.id)
    setSubstanceSearch(cleanName)
    setSubstanceDropdownOpen(false)
    setActiveSuggestionIndex(-1)
    setSubstanceError('')
    defaultsForIdRef.current = newSubstance.id
    applyDefaultsFor(newSubstance.id)
  }

  // При уходе из поля: закрываем подсказки и, если введено точное название
  // (или однозначный синоним), выбираем вещество. Частичный ввод не угадываем.
  function reconcileSubstanceText() {
    setSubstanceDropdownOpen(false)
    setActiveSuggestionIndex(-1)
    if (!substanceSearch.trim() || substanceId) return
    const exact = resolveExactSubstances(substanceSearch, selectableSubstances())
    if (exact.length === 1) chooseSubstance(exact[0].id)
  }

  function resetForm() {
    setEditingEntryId(null)
    setSubstanceId('')
    setSubstanceSearch('')
    setSubstanceDropdownOpen(false)
    setActiveSuggestionIndex(-1)
    setSubstanceError('')
    defaultsForIdRef.current = ''
    setAmount('')
    setUnit(suggestedUnit('', lastUnitChoices))
    setShowCustomUnitInput(false)
    setCustomUnitDraft('')
    setTakenAt(localDateTime())
    setRoute('')
    setForm('')
    setRouteExpanded(false)
    setFormExpanded(false)
    setShowCustomRouteInput(false)
    setShowCustomFormInput(false)
    setCustomRouteDraft('')
    setCustomFormDraft('')
    setComment('')
    setApproximate(false)
    setUnknown(false)
  }

  async function renameCustomSubstance(id: string) {
    const substance = substances.find(item => item.id === id)
    if (!substance || substance.source !== 'custom') return

    const name = await showPrompt('Новое название вещества:', substance.name)
    if (!name?.trim()) return

    const cleanName = name.trim().replace(/\s+/g, ' ')

    if (substances.some(
      item =>
        item.id !== id &&
        normalizeSubstanceTerm(item.name) === normalizeSubstanceTerm(cleanName),
    ) || findBuiltinMatchesByNameOrAlias(cleanName).length > 0) {
      void showAlert('Такое название уже используется (в том числе как название или синоним базового вещества).')
      return
    }

    setSubstances(previous => previous.map(item =>
      item.id === id ? { ...item, name: cleanName } : item,
    ))
    setEntries(previous => previous.map(entry =>
      entry.substanceId === id ? { ...entry, substanceName: cleanName } : entry,
    ))
    // Текст в поле формы должен соответствовать выбранному веществу.
    if (substanceId === id) setSubstanceSearch(cleanName)
  }

  async function archiveSubstance(id: string) {
    const substance = substances.find(item => item.id === id)
    if (!substance || substance.archived) return

    if (!(await showConfirm(
      `Архивировать «${substance.name}»? Оно исчезнет из журнала и аналитики, но все записи сохранятся. Вещество можно будет восстановить.`,
    ))) return

    setSubstances(previous => previous.map(item =>
      item.id === id ? { ...item, archived: true } : item,
    ))

    if (substanceId === id && !editingEntryId) {
      // Не переносим уже заполненную форму на другое вещество автоматически.
      setSubstanceId('')
      setSubstanceSearch('')
      defaultsForIdRef.current = ''
    }

    if (historySubstanceFilter === id) {
      setHistorySubstanceFilter('all')
    }
  }

  function restoreSubstance(id: string) {
    setSubstances(previous => previous.map(item =>
      item.id === id ? { ...item, archived: false } : item,
    ))
  }

  async function clearSubstanceHistory(id: string) {
    const substance = substances.find(item => item.id === id)
    if (!substance) return

    const count = entries.filter(entry => entry.substanceId === id).length
    if (count === 0) {
      void showAlert('У этого вещества пока нет записей.')
      return
    }

    if (!(await showConfirm(
      `Удалить всю историю приёма «${substance.name}» (${count} ${count === 1 ? 'запись' : 'записей'})? Само вещество останется в списке. Это действие нельзя отменить.`,
    ))) return

    setEntries(previous => previous.filter(entry => entry.substanceId !== id))
    if (entries.some(entry => entry.id === editingEntryId && entry.substanceId === id)) {
      resetForm()
      setTab('history')
    }
  }

  async function deleteCustomSubstance(id: string) {
    const substance = substances.find(item => item.id === id)
    if (!substance || substance.source !== 'custom') return

    const count = entries.filter(entry => entry.substanceId === id).length
    const details = count > 0
      ? ` Вместе с веществом будут удалены все связанные записи (${count}).`
      : ''

    if (!(await showConfirm(
      `Полностью удалить пользовательское вещество «${substance.name}»?${details} Это действие нельзя отменить.`,
    ))) return

    setSubstances(previous => previous.filter(item => item.id !== id))
    setEntries(previous => previous.filter(entry => entry.substanceId !== id))
    setLastChoices(previous => {
      const next = { ...previous }
      delete next[id]
      return next
    })
    setLastUnitChoices(previous => {
      const next = { ...previous }
      delete next[id]
      return next
    })

    if (substanceId === id || entries.some(entry => entry.id === editingEntryId && entry.substanceId === id)) {
      resetForm()
    }

    if (historySubstanceFilter === id) {
      setHistorySubstanceFilter('all')
    }
  }

  async function deleteCustomRoute(value: string) {
    if (!customRoutes.includes(value)) return
    const count = entries.filter(entry => entry.route === value).length
    const details = count ? ` В ${count} ${count === 1 ? 'записи' : 'записях'} это значение останется без изменений.` : ''
    if (!(await showConfirm(`Удалить пользовательский способ «${value}»?${details} Он больше не будет доступен для новых записей.`))) return

    setCustomRoutes(previous => previous.filter(item => item !== value))
    setDeletedCustomRoutes(previous => [...new Set([...previous, value])])
    setLastChoices(previous => Object.fromEntries(Object.entries(previous).map(([id, choice]) => [id, {
      ...choice,
      route: choice.route === value ? (substanceCatalog[id]?.defaultRoute ?? '') : choice.route,
    }])))
    if (!(editingOriginalEntry?.route === value)) setRoute(current => current === value ? (substanceCatalog[substanceId]?.defaultRoute ?? '') : current)
  }

  async function deleteCustomForm(value: string) {
    if (!customForms.includes(value)) return
    const count = entries.filter(entry => (entry.form ?? '') === value).length
    const details = count ? ` В ${count} ${count === 1 ? 'записи' : 'записях'} это значение останется без изменений.` : ''
    if (!(await showConfirm(`Удалить пользовательскую форму «${value}»?${details} Она больше не будет доступна для новых записей.`))) return

    setCustomForms(previous => previous.filter(item => item !== value))
    setDeletedCustomForms(previous => [...new Set([...previous, value])])
    setLastChoices(previous => Object.fromEntries(Object.entries(previous).map(([id, choice]) => [id, {
      ...choice,
      form: choice.form === value ? (substanceCatalog[id]?.defaultForm ?? '') : choice.form,
    }])))
    if (!(editingOriginalEntry?.form === value)) setForm(current => current === value ? (substanceCatalog[substanceId]?.defaultForm ?? '') : current)
  }

  async function deleteCustomUnit(value: string) {
    if (!customUnits.includes(value) || unitOptions.includes(value)) return
    const count = entries.filter(entry => entry.unit === value).length
    const details = count ? ` В ${count} ${count === 1 ? 'записи' : 'записях'} исходная единица останется без изменений.` : ''
    if (!(await showConfirm(`Удалить пользовательскую единицу «${value}»?${details} Она больше не будет доступна для новых записей.`))) return

    setCustomUnits(previous => previous.filter(item => item !== value))
    setDeletedCustomUnits(previous => [...new Set([...previous, value])])
    setLastUnitChoices(previous => Object.fromEntries(Object.entries(previous).map(([id, choice]) => [id, choice === value ? '' : choice])))
    if (!(editingOriginalEntry?.unit === value)) setUnit(current => current === value ? (unitCatalog[substanceId]?.defaultUnit ?? 'мг') : current)
  }

  function startEditing(entry: Entry) {
    setEditingEntryId(entry.id)
    setSubstanceId(entry.substanceId)
    setSubstanceSearch(substances.find(item => item.id === entry.substanceId)?.name ?? entry.substanceName)
    setSubstanceDropdownOpen(false)
    setActiveSuggestionIndex(-1)
    setSubstanceError('')
    defaultsForIdRef.current = entry.substanceId
    setShowCustomUnitInput(false)
    setCustomUnitDraft('')
    setRouteExpanded(false)
    setFormExpanded(false)
    setAmount(entry.amount === null ? '' : String(entry.amount))
    setUnit(entry.unit)
    setTakenAt(toLocalDateTime(entry.takenAt))
    setRoute(entry.route)
    setForm(entry.form ?? '')
    setShowCustomRouteInput(false)
    setShowCustomFormInput(false)
    setCustomRouteDraft('')
    setCustomFormDraft('')
    setComment(entry.comment)
    setApproximate(entry.approximate)
    setUnknown(entry.unknown)
    setTab('record')
  }

  function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Проверяем, что текст поля действительно соответствует выбранному веществу.
    let substance = substances.find(item => item.id === substanceId)
    if (!substance || normalizeSubstanceTerm(substance.name) !== normalizeSubstanceTerm(substanceSearch)) {
      const exact = resolveExactSubstances(substanceSearch, selectableSubstances())
      if (exact.length === 1) {
        substance = exact[0]
      } else {
        setSubstanceId('')
        setSubstanceError(
          exact.length > 1
            ? 'Это название подходит нескольким веществам — выбери нужное из списка.'
            : substanceSearch.trim()
              ? 'Такого вещества нет в списке. Выбери подсказку или добавь своё вещество.'
              : 'Выбери вещество.',
        )
        setSubstanceDropdownOpen(true)
        substanceInputRef.current?.focus()
        return
      }
    }
    const targetId = substance.id

    const originalEntry = editingEntryId
      ? entries.find(entry => entry.id === editingEntryId)
      : undefined

    if (substance.archived && originalEntry?.substanceId !== targetId) {
      void showAlert('Это вещество находится в архиве. Восстанови его, чтобы создавать новые записи.')
      return
    }

    if (!unknown && (
      amount.trim() === '' ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) < 0
    )) {
      void showAlert('Укажи корректное количество или отметь, что оно неизвестно.')
      return
    }

    if (!takenAt || Number.isNaN(new Date(takenAt).getTime())) {
      void showAlert('Укажи корректную дату и время.')
      return
    }

    setLastChoices(previous => ({
      ...previous,
      [targetId]: {
        route: deletedCustomRoutes.includes(route.trim()) ? (substanceCatalog[targetId]?.defaultRoute ?? '') : route.trim(),
        form: deletedCustomForms.includes(form.trim()) ? (substanceCatalog[targetId]?.defaultForm ?? '') : form.trim(),
      },
    }))
    if (!deletedCustomUnits.includes(unit)) {
      setLastUnitChoices(previous => ({ ...previous, [targetId]: unit }))
    }

    if (editingEntryId) {
      setEntries(previous => previous.map(entry =>
        entry.id === editingEntryId
          ? {
              ...entry,
              substanceId: targetId,
              substanceName: substance.name,
              amount: unknown ? null : Number(amount),
              unit,
              takenAt: new Date(takenAt).toISOString(),
              route: route.trim(),
              form: form.trim(),
              comment: comment.trim(),
              approximate,
              unknown,
            }
          : entry,
      ))
    } else {
      const entry: Entry = {
        id: makeId(),
        substanceId: targetId,
        substanceName: substance.name,
        amount: unknown ? null : Number(amount),
        unit,
        takenAt: new Date(takenAt).toISOString(),
        createdAt: new Date().toISOString(),
        route: route.trim(),
        form: form.trim(),
        comment: comment.trim(),
        approximate,
        unknown,
      }

      setEntries(previous => [...previous, entry])
    }

    resetForm()
    setTab('history')
  }

  async function deleteEntry(id: string) {
    if (await showConfirm('Удалить эту запись?')) {
      setEntries(previous => previous.filter(item => item.id !== id))
    }
  }

  // Переходы из аналитики: открыть запись на редактирование / отфильтрованную историю.
  function editEntryById(id: string) {
    const entry = entries.find(item => item.id === id)
    if (entry) startEditing(entry)
  }

  function openHistoryFor(jump: HistoryJump) {
    setHistorySearch('')
    setHistorySubstanceFilter(jump.substanceId)
    setHistoryDateFrom(jump.from)
    setHistoryDateTo(jump.to)
    setHistorySort('date-desc')
    setTab('history')
  }

  function renderRecord() {
    const isEditing = editingEntryId !== null
    const pool = selectableSubstances()
    const normalizedSearch = normalizeSubstanceTerm(substanceSearch)
    const ranked = rankSubstances(substanceSearch, pool)
    // Архивные вещества не предлагаются для выбора, но объясняем, почему их нет в списке.
    const archivedMatches = normalizedSearch
      ? rankSubstances(
          substanceSearch,
          substances.filter(item => item.archived && !pool.some(option => option.id === item.id)),
        ).slice(0, 3)
      : []
    const canAddCustom = Boolean(normalizedSearch)
      && !substances.some(item => normalizeSubstanceTerm(item.name) === normalizedSearch)
      && findBuiltinMatchesByNameOrAlias(substanceSearch).length === 0
    const rowCount = ranked.length + (canAddCustom ? 1 : 0)
    const showSubstanceSuggestions = substanceDropdownOpen && Boolean(normalizedSearch)

    function activateSuggestion(index: number) {
      if (index < ranked.length) chooseSubstance(ranked[index].item.id)
      else addSubstance(substanceSearch)
    }

    return (
      <>
        <div className="page-heading">
          <div className="eyebrow">
            {isEditing ? 'РЕДАКТИРОВАНИЕ СОБЫТИЯ' : 'НОВОЕ СОБЫТИЕ'}
          </div>
          <h1>{isEditing ? 'Изменить запись' : 'Записать приём'}</h1>
          <p>
            {isEditing
              ? 'Исправь необходимые данные и сохрани изменения.'
              : 'Фиксируй факты без оценок и морализаторства.'}
          </p>
        </div>

        <form className="panel" onSubmit={saveEntry}>
          <label htmlFor="substance-autocomplete">Вещество или препарат</label>
          <div className="substance-autocomplete">
            <input
              id="substance-autocomplete"
              ref={substanceInputRef}
              className="substance-search"
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showSubstanceSuggestions}
              aria-controls="substance-suggestions"
              aria-activedescendant={
                showSubstanceSuggestions && activeSuggestionIndex >= 0 && activeSuggestionIndex < rowCount
                  ? `substance-option-${activeSuggestionIndex}`
                  : undefined
              }
              aria-invalid={Boolean(substanceError)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={substanceSearch}
              onFocus={() => {
                if (!substanceId && substanceSearch.trim()) setSubstanceDropdownOpen(true)
              }}
              onBlur={reconcileSubstanceText}
              onChange={event => {
                const value = event.target.value
                setSubstanceSearch(value)
                setSubstanceDropdownOpen(true)
                setActiveSuggestionIndex(-1)
                setSubstanceError('')
                // Текст изменился — прежний выбор больше недействителен.
                const selected = substances.find(item => item.id === substanceId)
                if (!selected || normalizeSubstanceTerm(selected.name) !== normalizeSubstanceTerm(value)) {
                  setSubstanceId('')
                }
              }}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  if (showSubstanceSuggestions) {
                    event.preventDefault()
                    setSubstanceDropdownOpen(false)
                    setActiveSuggestionIndex(-1)
                  }
                  return
                }

                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  if (!normalizedSearch || rowCount === 0) return
                  event.preventDefault()
                  const step = event.key === 'ArrowDown' ? 1 : -1
                  if (!substanceDropdownOpen) {
                    setSubstanceDropdownOpen(true)
                    setActiveSuggestionIndex(step > 0 ? 0 : rowCount - 1)
                    return
                  }
                  setActiveSuggestionIndex(current =>
                    current < 0
                      ? (step > 0 ? 0 : rowCount - 1)
                      : (current + step + rowCount) % rowCount,
                  )
                  return
                }

                if (event.key === 'Enter' && showSubstanceSuggestions) {
                  // Пока открыт список, Enter выбирает вещество и не отправляет форму.
                  event.preventDefault()
                  if (activeSuggestionIndex >= 0 && activeSuggestionIndex < rowCount) {
                    activateSuggestion(activeSuggestionIndex)
                    return
                  }
                  const exact = resolveExactSubstances(substanceSearch, pool)
                  if (exact.length === 1) {
                    chooseSubstance(exact[0].id)
                  } else if (ranked.length === 1) {
                    chooseSubstance(ranked[0].item.id)
                  } else if (ranked.length === 0 && canAddCustom) {
                    addSubstance(substanceSearch)
                  }
                }
              }}
              placeholder="Начни вводить название вещества"
              aria-label="Вещество или препарат"
              required
            />
            {showSubstanceSuggestions && (
              <div className="substance-suggestions" id="substance-suggestions" role="listbox">
                {ranked.map((match, index) => (
                  <button
                    type="button"
                    id={`substance-option-${index}`}
                    className={`substance-suggestion${match.item.id === substanceId ? ' selected' : ''}${index === activeSuggestionIndex ? ' active' : ''}`}
                    key={match.item.id}
                    role="option"
                    aria-selected={match.item.id === substanceId}
                    tabIndex={-1}
                    onMouseDown={event => event.preventDefault()}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    onClick={() => chooseSubstance(match.item.id)}
                  >
                    <span>{match.item.name}{match.item.archived ? ' (в архиве)' : ''}</span>
                    {match.alias && <small>Совпадение: {match.alias}</small>}
                  </button>
                ))}
                {archivedMatches.map(match => (
                  <div className="substance-suggestion substance-suggestion-disabled" key={`archived-${match.item.id}`}>
                    <span>{match.item.name} (в архиве)</span>
                    <small>Восстанови на вкладке «Вещества», чтобы выбрать</small>
                  </div>
                ))}
                {ranked.length === 0 && archivedMatches.length === 0 && (
                  <div className="substance-suggestions-empty">
                    Совпадений не найдено
                  </div>
                )}
                {canAddCustom && (
                  <button
                    type="button"
                    id={`substance-option-${ranked.length}`}
                    className={`substance-suggestion substance-suggestion-add${activeSuggestionIndex === ranked.length ? ' active' : ''}`}
                    role="option"
                    aria-selected={false}
                    tabIndex={-1}
                    onMouseDown={event => event.preventDefault()}
                    onMouseEnter={() => setActiveSuggestionIndex(ranked.length)}
                    onClick={() => addSubstance(substanceSearch)}
                  >
                    <span>＋ Добавить «{substanceSearch.trim()}»</span>
                    <small>Создать пользовательское вещество</small>
                  </button>
                )}
              </div>
            )}
          </div>
          {substanceError && (
            <p className="field-error" role="alert">{substanceError}</p>
          )}

          {activeSubstances.length === 0 && (
            <p className="hint">
              Все вещества находятся в архиве. Восстанови нужное на вкладке «Вещества».
            </p>
          )}

          <div className="two-columns">
            <div>
              <label>Количество</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Например, 300"
                value={amount}
                onChange={event => setAmount(event.target.value)}
                disabled={unknown}
              />
            </div>
            <div>
              <label>Единица</label>
              <select
                value={unit}
                onChange={event => setUnit(event.target.value)}
              >
                {availableUnits.map(option => (
                  <option key={option} value={option}>
                    {option}{deletedCustomUnits.includes(option) ? ' (удалена — сохранено в записи)' : ''}
                  </option>
                ))}
              </select>
              {customUnits.filter(option => !unitOptions.includes(option)).length > 0 && (
                <div className="custom-option-manager">
                  <span className="custom-option-manager-title">Мои единицы</span>
                  {customUnits.filter(option => !unitOptions.includes(option)).map(option => (
                    <div className="custom-option-row" key={`unit-manager-${option}`}>
                      <span>{option}</span>
                      <button type="button" className="remove-option-button" onClick={() => deleteCustomUnit(option)} aria-label={`Удалить единицу ${option}`} title="Удалить вариант">×</button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="unit-custom-toggle"
                onClick={() => setShowCustomUnitInput(value => !value)}
              >
                {showCustomUnitInput ? 'Скрыть добавление' : '＋ Своя единица'}
              </button>
              {showCustomUnitInput && (
                <div className="custom-choice-input">
                  <input
                    value={customUnitDraft}
                    onChange={event => setCustomUnitDraft(event.target.value)}
                    placeholder="Например, капли или порции"
                    maxLength={24}
                  />
                  <button
                    type="button"
                    className="edit-button"
                    disabled={!customUnitDraft.trim()}
                    onClick={() => {
                      const value = customUnitDraft.trim()
                      if (!value) return
                      const existing = [...unitOptions, ...customUnits].find(
                        option => option.toLocaleLowerCase('ru-RU') === value.toLocaleLowerCase('ru-RU'),
                      )
                      const selectedValue = existing ?? value
                      if (!existing) {
                        setCustomUnits(previous => [...previous, value])
                        setDeletedCustomUnits(previous => previous.filter(item => item !== value))
                      }
                      setUnit(selectedValue)
                      setCustomUnitDraft('')
                      setShowCustomUnitInput(false)
                    }}
                  >
                    Добавить
                  </button>
                </div>
              )}
            </div>
          </div>

          <label>Фактическое время приёма</label>
          <input
            type="datetime-local"
            value={takenAt}
            onChange={event => setTakenAt(event.target.value)}
            required
          />

          <div className="choice-field">
            <button
              type="button"
              className="choice-toggle"
              aria-expanded={routeExpanded}
              onClick={() => setRouteExpanded(value => !value)}
            >
              <span className="choice-toggle-text">
                <strong>Способ введения</strong>
                <small>{route || 'Не выбрано · необязательно'}</small>
              </span>
              <span className={`choice-chevron ${routeExpanded ? 'expanded' : ''}`}>⌄</span>
            </button>
            {routeExpanded && <>
              <div className="choice-grid">
                {availableRouteOptions.map(option => (
                  <button
                    type="button"
                    key={option.label}
                    className={`choice-button ${route === option.label ? 'selected' : ''}`}
                    onClick={() => {
                      setRoute(route === option.label ? '' : option.label)
                      setRouteExpanded(false)
                    }}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
                {editingOriginalEntry?.route && deletedCustomRoutes.includes(editingOriginalEntry.route) && route === editingOriginalEntry.route && (
                  <div className="deleted-option-note">{route} · удалённый вариант, сохранённый в этой записи</div>
                )}
                {customRoutes.map(option => (
                  <div className="custom-choice-row" key={`custom-route-${option}`}>
                    <button
                      type="button"
                      className={`choice-button ${route === option ? 'selected' : ''}`}
                      onClick={() => {
                        setRoute(route === option ? '' : option)
                        setRouteExpanded(false)
                      }}
                    >
                      <span>✏️</span>
                      {option}
                    </button>
                    <button type="button" className="remove-option-button" onClick={() => deleteCustomRoute(option)} aria-label={`Удалить способ ${option}`} title="Удалить вариант">×</button>
                  </div>
                ))}
                <button
                  type="button"
                  className={`choice-button other-choice ${showCustomRouteInput ? 'selected' : ''}`}
                  onClick={() => setShowCustomRouteInput(value => !value)}
                >
                  <span>＋</span>
                  Свой способ
                </button>
              </div>
              {showCustomRouteInput && (
                <div className="custom-choice-input">
                  <input
                    value={customRouteDraft}
                    onChange={event => setCustomRouteDraft(event.target.value)}
                    placeholder="Укажи свой способ"
                    maxLength={60}
                  />
                  <button
                    type="button"
                    className="edit-button"
                    disabled={!customRouteDraft.trim()}
                    onClick={() => {
                      const value = customRouteDraft.trim()
                      if (!value) return
                      const existing = [
                        ...routeOptions.map(option => option.label),
                        ...customRoutes,
                      ].find(option => option.toLocaleLowerCase('ru-RU') === value.toLocaleLowerCase('ru-RU'))
                      const selectedValue = existing ?? value
                      if (!existing) {
                        setCustomRoutes(previous => [...previous, value])
                        setDeletedCustomRoutes(previous => previous.filter(item => item !== value))
                      }
                      setRoute(selectedValue)
                      setCustomRouteDraft('')
                      setShowCustomRouteInput(false)
                      setRouteExpanded(false)
                    }}
                  >
                    Добавить
                  </button>
                </div>
              )}
              {route && (
                <button type="button" className="clear-choice" onClick={() => setRoute('')}>
                  Сбросить способ
                </button>
              )}
            </>}
          </div>

          <div className="choice-field">
            <button
              type="button"
              className="choice-toggle"
              aria-expanded={formExpanded}
              onClick={() => setFormExpanded(value => !value)}
            >
              <span className="choice-toggle-text">
                <strong>Форма препарата</strong>
                <small>{form || 'Не выбрано · необязательно'}</small>
              </span>
              <span className={`choice-chevron ${formExpanded ? 'expanded' : ''}`}>⌄</span>
            </button>
            {formExpanded && <>
              <div className="choice-grid">
                {availableFormOptions.map(option => (
                  <button
                    type="button"
                    key={option.label}
                    className={`choice-button ${form === option.label ? 'selected' : ''}`}
                    onClick={() => {
                      setForm(form === option.label ? '' : option.label)
                      setFormExpanded(false)
                    }}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
                {editingOriginalEntry?.form && deletedCustomForms.includes(editingOriginalEntry.form) && form === editingOriginalEntry.form && (
                  <div className="deleted-option-note">{form} · удалённая форма, сохранённая в этой записи</div>
                )}
                {customForms.map(option => (
                  <div className="custom-choice-row" key={`custom-form-${option}`}>
                    <button
                      type="button"
                      className={`choice-button ${form === option ? 'selected' : ''}`}
                      onClick={() => {
                        setForm(form === option ? '' : option)
                        setFormExpanded(false)
                      }}
                    >
                      <span>✏️</span>
                      {option}
                    </button>
                    <button type="button" className="remove-option-button" onClick={() => deleteCustomForm(option)} aria-label={`Удалить форму ${option}`} title="Удалить вариант">×</button>
                  </div>
                ))}
                <button
                  type="button"
                  className={`choice-button other-choice ${showCustomFormInput ? 'selected' : ''}`}
                  onClick={() => setShowCustomFormInput(value => !value)}
                >
                  <span>＋</span>
                  Своя форма
                </button>
              </div>
              {showCustomFormInput && (
                <div className="custom-choice-input">
                  <input
                    value={customFormDraft}
                    onChange={event => setCustomFormDraft(event.target.value)}
                    placeholder="Укажи свою форму"
                    maxLength={60}
                  />
                  <button
                    type="button"
                    className="edit-button"
                    disabled={!customFormDraft.trim()}
                    onClick={() => {
                      const value = customFormDraft.trim()
                      if (!value) return
                      const existing = [
                        ...formOptions.map(option => option.label),
                        ...customForms,
                      ].find(option => option.toLocaleLowerCase('ru-RU') === value.toLocaleLowerCase('ru-RU'))
                      const selectedValue = existing ?? value
                      if (!existing) {
                        setCustomForms(previous => [...previous, value])
                        setDeletedCustomForms(previous => previous.filter(item => item !== value))
                      }
                      setForm(selectedValue)
                      setCustomFormDraft('')
                      setShowCustomFormInput(false)
                      setFormExpanded(false)
                    }}
                  >
                    Добавить
                  </button>
                </div>
              )}
              {form && (
                <button type="button" className="clear-choice" onClick={() => setForm('')}>
                  Сбросить форму
                </button>
              )}
            </>}
          </div>

          <label>Комментарий — необязательно</label>
          <textarea
            placeholder="Контекст, самочувствие, уточнения..."
            value={comment}
            onChange={event => setComment(event.target.value)}
          />

          <label className="check-row">
            <input
              type="checkbox"
              checked={approximate}
              onChange={event => setApproximate(event.target.checked)}
            />
            Количество приблизительное
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={unknown}
              onChange={event => setUnknown(event.target.checked)}
            />
            Точное количество неизвестно
          </label>

          <button type="submit" className="primary-button">
            {isEditing ? 'Сохранить изменения' : 'Сохранить запись'}
          </button>

          {isEditing && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                resetForm()
                setTab('history')
              }}
            >
              Отменить редактирование
            </button>
          )}

          <p className="hint">
            Время приёма и время внесения записи сохраняются отдельно.
            Можно внести событие задним числом.
          </p>
        </form>
      </>
    )
  }

  function renderHistory() {
    const hasActiveFilters =
      historySearch.trim() !== '' ||
      historySubstanceFilter !== 'all' ||
      historyDateFrom !== '' ||
      historyDateTo !== '' ||
      historySort !== 'date-desc'

    return (
      <>
        <div className="page-heading">
          <div className="eyebrow">ЖУРНАЛ СОБЫТИЙ</div>
          <h1>История</h1>
          <p>Все внесённые события в хронологическом порядке.</p>
        </div>

        <section className="panel">
          <div className="section-heading">
            <h2>Записи</h2>
            <span className="muted">
              {filteredHistoryEntries.length}
              {filteredHistoryEntries.length !== visibleEntries.length
                ? ` из ${visibleEntries.length}`
                : ''}
            </span>
          </div>

          <div className="history-filters">
            <label htmlFor="history-search">Поиск по истории</label>
            <input
              id="history-search"
              type="search"
              placeholder="Вещество, комментарий, способ, форма, количество..."
              value={historySearch}
              onChange={event => setHistorySearch(event.target.value)}
            />

            <label htmlFor="history-substance-filter">Вещество</label>
            <select
              id="history-substance-filter"
              value={historySubstanceFilter}
              onChange={event => setHistorySubstanceFilter(event.target.value)}
            >
              <option value="all">Все вещества</option>
              {activeSubstances.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <div className="two-columns">
              <div>
                <label htmlFor="history-date-from">Дата с</label>
                <input
                  id="history-date-from"
                  type="date"
                  value={historyDateFrom}
                  max={historyDateTo || undefined}
                  onChange={event => setHistoryDateFrom(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="history-date-to">Дата по</label>
                <input
                  id="history-date-to"
                  type="date"
                  value={historyDateTo}
                  min={historyDateFrom || undefined}
                  onChange={event => setHistoryDateTo(event.target.value)}
                />
              </div>
            </div>

            <label htmlFor="history-sort">Сортировка</label>
            <select
              id="history-sort"
              value={historySort}
              onChange={event => setHistorySort(
                event.target.value as
                  | 'date-desc'
                  | 'date-asc'
                  | 'amount-desc'
                  | 'amount-asc'
              )}
            >
              <option value="date-desc">Сначала новые</option>
              <option value="date-asc">Сначала старые</option>
              <option value="amount-desc">Количество: по убыванию (внутри единиц)</option>
              <option value="amount-asc">Количество: по возрастанию (внутри единиц)</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetHistoryFilters}
              >
                Сбросить фильтры
              </button>
            )}
          </div>

          {visibleEntries.length === 0 ? (
            <div className="empty">
              <div className="empty-symbol">◷</div>
              <strong>Пока здесь пусто</strong>
              <p>Добавь первую запись на вкладке «Записать».</p>
            </div>
          ) : filteredHistoryEntries.length === 0 ? (
            <div className="empty">
              <div className="empty-symbol">⌕</div>
              <strong>Ничего не найдено</strong>
              <p>Попробуй изменить запрос или сбросить фильтры.</p>
              <button
                type="button"
                className="secondary-button"
                onClick={resetHistoryFilters}
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            filteredHistoryEntries.map(entry => (
              <article className="entry" key={entry.id}>
                <div className="entry-top">
                  <strong>{entry.substanceName}</strong>
                  <span className="tag">
                    {entry.unknown
                      ? 'Количество неизвестно'
                      : entry.approximate
                        ? 'Примерно'
                        : 'Зафиксировано'}
                  </span>
                </div>

                <div className="entry-amount">
                  {entry.unknown || entry.amount === null
                    ? 'Количество неизвестно'
                    : `${formatQuantity(entry.amount)} ${entry.unit}`}
                </div>

                <div className="muted small">
                  {formatDate(entry.takenAt)}
                </div>

                {(entry.route || entry.form) && (
                  <div className="entry-details">
                    {entry.route && <span>↳ {entry.route}</span>}
                    {entry.form && <span>◈ {entry.form}</span>}
                  </div>
                )}

                {entry.comment && (
                  <p className="entry-comment">{entry.comment}</p>
                )}

                <div className="muted tiny">
                  Запись внесена: {formatDate(entry.createdAt)}
                </div>

                <div className="entry-actions">
                  <button
                    className="edit-button"
                    onClick={() => startEditing(entry)}
                  >
                    Изменить
                  </button>

                  <button
                    className="delete-button"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    Удалить запись
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </>
    )
  }

  function renderSubstances() {
    const activeBuiltin = activeSubstances.filter(item => item.source === 'builtin')
    const activeCustom = activeSubstances.filter(item => item.source === 'custom')
    const archivedSubstances = substances.filter(item => item.archived)

    function renderSubstanceRow(item: Substance) {
      const historyCount = entries.filter(entry => entry.substanceId === item.id).length

      return (
        <article className="substance-row" key={item.id}>
          <div className="substance-row-heading">
            <div>
              <strong>{item.name}</strong>
              <div className="substance-meta">
                <span>{item.source === 'builtin' ? 'Базовое вещество' : 'Добавлено пользователем'}</span>
                <span>{historyCount} {historyCount === 1 ? 'запись' : 'записей'}</span>
              </div>
            </div>
            {item.archived && <span className="tag archived-tag">В архиве</span>}
          </div>

          <div className="substance-actions">
            {item.archived ? (
              <button
                type="button"
                className="edit-button"
                onClick={() => restoreSubstance(item.id)}
              >
                Восстановить
              </button>
            ) : (
              <button
                type="button"
                className="edit-button"
                onClick={() => archiveSubstance(item.id)}
              >
                Архивировать
              </button>
            )}

            {item.source === 'custom' && (
              <button
                type="button"
                className="edit-button"
                onClick={() => renameCustomSubstance(item.id)}
              >
                Переименовать
              </button>
            )}

            <button
              type="button"
              className="edit-button"
              onClick={() => clearSubstanceHistory(item.id)}
            >
              Удалить историю
            </button>

            {item.source === 'custom' && (
              <button
                type="button"
                className="delete-button substance-delete-button"
                onClick={() => deleteCustomSubstance(item.id)}
              >
                Удалить вещество
              </button>
            )}
          </div>
        </article>
      )
    }

    return (
      <>
        <div className="page-heading">
          <div className="eyebrow">СПРАВОЧНИК И ДАННЫЕ</div>
          <h1>Вещества</h1>
          <p>Управляй списком веществ и историей приёма независимо друг от друга.</p>
        </div>

        <section className="panel">
          <div className="section-heading">
            <h2>Активные вещества</h2>
            <span className="muted">{activeSubstances.length}</span>
          </div>
          <p className="muted small">
            Они доступны для новых записей, отображаются в истории и участвуют в аналитике.
          </p>

          <div className="substance-group">
            <h3>Базовый справочник</h3>
            {activeBuiltin.length === 0
              ? <p className="muted small">Все базовые вещества находятся в архиве.</p>
              : activeBuiltin.map(renderSubstanceRow)}
          </div>

          <div className="substance-group">
            <h3>Добавленные тобой</h3>
            {activeCustom.length === 0
              ? <p className="muted small">Пользовательских веществ пока нет.</p>
              : activeCustom.map(renderSubstanceRow)}
          </div>

          <p className="hint">
            Чтобы добавить своё вещество, начни вводить его название в поле на вкладке «Записать» и выбери «Добавить».
          </p>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Архив</h2>
            <span className="muted">{archivedSubstances.length}</span>
          </div>
          <p className="muted small">
            Архивные вещества скрыты из журнала и аналитики. Их записи сохраняются и вернутся после восстановления.
          </p>
          {archivedSubstances.length === 0
            ? <div className="empty"><strong>Архив пуст</strong></div>
            : archivedSubstances.map(renderSubstanceRow)}
        </section>

        <p className="hint">
          Удаление истории не удаляет само вещество. Полное удаление доступно только для веществ, добавленных пользователем; вместе с ними удаляются связанные записи.
        </p>
      </>
    )
  }

  function renderAnalytics() {
    return (
      <>
        <div className="page-heading">
          <div className="eyebrow">ОБЗОР ДАННЫХ</div>
          <h1>Аналитика</h1>
          <p>Статистика отдельно по каждому веществу.</p>
        </div>

        <Analytics
          substances={activeSubstances}
          entries={visibleEntries}
          onEditEntry={editEntryById}
          onOpenHistory={openHistoryFor}
        />

        <p className="hint">
          Отсутствие записи не означает отсутствие приёма.
          Неизвестные дни не считаются днями без употребления.
          Разные единицы измерения не суммируются.
          Приблизительные количества включаются в суммы
          и отмечаются знаком ≈.
        </p>
      </>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">Dose<span>Track</span></div>
          <div className="brand-caption">ЛИЧНЫЙ ЖУРНАЛ</div>
        </div>
        <div className="local-badge">
          <span className="status-dot" />
          Локальный режим
        </div>
      </header>

      <main>
        {tab === 'record' && renderRecord()}
        {tab === 'history' && renderHistory()}
        {tab === 'analytics' && renderAnalytics()}
        {tab === 'substances' && renderSubstances()}
      </main>

      <nav className="bottom-nav">
        <button
          className={tab === 'record' ? 'active' : ''}
          onClick={() => setTab('record')}
        >
          <span>＋</span>Записать
        </button>
        <button
          className={tab === 'history' ? 'active' : ''}
          onClick={() => setTab('history')}
        >
          <span>▤</span>История
        </button>
        <button
          className={tab === 'analytics' ? 'active' : ''}
          onClick={() => setTab('analytics')}
        >
          <span>⌁</span>Аналитика
        </button>
        <button
          className={tab === 'substances' ? 'active' : ''}
          onClick={() => setTab('substances')}
        >
          <span>◈</span>Вещества
        </button>
      </nav>
    </div>
  )
}

export default App