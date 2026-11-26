import { useEffect, useRef, useState } from 'react'
import { copyText } from './backup'

// Адрес для добровольных пожертвований (сеть TON) и почта для связи.
const WALLET_ADDRESS = 'UQC8YI__yxR4Wt03GXMQN6J1COwe3YmJdJblBHeHHOvkN-qc'
const CONTACT_EMAIL = 'dosetrackapp@proton.me'

// Знак GRAM: простой ромб, нарисованный для этого приложения.
function GramMark() {
  return (
    <svg className="gram-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.5l8 5.5-8 13.5L4 8z" />
      <path d="M4 8h16M12 2.5v19" />
    </svg>
  )
}

// Кнопка «Скопировать» с короткой пометкой результата.
function CopyButton({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'done' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    const ok = await copyText(text)
    setStatus(ok ? 'done' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <>
      <button type="button" className="edit-button copy-button" onClick={() => void copy()}>
        {status === 'done' ? 'Скопировано' : label}
      </button>
      <span className="copy-status" role="status" aria-live="polite">
        {status === 'failed' ? 'Не удалось скопировать. Выдели текст и скопируй вручную.' : ''}
      </span>
    </>
  )
}

export function SupportContent() {
  return (
    <>
      <p className="info-lead">
        DoseTrack бесплатный и без рекламы. Если тебе нравится мой проект и ты хочешь помочь ему развиваться,
        ты можешь отправить добровольное пожертвование.
      </p>

      <div className="support-card">
        <div className="support-title">
          <GramMark />
          <span>Поддержать в GRAM</span>
        </div>
        <div className="settings-label">Сеть</div>
        <div className="support-value">TON</div>
        <div className="settings-label">Адрес кошелька</div>
        <div className="support-address">{WALLET_ADDRESS}</div>
        <CopyButton text={WALLET_ADDRESS} label="Скопировать адрес" />
      </div>
    </>
  )
}

export function ContactContent() {
  return (
    <>
      <p className="info-lead">
        Если у тебя есть вопрос, замечание или предложение по приложению, напиши на почту.
      </p>

      <div className="support-card">
        <div className="settings-label">Почта</div>
        <div className="support-address">
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>
        <CopyButton text={CONTACT_EMAIL} label="Скопировать почту" />
      </div>
    </>
  )
}
