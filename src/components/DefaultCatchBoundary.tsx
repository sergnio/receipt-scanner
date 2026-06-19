import { ErrorComponent, Link } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  return (
    <div className="card">
      <ErrorComponent error={error} />
      <Link to="/">Go home</Link>
    </div>
  )
}
