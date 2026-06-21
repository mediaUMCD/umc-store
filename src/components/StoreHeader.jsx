import { Link } from 'react-router-dom'
import { useCart } from '../lib/CartContext'

export default function StoreHeader() {
  const { itemCount } = useCart()

  return (
    <header style={{
      background: 'var(--color-wine-dark)',
      color: 'white',
      padding: '20px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
    }}>
      <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, lineHeight: 1.1 }}>UMCD Church Store</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>United Methodist Church of Danielson</div>
      </Link>

      <Link
        to="/cart"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textDecoration: 'none',
          color: 'white',
          background: 'rgba(255,255,255,0.12)',
          padding: '10px 16px',
          borderRadius: 'var(--radius)',
          fontWeight: 600,
        }}
      >
        <span aria-hidden="true">🛒</span>
        <span>Cart</span>
        {itemCount > 0 && (
          <span style={{
            background: 'var(--color-silver-light)',
            color: 'var(--color-wine-dark)',
            borderRadius: '999px',
            minWidth: 22,
            height: 22,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            padding: '0 6px',
          }}>
            {itemCount}
          </span>
        )}
      </Link>
    </header>
  )
}
