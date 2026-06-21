import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function StoreHome() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('sort_order')
      if (!error) setProducts(data)
      setLoading(false)
    }
    loadProducts()
  }, [])

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{
        background: 'var(--color-wine-dark)',
        color: 'white',
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <h1 style={{ color: 'white', fontSize: 32 }}>UMCD Church Store</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>United Methodist Church of Danielson</p>
      </header>

      <div className="container">
        <div className="card" style={{ marginBottom: 24, textAlign: 'center' }}>
          <p style={{ margin: 0 }}>
            Browse our current fundraiser apparel below. Orders are collected here and <strong>paid for in person</strong> (cash, check, or Venmo) at pickup — no online payment required.
          </p>
        </div>

        {loading ? (
          <p>Loading products…</p>
        ) : products.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p>No items are available for order right now. Please check back soon!</p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 20,
              marginBottom: 32,
            }}>
              {products.map((product) => (
                <div key={product.id} className="card">
                  <h3 style={{ marginBottom: 6 }}>{product.name}</h3>
                  {product.description && (
                    <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 10 }}>{product.description}</p>
                  )}
                  <p style={{ fontWeight: 700, color: 'var(--color-wine)', marginBottom: 0 }}>
                    Starting at ${Number(product.base_price).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link to="/order" className="btn btn-primary" style={{ fontSize: 17, padding: '14px 32px' }}>
                Start Your Order
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
