import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { productHistoryQueryOptions } from '~/server/receipts'

export const Route = createFileRoute('/products/$productId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      productHistoryQueryOptions(Number(params.productId)),
    ),
  component: ProductHistory,
})

type Row = {
  purchasedAt: Date
  vendor: string | null
  unitPrice: number | null
  unit: string | null
  qty: number | null
  totalPrice: number | null
  weightGrams: number | null
}

const col = createColumnHelper<Row>()

const columns = [
  col.accessor('purchasedAt', {
    header: 'Date',
    cell: (c) => new Date(c.getValue()).toLocaleDateString(),
    sortingFn: 'datetime',
  }),
  col.accessor('vendor', { header: 'Vendor', cell: (c) => c.getValue() ?? '—' }),
  col.accessor('unitPrice', {
    header: 'Unit $',
    cell: (c) => c.getValue()?.toFixed(2) ?? '—',
  }),
  col.accessor('unit', { header: 'Unit', cell: (c) => c.getValue() ?? '' }),
  col.display({
    id: 'costPerGram',
    header: '$/100g',
    cell: (c) => {
      const { totalPrice, weightGrams } = c.row.original
      if (totalPrice == null || !weightGrams) return '—'
      return `$${((totalPrice / weightGrams) * 100).toFixed(2)}`
    },
  }),
]

function ProductHistory() {
  const { productId } = Route.useParams()
  const { data } = useSuspenseQuery(
    productHistoryQueryOptions(Number(productId)),
  )
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'purchasedAt', desc: true },
  ])

  const rows = React.useMemo<Row[]>(
    () =>
      (data?.history ?? []).map((h) => ({
        ...h,
        purchasedAt: new Date(h.purchasedAt),
      })),
    [data],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!data) return <div className="card">Product not found.</div>

  return (
    <div className="card">
      <h1>{data.product.canonicalName}</h1>
      <p className="muted">Price history ({rows.length} purchases)</p>
      <table>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  style={{ cursor: h.column.getCanSort() ? 'pointer' : 'default' }}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id}>
              {r.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <Link to="/products">← All products</Link>
      </p>
    </div>
  )
}
