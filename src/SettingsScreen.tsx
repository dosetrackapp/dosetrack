import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AboutContent, APP_VERSION, HelpContent, PrivacyContent } from './appInfo'
import { ContactContent, SupportContent } from './SupportPages'
import {
  formatDateMedium,
  formatTime,
  updateSettings,
  useSettings,
  type DateFormat,
  type TimeFormat,
} from './settings'

type Page = 'main' | 'datetime' | 'help' | 'privacy' | 'about' | 'support' | 'contact'

const TITLES: Record<Page, string> = {
  main: 'Настройки',
  datetime: 'Формат даты и времени',
  help: 'Справка',
  privacy: 'Данные и конфиденциальность',
  about: 'О DoseTrack',
  support: 'Поддержать проект',
  contact: 'Связаться с разработчиком',
}

// Значки пунктов меню: контурные, в одном стиле.
function MenuIcon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" focusable="false">{children}</svg>
}

const MENU: Array<{ page: Exclude<Page, 'main'>; label: string; icon: ReactNode }> = [
  {
    page: 'datetime',
    label: 'Формат даты и времени',
    icon: <MenuIcon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></MenuIcon>,
  },
  {
    page: 'help',
    label: 'Справка',
    icon: <MenuIcon><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9" /><path d="M12 16.8v.2" /></MenuIcon>,
  },
  {
    page: 'privacy',
    label: 'Данные и конфиденциальность',
    icon: <MenuIcon><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9.5 12l2 2 3.5-4" /></MenuIcon>,
  },
  {
    page: 'about',
    label: 'О DoseTrack',
    icon: <MenuIcon><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.7v.2" /></MenuIcon>,
  },
  {
    page: 'support',
    label: 'Поддержать проект',
    icon: <MenuIcon><path d="M12 20.5S3.5 15.4 3.5 9.3A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.7C20.5 15.4 12 20.5 12 20.5z" /></MenuIcon>,
  },
  {
    page: 'contact',
    label: 'Связаться с разработчиком',
    icon: <MenuIcon><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3.5 7l8.5 6.5L20.5 7" /></MenuIcon>,
  },
]

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
          <section className="settings-group">
            <div className="menu-list">
              {MENU.map(item => (
                <button type="button" className="menu-row" key={item.page} onClick={() => setPage(item.page)}>
                  <span className="menu-icon" aria-hidden="true">{item.icon}</span>
                  <span className="menu-label">{item.label}</span>
                  {item.page === 'about' && <span className="menu-meta">версия {APP_VERSION}</span>}
                  <span className="menu-chevron" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {page === 'datetime' && (
          <section className="settings-group">
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
        )}

        {page === 'help' && <HelpContent />}
        {page === 'about' && <AboutContent />}
        {page === 'privacy' && <PrivacyContent />}
        {page === 'support' && <SupportContent />}
        {page === 'contact' && <ContactContent />}
      </div>
    </div>
  )
}
