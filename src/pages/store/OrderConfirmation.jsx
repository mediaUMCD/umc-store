import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import StoreHeader from '../../components/StoreHeader'
import StoreFooter from '../../components/StoreFooter'

export default function OrderConfirmation() {
  const { orderNumber } = useParams()
  const [params] = useSearchParams()
  const token = params.get('t')
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOrder() {
      const { data, error: rpcError } = token
        ? await supabase.rpc('store_order', { p_order_number: orderNumber, p_token: token })
        : { data: null, error: null }
      const orderData = data?.order
      const itemData = data?.items

      if (rpcError || !orderData) {
        setError(token ? 'We could not find that order.' : 'Your order was received. Check your email for the details.')
        setLoading(false)
        return
      }

      setOrder(orderData)
      setItems(itemData || [])
      setLoading(false)
    }
    loadOrder()
  }, [orderNumber, token])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <StoreHeader />
        <div className="container"><p>Loading…</p></div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <StoreHeader />
        <div className="container" style={{ maxWidth: 600, textAlign: 'center', marginTop: 60 }}>
          <div className="card">
            <h2>{error}</h2>
            <Link to="/" className="btn btn-primary">Return to Store</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <StoreHeader />
      <div className="container" style={{ maxWidth: 700 }}>
      <div className="card" style={{ textAlign: 'center', marginBottom: 24, borderTop: '4px solid var(--color-wine)' }}>
        <h1 style={{ marginBottom: 4 }}>Thank You!</h1>
        <p style={{ margin: 0, opacity: 0.8 }}>Your order has been received.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <strong>Order Number</strong>
            <div style={{ fontSize: 18, fontFamily: 'var(--font-heading)', color: 'var(--color-wine-dark)' }}>
              {order.order_number}
            </div>
          </div>
          <div>
            <strong>Date</strong>
            <div>{new Date(order.created_at).toLocaleDateString()}</div>
          </div>
          <div>
            <strong>Name</strong>
            <div>{order.customer_name}</div>
          </div>
        </div>

        <div className="cart-list">
          {items.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-top">
                <div>
                  <div className="cart-item-name">{item.quantity} × {item.product_name_snapshot}</div>
                  <div className="cart-item-sub">{[item.color, item.size && `Size ${item.size}`].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="cart-item-price">${Number(item.line_total).toFixed(2)}</div>
              </div>
              {item.design_name_snapshot && <div className="cart-item-line"><span className="cart-tag">Design</span> {item.design_name_snapshot}{item.placement && <span className="cart-muted"> — {item.placement}</span>}</div>}
              {item.design2_name_snapshot && <div className="cart-item-line"><span className="cart-tag">2nd design</span> {item.design2_name_snapshot}{item.placement2 && <span className="cart-muted"> — {item.placement2}</span>}</div>}
              {item.personalization_text && <div className="cart-item-line"><span className="cart-tag">Personalized</span> &ldquo;{item.personalization_text}&rdquo;</div>}
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'right', fontWeight: 700, fontSize: 18, color: 'var(--color-wine-dark)' }}>
          Estimated Total: ${Number(order.total_estimated).toFixed(2)}
        </p>
      </div>

      <div className="card" style={{ background: 'var(--color-blush)', marginBottom: 24 }}>
        <p style={{ margin: 0 }}>
          <strong>What happens next:</strong> Corissa will be in touch to arrange pickup. You pay when you pick up (cash, check or Venmo). {order.customer_email ? 'A copy of this order is in your email.' : 'Keep your order number for reference.'}
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link to="/" className="btn btn-secondary">Return to Store</Link>
      </div>
      </div>
      <StoreFooter />
    </div>
  )
}
