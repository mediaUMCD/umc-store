import { Link } from 'react-router-dom'

export default function StoreFooter() {
  return (
    <footer style={{
      marginTop: 48,
      padding: '24px',
      borderTop: '1px solid var(--color-silver-light)',
      textAlign: 'center',
      fontSize: 13,
      color: 'var(--color-ink)',
      opacity: 0.7,
    }}>
      <div style={{ marginBottom: 6 }}>
        United Methodist Church of Danielson
      </div>
      <Link
        to="/admin/login"
        style={{ color: 'var(--color-wine)', textDecoration: 'none', fontSize: 12 }}
      >
        Staff Login
      </Link>
    </footer>
  )
}
