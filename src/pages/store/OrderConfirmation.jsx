import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import StoreHeader from '../../components/StoreHeader'

export default function OrderConfirmation() {
  const { orderNumber } = useParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOrder() {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single()

      if (orderError || !orderData) {
        setError('We could not find that order.')
        setLoading(false)
        return
      }

      const { data: itemData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderData.id)

      setOrder(orderData)
      setItems(itemData || [])
      setLoading(false)
    }
    loadOrder()
  }, [orderNumber])

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

        <table style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Design</th>
              <th>Placement</th>
              <th>Size</th>
              <th>Color</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.product_name_snapshot}</td>
                <td>{item.design_name_snapshot || '—'}</td>
                <td>{item.placement || '—'}</td>
                <td>{item.size}</td>
                <td>{item.color}</td>
                <td>{item.quantity}</td>
                <td>${Number(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ textAlign: 'right', fontWeight: 700, fontSize: 18, color: 'var(--color-wine-dark)' }}>
          Estimated Total: ${Number(order.total_estimated).toFixed(2)}
        </p>
      </div>

      <div className="card" style={{ background: 'var(--color-blush)', marginBottom: 24 }}>
        <p style={{ margin: 0 }}>
          <strong>Next steps:</strong> Please bring cash, check, or Venmo payment when you pick up your order. A church staff member will be in touch about pickup details. Keep your order number for reference.
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link to="/" className="btn btn-secondary">Return to Store</Link>
      </div>
      </div>
    </div>
  )
}
