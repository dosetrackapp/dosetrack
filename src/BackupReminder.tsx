import { useEffect, useState } from 'react'
import { dismissBackupReminder, shouldRemind, useService } from './service'

export default function BackupReminder({ hasData, onOpenBackup }: { hasData: boolean; onOpenBackup: () => void }) {
  const service = useService()
  const [now, setNow] = useState(() => Date.now())

  // Пересчитываем, когда приложение снова становится видимым, и раз в час.
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const timer = window.setInterval(refresh, 3600000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  if (!hasData || !shouldRemind(service, now)) return null

  return (
    <div className="backup-reminder" role="note">
      <p>Ты давно не создавал(а) резервную копию. Сохрани данные, чтобы не потерять журнал.</p>
      <div className="backup-reminder-actions">
        <button type="button" className="edit-button" onClick={onOpenBackup}>Создать копию</button>
        <button type="button" className="link-button" onClick={dismissBackupReminder}>Закрыть</button>
      </div>
    </div>
  )
}
