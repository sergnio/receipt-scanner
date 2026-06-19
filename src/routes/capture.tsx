import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { saveReceipt } from '~/server/receipts'
import {getScanner, ScannedReceipt} from '~/lib/scanner'
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
      console.log('[capture] scan start', {
        name: file.name,
        type: file.type,
        sizeKB: Math.round(file.size / 1024),
      })
      const t0 = performance.now()
      try {
        const result = await getScanner().scan({ image: file })
        console.log('[capture] scan ok', {
          ms: Math.round(performance.now() - t0),
          vendor: result.vendor,
          items: result.items.length,
          total: result.total,
        })
        return result
      } catch (err) {
        console.error('[capture] scan failed', {
          ms: Math.round(performance.now() - t0),
          err,
        })
        throw err
      }
    },
    onSuccess: setScanned,
  })

  const save = useMutation({
    mutationFn: async (data: ScannedReceipt) => {
      console.log('[capture] save start', {
        vendor: data.vendor,
        items: data.items.length,
        total: data.total,
      })
      try {
        const result = await saveReceipt({ data })
        console.log('[capture] save ok', result)
        return result
      } catch (err) {
        console.error('[capture] save failed', err)
        throw err
      }
    },
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
