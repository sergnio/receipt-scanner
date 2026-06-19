import { useForm } from '@tanstack/react-form'
import type { ScannedReceipt } from '~/lib/scanner'

type ReviewItem = ScannedReceipt['items'][number] & {
  weightGrams?: number | null
}
type ReviewValues = Omit<ScannedReceipt, 'items'> & { items: ReviewItem[] }

function num(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function ReviewForm({
  initial,
  saving,
  onSubmit,
  onCancel,
}: {
  initial: ScannedReceipt
  saving: boolean
  onSubmit: (data: ReviewValues) => void
  onCancel: () => void
}) {
  const form = useForm({
    defaultValues: {
      vendor: initial.vendor ?? '',
      purchasedAt: initial.purchasedAt ?? '',
      currency: initial.currency ?? 'USD',
      total: initial.total,
      items: initial.items.map((i) => ({ ...i, weightGrams: null })),
    } as ReviewValues,
    onSubmit: ({ value }) => onSubmit(value),
  })

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <h1>Review receipt</h1>
      <p className="muted">Fix anything the scanner got wrong, then save.</p>

      <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '24rem' }}>
        <form.Field name="vendor">
          {(field) => (
            <label>
              Vendor
              <br />
              <input
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Field name="purchasedAt">
          {(field) => (
            <label>
              Purchased at (ISO)
              <br />
              <input
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>
      </div>

      <h2>Items</h2>
      <form.Field name="items" mode="array">
        {(itemsField) => (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Unit $</th>
                <th>Total $</th>
                <th>Weight (g)</th>
              </tr>
            </thead>
            <tbody>
              {itemsField.state.value.map((_, i) => (
                <tr key={i}>
                  <td>
                    <form.Field name={`items[${i}].normalizedName`}>
                      {(f) => (
                        <input
                          value={f.state.value ?? ''}
                          onChange={(e) => f.handleChange(e.target.value)}
                        />
                      )}
                    </form.Field>
                  </td>
                  <td>
                    <form.Field name={`items[${i}].qty`}>
                      {(f) => (
                        <input
                          style={{ width: '4rem' }}
                          value={f.state.value ?? ''}
                          onChange={(e) => f.handleChange(num(e.target.value))}
                        />
                      )}
                    </form.Field>
                  </td>
                  <td>
                    <form.Field name={`items[${i}].unit`}>
                      {(f) => (
                        <input
                          style={{ width: '3.5rem' }}
                          value={f.state.value ?? ''}
                          onChange={(e) => f.handleChange(e.target.value)}
                        />
                      )}
                    </form.Field>
                  </td>
                  <td>
                    <form.Field name={`items[${i}].unitPrice`}>
                      {(f) => (
                        <input
                          style={{ width: '5rem' }}
                          value={f.state.value ?? ''}
                          onChange={(e) => f.handleChange(num(e.target.value))}
                        />
                      )}
                    </form.Field>
                  </td>
                  <td>
                    <form.Field name={`items[${i}].totalPrice`}>
                      {(f) => (
                        <input
                          style={{ width: '5rem' }}
                          value={f.state.value ?? ''}
                          onChange={(e) => f.handleChange(num(e.target.value))}
                        />
                      )}
                    </form.Field>
                  </td>
                  <td>
                    <form.Field name={`items[${i}].weightGrams`}>
                      {(f) => (
                        <input
                          style={{ width: '5rem' }}
                          placeholder="optional"
                          value={f.state.value ?? ''}
                          onChange={(e) => f.handleChange(num(e.target.value))}
                        />
                      )}
                    </form.Field>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </form.Field>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save receipt'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}
