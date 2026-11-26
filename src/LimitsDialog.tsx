import { useEffect, useState } from 'react'
import { LIMIT_LABEL, LIMIT_TYPES, type LimitType, type SubstanceLimits } from './limits'

type Draft = Record<LimitType, { text: string; unit: string }>

const HINTS: Record<LimitType, string> = {
  event: 'Сравнивается с количеством в каждой отдельной записи.',
  day: 'Сумма известных количеств за календарный день.',
  week: 'Сумма за календарную неделю, с понедельника по воскресенье.',
}

function formatInput(value: number) {
  return String(value).replace('.', ',')
}

export default function LimitsDialog({
  substanceName,
  current,
  unitChoices,
  defaultUnit,
  onSave,
  onClose,
}: {
  substanceName: string
  current: SubstanceLimits
  unitChoices: string[]
  defaultUnit: string
  onSave: (limits: SubstanceLimits) => void
  onClose: () => void
}) {
  const units = (type: LimitType) => {
    const list = [...unitChoices]
    const own = current[type]?.unit
    if (own && !list.includes(own)) list.push(own)
    if (!list.includes(defaultUnit)) list.push(defaultUnit)
    return list
  }

  const [draft, setDraft] = useState<Draft>(() => {
    const result = {} as Draft
    for (const type of LIMIT_TYPES) {
      const item = current[type]
      result[type] = { text: item ? formatInput(item.value) : '', unit: item?.unit ?? defaultUnit }
    }
    return result
  })
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function save() {
    const next: SubstanceLimits = {}
    for (const type of LIMIT_TYPES) {
      const text = draft[type].text.trim().replace(',', '.')
      if (!text) continue
      const value = Number(text)
      if (!Number.isFinite(value) || value <= 0) {
        setError(`«${LIMIT_LABEL[type]}»: введи число больше нуля или очисти поле, чтобы убрать лимит.`)
        return
      }
      next[type] = { value, unit: draft[type].unit }
    }
    onSave(next)
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true" aria-label="Лимиты" onClick={event => event.stopPropagation()}>
        <h3 className="dialog-heading">Лимиты: {substanceName}</h3>
        <p className="muted small">
          Лимит — это число, которое задаёшь ты сам(а). Приложение с ним только сравнивает записанные количества:
          оно не предлагает значений и не оценивает их. Каждый лимит независим, пустое поле — лимит выключен.
        </p>

        {LIMIT_TYPES.map(type => (
          <div className="limit-row" key={type}>
            <strong>{LIMIT_LABEL[type]}</strong>
            <span className="muted tiny">{HINTS[type]}</span>
            <div className="limit-inputs">
              <input
                className="dialog-input"
                inputMode="decimal"
                placeholder="не задан"
                value={draft[type].text}
                aria-label={`${LIMIT_LABEL[type]}: значение`}
                onChange={event => {
                  setError('')
                  setDraft(value => ({ ...value, [type]: { ...value[type], text: event.target.value } }))
                }}
              />
              <select
                className="dialog-input"
                value={draft[type].unit}
                aria-label={`${LIMIT_LABEL[type]}: единица`}
                onChange={event => setDraft(value => ({ ...value, [type]: { ...value[type], unit: event.target.value } }))}
              >
                {units(type).map(unit => <option key={unit} value={unit}>{unit}</option>)}
              </select>
              {draft[type].text && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setDraft(value => ({ ...value, [type]: { ...value[type], text: '' } }))}
                >
                  Убрать
                </button>
              )}
            </div>
          </div>
        ))}

        <p className="muted tiny">
          Мкг, мг и г сравниваются между собой. Записи в других единицах учитываются, только если они в той же единице, что и лимит.
          Записи с неизвестным количеством в расчёте лимитов не учитываются. Приблизительные количества учитываются.
        </p>
        {error && <p className="field-error" role="alert">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="dialog-btn" onClick={onClose}>Отмена</button>
          <button type="button" className="dialog-btn dialog-btn-primary" onClick={save}>Сохранить</button>
        </div>
      </div>
    </div>
  )
}
