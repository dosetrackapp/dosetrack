import { useEffect, useRef, useState } from 'react'
import { AboutContent, APP_VERSION, HelpContent, PrivacyContent } from './appInfo'
import {
  formatDateMedium,
  formatTime,
  updateSettings,
  useSettings,
  type DateFormat,
  type TimeFormat,
} from './settings'

type Page = 'main' | 'help' | 'about' | 'privacy'

const TITLES: Record<Page, string> = {
  main: 'Настройки',
  help: 'Справка',
  about: 'О DoseTrack',
  privacy: 'Данные и конфиденциальность',
}

// Образец для предпросмотра форматов: 22 ноября 2026, 14:30.
const SAMPLE = new Date(2026, 10, 22, 14, 30)

const DATE_OPTIONS: Array<{ value: DateFormat; label: string }> = [
  { value: 'text', label: 'Месяц словом' },
  { value: 'dots', label: 'Через точки' },
  { value: 'iso', label: 'Год-месяц-день' },
]

const TIME_OPTIONS: Array<{ value: TimeFormat; label: string }> = [
  { value: '24h', label: '24 часа' },
  { value: '12h', label: '12 часов (AM/PM)' },
]

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState<Page>('main')
  const settings = useSettings()
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [page])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (page === 'main') onClose()
      else setPage('main')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [page, onClose])

  // Образец даты показывается в том формате, который выбран для этого пункта.
  function sampleDate(format: DateFormat): string {
    if (format === 'dots') return `${String(SAMPLE.getDate()).padStart(2, '0')}.${SAMPLE.getMonth() + 1}.${SAMPLE.getFullYear()}`
    if (format === 'iso') return `${SAMPLE.getFullYear()}-${SAMPLE.getMonth() + 1}-${SAMPLE.getDate()}`
    return SAMPLE.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function sampleTime(format: TimeFormat): string {
    return format === '12h' ? '2:30 PM' : '14:30'
  }

  return (
    <div className="settings-screen" role="dialog" aria-modal="true" aria-label={TITLES[page]}>
      <div className="settings-bar">
        {page === 'main' ? (
          <span className="settings-bar-spacer" />
        ) : (
          <button type="button" className="settings-back" onClick={() => setPage('main')}>
            ‹ Назад
          </button>
        )}
        <h2>{TITLES[page]}</h2>
        <button type="button" className="settings-close" onClick={onClose} aria-label="Закрыть настройки">
          ✕
        </button>
      </div>

      <div className="settings-body" ref={bodyRef}>
        {page === 'main' && (
          <>
            <section className="settings-group">
              <h3 className="info-heading">Формат даты и времени</h3>

              <div className="settings-label">Дата</div>
              <div className="option-list" role="radiogroup" aria-label="Формат даты">
                {DATE_OPTIONS.map(option => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={settings.dateFormat === option.value}
                    key={option.value}
                    className={`option-row${settings.dateFormat === option.value ? ' active' : ''}`}
                    onClick={() => updateSettings({ dateFormat: option.value })}
                  >
                    <span>{option.label}</span>
                    <small>{sampleDate(option.value)}</small>
                  </button>
                ))}
              </div>

              <div className="settings-label">Время</div>
              <div className="option-list" role="radiogroup" aria-label="Формат времени">
                {TIME_OPTIONS.map(option => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={settings.timeFormat === option.value}
                    key={option.value}
                    className={`option-row${settings.timeFormat === option.value ? ' active' : ''}`}
                    onClick={() => updateSettings({ timeFormat: option.value })}
                  >
                    <span>{option.label}</span>
                    <small>{sampleTime(option.value)}</small>
                  </button>
                ))}
              </div>

              <p className="settings-preview">
                Так будет выглядеть запись: <b>{formatDateMedium(SAMPLE)}{settings.dateFormat === 'iso' ? ' ' : ', '}{formatTime(SAMPLE)}</b>
              </p>
              <p className="muted small">
                Формат применяется в истории, аналитике и в выгрузке «Для чтения». Календарь и поле выбора
                времени в форме записи показываются в формате твоего телефона.
              </p>
            </section>

            <section className="settings-group">
              <div className="menu-list">
                <button type="button" className="menu-row" onClick={() => setPage('help')}>
                  <span>Справка</span>
                  <span className="menu-chevron" aria-hidden="true">›</span>
                </button>
                <button type="button" className="menu-row" onClick={() => setPage('privacy')}>
                  <span>Данные и конфиденциальность</span>
                  <span className="menu-chevron" aria-hidden="true">›</span>
                </button>
                <button type="button" className="menu-row" onClick={() => setPage('about')}>
                  <span>О DoseTrack</span>
                  <span className="menu-meta">версия {APP_VERSION}</span>
                  <span className="menu-chevron" aria-hidden="true">›</span>
                </button>
              </div>
            </section>
          </>
        )}

        {page === 'help' && <HelpContent />}
        {page === 'about' && <AboutContent />}
        {page === 'privacy' && <PrivacyContent />}
      </div>
    </div>
  )
}
