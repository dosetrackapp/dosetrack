// Подключение к Telegram Mini App. Всё сделано «мягко»: если приложение открыто
// в обычном браузере или SDK не загрузился, ничего не происходит и ничего не ломается.
// Данные пользователя Telegram приложение не читает и никуда не отправляет.

type TelegramWebApp = {
  version?: string
  platform?: string
  initData?: string
  ready: () => void
  expand: () => void
  isVersionAtLeast?: (version: string) => boolean
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  setBottomBarColor?: (color: string) => void
  disableVerticalSwipes?: () => void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

// Цвета совпадают с тёмной темой приложения (--bg и фон нижней панели).
const APP_BG = '#11131a'
const APP_NAV_BG = '#151821'

export function isInsideTelegram(): boolean {
  const app = window.Telegram?.WebApp
  return Boolean(app && typeof app.initData === 'string' && app.platform && app.platform !== 'unknown')
}

function supports(app: TelegramWebApp, version: string): boolean {
  try {
    return typeof app.isVersionAtLeast === 'function' && app.isVersionAtLeast(version)
  } catch {
    return false
  }
}

export function initTelegram() {
  try {
    const app = window.Telegram?.WebApp
    if (!app) return

    app.ready()
    app.expand()

    // Приложение всегда тёмное, поэтому красим системные области Telegram под него.
    if (supports(app, '6.9')) {
      app.setHeaderColor?.(APP_BG)
      app.setBackgroundColor?.(APP_BG)
    }
    if (supports(app, '7.10')) app.setBottomBarColor?.(APP_NAV_BG)

    // Чтобы случайный свайп вниз не закрыл приложение с недозаполненной формой.
    if (supports(app, '7.7')) app.disableVerticalSwipes?.()

    if (isInsideTelegram()) {
      document.documentElement.classList.add('in-telegram')
      watchKeyboard()
    }
  } catch {
    // Любая ошибка интеграции не должна мешать самому приложению.
  }
}

// Когда открыта экранная клавиатура, прячем нижнюю навигацию: иначе она
// «подпрыгивает» над клавиатурой и закрывает поля ввода.
function watchKeyboard() {
  const root = document.documentElement
  let timer: number | undefined

  const isTextField = (element: EventTarget | null) =>
    element instanceof HTMLInputElement
      ? !['checkbox', 'radio', 'button', 'submit', 'range'].includes(element.type)
      : element instanceof HTMLTextAreaElement

  document.addEventListener('focusin', event => {
    window.clearTimeout(timer)
    if (isTextField(event.target)) root.classList.add('keyboard-open')
  })

  document.addEventListener('focusout', () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (!isTextField(document.activeElement)) root.classList.remove('keyboard-open')
    }, 150)
  })
}
