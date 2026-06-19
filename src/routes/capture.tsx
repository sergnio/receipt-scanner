import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { scanReceipt, saveReceipt } from '~/server/receipts'
import type { ScannedReceipt } from '~/lib/scanner'
import { ReviewForm } from '~/components/ReviewForm'

export const Route = createFileRoute('/capture')({
  component: Capture,
})

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve({ base64: result.split(',')[1] ?? '', mimeType: file.type })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function Capture() {
  const navigate = useNavigate()
  const [scanned, setScanned] = React.useState<ScannedReceipt | null>(null)

  const scan = useMutation({
    mutationFn: async (file: File) => {
      const { base64, mimeType } = await fileToBase64(file)
      return scanReceipt({ data: { base64, mimeType } })
    },
    onSuccess: setScanned,
  })

  const save = useMutation({
    mutationFn: (data: ScannedReceipt) => saveReceipt({ data }),
    onSuccess: ({ receiptId }) =>
      navigate({ to: '/receipts/$receiptId', params: { receiptId: String(receiptId) } }),
  })

  if (scanned) {
    return (
      <ReviewForm
        initial={scanned}
        saving={save.isPending}
        onCancel={() => setScanned(null)}
        onSubmit={(data) => save.mutate(data)}
      />
    )
  }

  return (
    <div className="card">
      <h1>Scan a receipt</h1>
      <p className="muted">Take a photo or pick an image of a receipt.</p>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        disabled={scan.isPending}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) scan.mutate(file)
        }}
      />
      {scan.isPending && <p className="muted">Reading receipt…</p>}
      {scan.isError && (
        <p style={{ color: '#f87171' }}>
          Scan failed: {(scan.error as Error).message}
        </p>
      )}
    </div>
  )
}
