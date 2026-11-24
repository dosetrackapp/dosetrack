import { useEffect, useRef, useState } from 'react'
import { AppTagline } from './appInfo'

// Информационное окно при первом запуске. Показывается один раз на устройстве,
// закрывается только кнопкой (не по Escape и не по нажатию на фон).

const SEEN_KEY = 'dosetrack-first-run-v1'

function wasSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export default function FirstRunNotice() {
  const [open, setOpen] = useState(() => !wasSeen())
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) buttonRef.current?.focus()
  }, [open])

  if (!open) return null

  function accept() {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Если сохранить не удалось, окно закрывается до следующего запуска.
    }
    setOpen(false)
  }

  return (
    <div className="dialog-backdrop first-run-backdrop">
      <div className="dialog first-run" role="dialog" aria-modal="true" aria-labelledby="first-run-title">
        <h2 id="first-run-title">О DoseTrack</h2>
        <div className="first-run-tagline">
          <AppTagline />
        </div>
        <p>
          DoseTrack — персональный инструмент для учёта приёма лекарственных препаратов и других веществ, ведения
          истории событий и самонаблюдения.
        </p>
        <p>
          Приложение позволяет систематизировать собственные записи, отслеживать динамику и замечать
          закономерности. Оно может быть полезно в том числе в рамках индивидуальных стратегий снижения рисков и
          вреда.
        </p>
        <p>
          DoseTrack не поощряет употребление веществ и не предоставляет инструкций по их незаконному приобретению
          или потреблению.
        </p>
        <p>
          Незаконное потребление наркотических средств, психотропных веществ, их аналогов причиняет вред
          здоровью, их незаконный оборот запрещён и влечёт установленную законодательством ответственность.
        </p>
        <p>
          Твои данные хранятся локально на устройстве. Разработчик не получает доступ к содержимому твоих
          записей. Очистка данных приложения или хранилища устройства может привести к их безвозвратной потере.
        </p>
        <p className="first-run-consent">
          Продолжая использование, ты подтверждаешь, что ознакомился(ась) с назначением приложения и особенностями
          хранения данных.
        </p>
        <div className="dialog-actions">
          <button ref={buttonRef} type="button" className="dialog-btn dialog-btn-primary" onClick={accept}>
            Продолжить
          </button>
        </div>
      </div>
    </div>
  )
}
