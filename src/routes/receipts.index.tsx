import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { receiptsQueryOptions } from '~/server/receipts'

export const Route = createFileRoute('/receipts/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(receiptsQueryOptions()),
  component: Receipts,
})

function Receipts() {
  const { data } = useSuspenseQuery(receiptsQueryOptions())

  if (data.length === 0) {
    return (
      <div className="card">
        <p className="muted">No receipts yet.</p>
        <Link to="/capture">Scan one</Link>
      </div>
    )
  }

  return (
    <div className="card">
      <h1>Receipts</h1>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Vendor</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td>
                <Link
                  to="/receipts/$receiptId"
                  params={{ receiptId: String(r.id) }}
                >
                  {new Date(r.purchasedAt).toLocaleDateString()}
                </Link>
              </td>
              <td>{r.vendor ?? '—'}</td>
              <td>
                {r.total != null
                  ? `${r.currency ?? ''} ${r.total.toFixed(2)}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
