import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="card">
      <h1>Receipt Tracker</h1>
      <p className="muted">
        Snap a receipt, review the items, and track prices over time.
      </p>
      <p>
        <Link to="/capture">
          <button className="primary">Scan a receipt</button>
        </Link>
      </p>
      <p className="muted">
        Or browse your <Link to="/receipts">receipts</Link> and{' '}
        <Link to="/products">products</Link>.
      </p>
    </div>
  )
}
