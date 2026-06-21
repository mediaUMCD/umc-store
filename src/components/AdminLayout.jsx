import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/orders', label: 'Orders' },
  { path: '/admin/products', label: 'Products' },
  { path: '/admin/designs', label: 'Designs' },
  { path: '/admin/colors', label: 'Colors' },
]

export default function AdminLayout({ children, title }) {
  const location = useLocation()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{
        background: 'var(--color-wine-dark)',
        color: 'white',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>UMCD Store Admin</span>
          <nav style={{ display: 'flex', gap: 16 }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  color: 'white',
                  opacity: location.pathname === item.path ? 1 : 0.7,
                  fontWeight: location.pathname === item.path ? 700 : 400,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>
          Sign Out
        </button>
      </header>
      <div className="container">
        {title && <h2 style={{ marginTop: 24 }}>{title}</h2>}
        {children}
      </div>
    </div>
  )
}
