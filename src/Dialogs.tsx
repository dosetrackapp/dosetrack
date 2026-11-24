import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { DialogContext, type DialogApi } from './dialogContext'

// Собственные диалоги приложения. Заменяют window.alert / confirm / prompt,
// которые в WebView Telegram работают нестабильно. Не зависят от Telegram.

type DialogRequest =
  | { kind: 'alert'; message: string; resolve: () => void }
  | { kind: 'confirm'; message: string; resolve: (value: boolean) => void }
  | { kind: 'prompt'; message: string; defaultValue: string; resolve: (value: string | null) => void }

export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DialogRequest[]>([])

  const api = useMemo<DialogApi>(() => ({
    alert: message => new Promise<void>(resolve => {
      setQueue(previous => [...previous, { kind: 'alert', message, resolve }])
    }),
    confirm: message => new Promise<boolean>(resolve => {
      setQueue(previous => [...previous, { kind: 'confirm', message, resolve }])
    }),
    prompt: (message, defaultValue = '') => new Promise<string | null>(resolve => {
      setQueue(previous => [...previous, { kind: 'prompt', message, defaultValue, resolve }])
    }),
  }), [])

  const current = queue[0]

  const close = useCallback(() => {
    setQueue(previous => previous.slice(1))
  }, [])

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogView key={queue.length + current.message} request={current} onClose={close} />}
    </DialogContext.Provider>
  )
}

function DialogView({ request, onClose }: { request: DialogRequest; onClose: () => void }) {
  const [text, setText] = useState(request.kind === 'prompt' ? request.defaultValue : '')
  const inputRef = useRef<HTMLInputElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  function finish(accepted: boolean) {
    if (request.kind === 'alert') request.resolve()
    else if (request.kind === 'confirm') request.resolve(accepted)
    else request.resolve(accepted ? text : null)
    onClose()
  }

  useEffect(() => {
    if (request.kind === 'prompt') {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else {
      primaryRef.current?.focus()
    }
  }, [request.kind])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        finish(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div
      className="dialog-backdrop"
      onClick={event => {
        if (event.target === event.currentTarget && request.kind !== 'prompt') finish(false)
      }}
    >
      <form
        className="dialog"
        role={request.kind === 'alert' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={request.message}
        onSubmit={event => {
          event.preventDefault()
          finish(true)
        }}
      >
        <p className="dialog-message">{request.message}</p>

        {request.kind === 'prompt' && (
          <input
            ref={inputRef}
            className="dialog-input"
            value={text}
            onChange={event => setText(event.target.value)}
          />
        )}

        <div className="dialog-actions">
          {request.kind !== 'alert' && (
            <button type="button" className="dialog-btn" onClick={() => finish(false)}>
              Отмена
            </button>
          )}
          <button ref={primaryRef} type="submit" className="dialog-btn dialog-btn-primary">
            {request.kind === 'alert' ? 'Понятно' : request.kind === 'prompt' ? 'Сохранить' : 'Подтвердить'}
          </button>
        </div>
      </form>
    </div>
  )
}
