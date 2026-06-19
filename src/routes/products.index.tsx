import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { productsQueryOptions } from '~/server/receipts'

export const Route = createFileRoute('/products/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(productsQueryOptions()),
  component: Products,
})

function Products() {
  const { data } = useSuspenseQuery(productsQueryOptions())

  if (data.length === 0) {
    return (
      <div className="card">
        <p className="muted">No products yet. Scan a receipt to start.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h1>Products</h1>
      <ul>
        {data.map((p) => (
          <li key={p.id}>
            <Link to="/products/$productId" params={{ productId: String(p.id) }}>
              {p.canonicalName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
