import { createContext, useContext } from 'react'

// Контекст собственных диалогов. Вынесен из Dialogs.tsx, чтобы тот файл экспортировал только компонент.

export type DialogApi = {
  alert: (message: string) => Promise<void>
  confirm: (message: string) => Promise<boolean>
  prompt: (message: string, defaultValue?: string) => Promise<string | null>
}

// Запасной вариант, если провайдер по какой-то причине не подключён.
const fallbackApi: DialogApi = {
  alert: message => {
    window.alert(message)
    return Promise.resolve()
  },
  confirm: message => Promise.resolve(window.confirm(message)),
  prompt: (message, defaultValue = '') => Promise.resolve(window.prompt(message, defaultValue)),
}

export const DialogContext = createContext<DialogApi>(fallbackApi)

export function useDialogs(): DialogApi {
  return useContext(DialogContext)
}
