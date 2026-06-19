import { Link } from '@tanstack/react-router'

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="muted">
        {children ?? <p>The page you are looking for does not exist.</p>}
      </div>
      <Link to="/">Go home</Link>
    </div>
  )
}
