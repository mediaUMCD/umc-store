import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ItemBuilder from '../../components/ItemBuilder'

export default function OrderForm() {
  const [products, setProducts] = useState([])
  const [placements, setPlacements] = useState([])
  const [cart, setCart] = useState([])
  const [showItemBuilder, setShowItemBuilder] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [contact, setContact] = useState({ name: '', email: '', phone: '', notes: '' })

  const navigate = useNavigate()

  useEffect(() => {
    async function loadData() {
      const [productsRes, placementsRes] = await Promise.all([
        supabase.from('products').select('*').eq('active', true).order('sort_order'),
        supabase.from('placements').select('*').eq('active', true).order('sort_order'),
      ])
      setProducts(productsRes.data || [])
      setPlacements(placementsRes.data || [])
      setLoading(false)
    }
    loadData()
  }, [])

  function addItem(item) {
    setCart((prev) => [...prev, item])
    setShowItemBuilder(false)
  }

  function removeItem(index) {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  const total = cart.reduce((sum, item) => sum + item.line_total, 0)

  function generateOrderNumber() {
    const year = new Date().getFullYear()
    const random = Math.floor(1000 + Math.random() * 9000)
    return `ORD-${year}-${random}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (cart.length === 0) {
      setError('Please add at least one item to your order.')
      return
    }
    if (!contact.name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!contact.email.trim() && !contact.phone.trim()) {
      setError('Please provide an email or phone number so we can reach you.')
      return
    }

    setSubmitting(true)

    const orderNumber = generateOrderNumber()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: contact.name.trim(),
        customer_email: contact.email.trim() || null,
        customer_phone: contact.phone.trim() || null,
        notes: contact.notes.trim() || null,
        total_estimated: total,
        status: 'new',
      })
      .select()
      .single()

    if (orderError) {
      setError(`Could not submit order: ${orderError.message}`)
      setSubmitting(false)
      return
    }

    const itemRows = cart.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      design_id: item.design_id,
      product_name_snapshot: item.product_name_snapshot,
      design_name_snapshot: item.design_name_snapshot,
      placement: item.placement,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(itemRows)

    if (itemsError) {
      setError(`Order created but items failed to save: ${itemsError.message}. Please contact the church office.`)
      setSubmitting(false)
      return
    }

    navigate(`/order/confirmation/${order.order_number}`)
  }

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/">← Back to Store</Link>
      </div>
      <h1>Place Your Order</h1>

      {loading ? (
        <p>Loading…</p>
      ) : products.length === 0 ? (
        <div className="card">
          <p>No items are currently available to order.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Your Items</h3>
            {cart.length === 0 ? (
              <p style={{ opacity: 0.7 }}>No items added yet.</p>
            ) : (
              <table style={{ marginBottom: 16 }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Design</th>
                    <th>Placement</th>
                    <th>Size</th>
                    <th>Color</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product_name_snapshot}</td>
                      <td>{item.design_name_snapshot || '—'}</td>
                      <td>{item.placement || '—'}</td>
                      <td>{item.size}</td>
                      <td>{item.color || '—'}</td>
                      <td>{item.quantity}</td>
                      <td>${item.line_total.toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontWeight: 700 }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {cart.length > 0 && (
              <p style={{ textAlign: 'right', fontWeight: 700, fontSize: 17, color: 'var(--color-wine-dark)' }}>
                Estimated Total: ${total.toFixed(2)}
              </p>
            )}

            {showItemBuilder ? (
              <ItemBuilder
                products={products}
                placements={placements}
                onAdd={addItem}
                onCancel={() => setShowItemBuilder(false)}
              />
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => setShowItemBuilder(true)}>
                + Add an Item
              </button>
            )}
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Your Contact Info</h3>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="c-name">Full Name</label>
              <input
                id="c-name"
                type="text"
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="c-email">Email</label>
                <input
                  id="c-email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="c-phone">Phone</label>
                <input
                  id="c-phone"
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label htmlFor="c-notes">Notes (optional)</label>
              <textarea
                id="c-notes"
                rows={3}
                value={contact.notes}
                onChange={(e) => setContact({ ...contact, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="card" style={{ background: 'var(--color-blush)', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              <strong>Payment is handled in person</strong> (cash, check, or Venmo) when you pick up your order. This form does not charge any payment method.
            </p>
          </div>

          {error && <p style={{ color: 'var(--color-danger)', marginBottom: 16 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 16 }} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Order'}
          </button>
        </form>
      )}
    </div>
  )
}
