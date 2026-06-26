import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

const STATUSES = ['new', 'invoiced', 'paid', 'picked_up', 'cancelled']
const STATUS_LABELS = { new:'New', invoiced:'Invoiced', paid:'Paid', picked_up:'Picked Up', cancelled:'Cancelled' }
const DONE_STATUSES = ['picked_up', 'cancelled']
const ACTIVE_STATUSES = ['new', 'invoiced', 'paid']

export default function AdminOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [itemsByOrder, setItemsByOrder] = useState({})
  const [showCompleted, setShowCompleted] = useState(false)

  async function loadOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders').select('*').order('created_at', { ascending: false })
    if (!error) setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [])

  async function toggleExpand(orderId) {
    if (expandedId === orderId) { setExpandedId(null); return }
    setExpandedId(orderId)
    if (!itemsByOrder[orderId]) {
      const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId)
      if (!error) setItemsByOrder(prev => ({ ...prev, [orderId]: data }))
    }
  }

  async function updateStatus(orderId, newStatus) {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  async function deleteOrder(orderId, orderNumber) {
    if (!confirm(`Permanently delete order ${orderNumber}? This cannot be undone.`)) return
    await supabase.from('order_items').delete().eq('order_id', orderId)
    await supabase.from('orders').delete().eq('id', orderId)
    setOrders(prev => prev.filter(o => o.id !== orderId))
    if (expandedId === orderId) setExpandedId(null)
  }

  const applySearch = (list) => {
    if (!searchQuery.trim()) return list
    const q = searchQuery.trim().toLowerCase()
    return list.filter(o =>
      (o.customer_name||'').toLowerCase().includes(q) ||
      (o.customer_email||'').toLowerCase().includes(q) ||
      (o.customer_phone||'').toLowerCase().includes(q) ||
      (o.order_number||'').toLowerCase().includes(q)
    )
  }

  const activeOrders = applySearch(orders.filter(o => ACTIVE_STATUSES.includes(o.status)))
  const completedOrders = applySearch(orders.filter(o => DONE_STATUSES.includes(o.status)))

  return (
    <AdminLayout title="Orders">
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 240px' }}>
          <label htmlFor="order-search" style={{ marginBottom: 0, flexShrink: 0 }}>Search:</label>
          <input id="order-search" type="text" placeholder="Name, email, phone, or order #"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ maxWidth: 320 }} />
          {searchQuery && (
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }}
              onClick={() => setSearchQuery('')}>Clear</button>
          )}
        </div>
      </div>

      {/* ── Active orders ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Active Orders</h3>
        {loading ? <p>Loading…</p> : activeOrders.length === 0 ? (
          <p style={{ opacity: 0.6 }}>No active orders.</p>
        ) : (
          <OrderTable orders={activeOrders} expandedId={expandedId} itemsByOrder={itemsByOrder}
            onExpand={toggleExpand} onStatusChange={updateStatus} onDelete={deleteOrder}
            onPrint={id => navigate(`/admin/orders/${id}/print`)} />
        )}
      </div>

      {/* ── Completed / Cancelled ── */}
      <div className="card" style={{ opacity: 0.85 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showCompleted ? 16 : 0 }}>
          <h3 style={{ margin: 0 }}>Completed &amp; Cancelled ({completedOrders.length})</h3>
          <button className="btn btn-secondary" style={{ fontSize: 13, padding: '5px 12px' }}
            onClick={() => setShowCompleted(s => !s)}>
            {showCompleted ? 'Hide' : 'Show'}
          </button>
        </div>
        {showCompleted && (
          loading ? <p style={{ marginTop: 16 }}>Loading…</p> : completedOrders.length === 0 ? (
            <p style={{ opacity: 0.6, marginTop: 16 }}>No completed or cancelled orders.</p>
          ) : (
            <div style={{ marginTop: 16 }}>
              <OrderTable orders={completedOrders} expandedId={expandedId} itemsByOrder={itemsByOrder}
                onExpand={toggleExpand} onStatusChange={updateStatus} onDelete={deleteOrder}
                onPrint={id => navigate(`/admin/orders/${id}/print`)} />
            </div>
          )
        )}
      </div>
    </AdminLayout>
  )
}

function OrderTable({ orders, expandedId, itemsByOrder, onExpand, onStatusChange, onDelete, onPrint }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Order #</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th></th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => (
          <>
            <tr key={order.id}>
              <td>{order.order_number}</td>
              <td>{order.customer_name}</td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
              <td>${Number(order.total_estimated).toFixed(2)}</td>
              <td><span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status]}</span></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }}
                    onClick={() => onExpand(order.id)}>
                    {expandedId === order.id ? 'Hide' : 'View'}
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }}
                    onClick={() => onPrint(order.id)}>
                    🖨 Print
                  </button>
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }}
                    onClick={() => onDelete(order.id, order.order_number)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            {expandedId === order.id && (
              <tr key={`${order.id}-detail`}>
                <td colSpan={6} style={{ background: 'var(--color-blush)', padding: 16 }}>
                  <OrderDetail order={order} items={itemsByOrder[order.id]}
                    onStatusChange={status => onStatusChange(order.id, status)} />
                </td>
              </tr>
            )}
          </>
        ))}
      </tbody>
    </table>
  )
}

function OrderDetail({ order, items, onStatusChange }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><strong>Contact</strong>
          <div style={{ fontSize: 14 }}>{order.customer_email || '—'}</div>
          <div style={{ fontSize: 14 }}>{order.customer_phone || '—'}</div>
        </div>
        <div><strong>Notes</strong><div style={{ fontSize: 14 }}>{order.notes || '—'}</div></div>
        <div><strong>Update Status</strong>
          <select value={order.status} onChange={e => onStatusChange(e.target.value)} style={{ marginTop: 4 }}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
      <strong>Items</strong>
      {!items ? <p style={{ fontSize: 14 }}>Loading items…</p> : (
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Product</th><th>Design(s), Personalization &amp; Placement</th>
              <th>Size</th><th>Color</th><th>Qty</th><th>Unit Price</th><th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.product_name_snapshot}</td>
                <td>
                  <div>{item.design_name_snapshot || '—'}{item.placement ? ` — ${item.placement}` : ''}</div>
                  {item.design2_name_snapshot && (
                    <div style={{ fontSize: 12, marginTop: 3, color: 'var(--color-wine)' }}>
                      +2nd: {item.design2_name_snapshot}{item.placement2 ? ` — ${item.placement2}` : ''}
                      {item.second_design_price ? ` (+$${Number(item.second_design_price).toFixed(2)}/ea)` : ''}
                    </div>
                  )}
                  {item.personalization_text && (
                    <div style={{ fontSize: 12, marginTop: 3, color: 'var(--color-wine)' }}>
                      Personalization: &ldquo;{item.personalization_text}&rdquo;
                      {item.personalization_placement ? ` — ${item.personalization_placement}` : ''}
                      {item.personalization_price ? ` (+$${Number(item.personalization_price).toFixed(2)}/ea)` : ''}
                    </div>
                  )}
                </td>
                <td>{item.size}</td><td>{item.color}</td><td>{item.quantity}</td>
                <td>${Number(item.unit_price).toFixed(2)}</td>
                <td>${Number(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
