import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { saveReceipt } from '~/server/receipts'
import type { ScannedReceipt } from '~/lib/scanner'
import { ReviewForm } from '~/components/ReviewForm'

export const Route = createFileRoute('/capture')({
  component: Capture,
})

function Capture() {
  const navigate = useNavigate()
  const [scanned, setScanned] = React.useState<ScannedReceipt | null>(null)

  // OCR happens here, in the browser — no image ever leaves the device.
  // Dynamic import keeps the scanner (and Tesseract.js) out of the SSR bundle.
  const scan = useMutation({
    mutationFn: async (file: File) => {
      const { getScanner } = await import('~/lib/scanner')
      return getScanner().scan({ image: file })
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
