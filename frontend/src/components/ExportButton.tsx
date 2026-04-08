import { useState } from 'react'
import { getFullExport } from '../lib/api'
import { useToast } from '../lib/useToast'

type ExportButtonProps = {
  className?: string
}

export function ExportButton({ className = 'button-ghost' }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  async function handleExport() {
    setExporting(true)
    try {
      const data = await getFullExport()
      const date = new Date().toISOString().slice(0, 10)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `personal-os-export-${date}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded.')
    } catch {
      toast.error('Export failed. Is the backend running?')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button className={className} disabled={exporting} type="button" onClick={handleExport}>
      {exporting ? 'Exporting...' : 'Export data'}
    </button>
  )
}
