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
      <header className="store-header">
        <div className="store-header-row">
          <Link to="/admin" className="store-brand">
            <img src="/icon-192x192.png" alt="" />
            <span>
              <span className="store-brand-name">Store Staff</span>
              <span className="store-brand-sub">Church Store · Orders, products and designs</span>
            </span>
          </Link>
          <button onClick={handleLogout} className="staff-signout">Sign out</button>
        </div>
        <nav className="staff-nav" aria-label="Store staff">
          {NAV_ITEMS.map((item) => (
            <Link key={item.path} to={item.path}
              className={`chip${location.pathname === item.path ? ' chip-on' : ''}`}>
              {item.label}
            </Link>
          ))}
          <a href="/" className="chip" target="_blank" rel="noreferrer">View store ↗</a>
        </nav>
        <div className="rainbow" aria-hidden="true">
          {['#E8443A', '#F39C34', '#F4D03F', '#3FBF7F', '#3A8EE8', '#8E44AD'].map(c => <span key={c} style={{ background: c }} />)}
        </div>
      </header>
      <div className="container staff-main">
        {title && <h2 style={{ marginTop: 20 }}>{title}</h2>}
        {children}
      </div>
    </div>
  )
}
