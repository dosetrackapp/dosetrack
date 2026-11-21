import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DialogProvider } from './Dialogs.tsx'
import { initTelegram } from './telegram.ts'

// Сообщаем Telegram, что приложение готово, и разворачиваем его на весь экран.
// В обычном браузере эта функция ничего не делает.
initTelegram()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </StrictMode>,
)
