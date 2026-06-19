import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { receiptQueryOptions } from '~/server/receipts'

export const Route = createFileRoute('/receipts/$receiptId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      receiptQueryOptions(Number(params.receiptId)),
    ),
  component: ReceiptDetail,
})

function ReceiptDetail() {
  const { receiptId } = Route.useParams()
  const { data } = useSuspenseQuery(receiptQueryOptions(Number(receiptId)))

  if (!data) {
    return <div className="card">Receipt not found.</div>
  }

  const { receipt, vendor, items } = data

  return (
    <div className="card">
      <h1>{vendor?.name ?? 'Receipt'}</h1>
      <p className="muted">
        {new Date(receipt.purchasedAt).toLocaleString()} ·{' '}
        {receipt.total != null
          ? `${receipt.currency ?? ''} ${receipt.total.toFixed(2)}`
          : '—'}
      </p>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit $</th>
            <th>Total $</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>
                {it.productId ? (
                  <Link
                    to="/products/$productId"
                    params={{ productId: String(it.productId) }}
                  >
                    {it.rawName}
                  </Link>
                ) : (
                  it.rawName
                )}
              </td>
              <td>
                {it.qty ?? '—'} {it.unit ?? ''}
              </td>
              <td>{it.unitPrice?.toFixed(2) ?? '—'}</td>
              <td>{it.totalPrice?.toFixed(2) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <Link to="/receipts">← All receipts</Link>
      </p>
    </div>
  )
}
