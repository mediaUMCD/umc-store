import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useCart } from '../../lib/CartContext'
import StoreHeader from '../../components/StoreHeader'
import StoreFooter from '../../components/StoreFooter'

export default function Cart() {
  const { cart, removeItem, updateQuantity, clearCart, total } = useCart()
  const navigate = useNavigate()

  const [contact, setContact] = useState({ name: '', email: '', phone: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (cart.length === 0) { setError('Your cart is empty.'); return }
    if (!contact.name.trim()) { setError('Please enter your name.'); return }
    if (!contact.email.trim() && !contact.phone.trim()) {
      setError('Please give an email or phone number so we can reach you.'); return
    }

    setSubmitting(true)
    // The database checks the order and works out the prices itself
    const { data, error: rpcError } = await supabase.rpc('submit_store_order', {
      p_customer: { name: contact.name, email: contact.email, phone: contact.phone, notes: contact.notes },
      p_items: cart.map((item) => ({
        product_id: item.product_id,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        design_id: item.design_id,
        placement: item.placement,
        design2_id: item.design2_id || null,
        placement2: item.placement2 || null,
        personalization_text: item.personalization_text || null,
        personalization_placement: item.personalization_placement || null,
      })),
    })
    if (rpcError) { setError(rpcError.message); setSubmitting(false); return }

    clearCart()
    navigate(`/order/confirmation/${data.order_number}?t=${data.token}`)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <StoreHeader />
      <div className="container" style={{ maxWidth: 860 }}>
        <div style={{ marginBottom: 16 }}><Link to="/">← Continue Shopping</Link></div>
        <h1>Your Cart</h1>

        {cart.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p>Your cart is empty.</p>
            <Link to="/" className="btn btn-primary">Browse Items</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="cart-list">
                {cart.map((item) => (
                  <div key={item.cartId} className="cart-item">
                    <div className="cart-item-top">
                      <div>
                        <div className="cart-item-name">{item.product_name_snapshot}</div>
                        <div className="cart-item-sub">{[item.color, item.size && `Size ${item.size}`].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div className="cart-item-price">${item.line_total.toFixed(2)}</div>
                    </div>
                    {item.design_name_snapshot && (
                      <div className="cart-item-line">
                        <span className="cart-tag">Design</span> {item.design_name_snapshot}
                        {item.placement && <span className="cart-muted"> — {item.placement}</span>}
                      </div>
                    )}
                    {item.design2_name_snapshot && (
                      <div className="cart-item-line">
                        <span className="cart-tag">2nd design</span> {item.design2_name_snapshot}
                        {item.placement2 && <span className="cart-muted"> — {item.placement2}</span>}
                        <span className="cart-muted"> (+${Number(item.second_design_price).toFixed(2)} each)</span>
                      </div>
                    )}
                    {item.personalization_text && (
                      <div className="cart-item-line">
                        <span className="cart-tag">Personalized</span> &ldquo;{item.personalization_text}&rdquo;
                        <span className="cart-muted"> (+${Number(item.personalization_price).toFixed(2)} each)</span>
                      </div>
                    )}
                    <div className="cart-item-actions">
                      <div className="qty">
                        <button type="button" aria-label="One fewer" onClick={() => updateQuantity(item.cartId, Math.max(1, item.quantity - 1))}>−</button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button type="button" aria-label="One more" onClick={() => updateQuantity(item.cartId, item.quantity + 1)}>+</button>
                      </div>
                      <button type="button" className="cart-remove" onClick={() => removeItem(item.cartId)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ textAlign: 'right', fontWeight: 700, fontSize: 18, color: 'var(--color-wine-dark)' }}>
                Estimated Total: ${total.toFixed(2)}
              </p>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h3>Your Contact Info</h3>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="c-name">Full Name</label>
                <input id="c-name" type="text" value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              </div>
              <div className="two-col" style={{ marginBottom: 14 }}>
                <div>
                  <label htmlFor="c-email">Email</label>
                  <input id="c-email" type="email" value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="c-phone">Phone</label>
                  <input id="c-phone" type="tel" value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label htmlFor="c-notes">Notes (optional)</label>
                <textarea id="c-notes" rows={3} value={contact.notes}
                  onChange={(e) => setContact({ ...contact, notes: e.target.value })} />
              </div>
            </div>

            <div className="card" style={{ background: 'var(--color-blush)', marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 14 }}>
                <strong>You pay at pickup</strong> (cash, check or Venmo). Corissa will be in touch to arrange pickup. Nothing is charged now.
              </p>
            </div>

            {error && <p style={{ color: 'var(--color-danger)', marginBottom: 16 }}>{error}</p>}
            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', padding: 14, fontSize: 16 }} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Order'}
            </button>
          </form>
        )}
      </div>
      <StoreFooter />
    </div>
  )
}
