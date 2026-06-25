import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

const STATUSES = ['new', 'invoiced', 'paid', 'picked_up', 'cancelled']
const STATUS_LABELS = {
  new: 'New',
  invoiced: 'Invoiced',
  paid: 'Paid',
  picked_up: 'Picked Up',
  cancelled: 'Cancelled',
}

export default function AdminOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [itemsByOrder, setItemsByOrder] = useState({})

  async function loadOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setOrders(data)
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
  }, [])

  async function toggleExpand(orderId) {
    if (expandedId === orderId) {
      setExpandedId(null)
      return
    }
    setExpandedId(orderId)
    if (!itemsByOrder[orderId]) {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
      if (!error) {
        setItemsByOrder((prev) => ({ ...prev, [orderId]: data }))
      }
    }
  }

  async function updateStatus(orderId, newStatus) {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))
  }

  const filteredOrders = orders
    .filter((o) => statusFilter === 'all' || o.status === statusFilter)
    .filter((o) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.trim().toLowerCase()
      return (
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.customer_email || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').toLowerCase().includes(q) ||
        (o.order_number || '').toLowerCase().includes(q)
      )
    })

  return (
    <AdminLayout title="Orders">
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label htmlFor="status-filter" style={{ marginBottom: 0 }}>Filter:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 240px' }}>
          <label htmlFor="order-search" style={{ marginBottom: 0 }}>Search:</label>
          <input
            id="order-search"
            type="text"
            placeholder="Name, email, phone, or order #"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: 13 }}
              onClick={() => setSearchQuery('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading…</p>
        ) : filteredOrders.length === 0 ? (
          <p>
            {searchQuery || statusFilter !== 'all'
              ? 'No orders match your search/filter.'
              : 'No orders yet.'}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total (Est.)</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <>
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{order.customer_name}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>${Number(order.total_estimated).toFixed(2)}</td>
                    <td>
                      <span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status]}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 13 }}
                          onClick={() => toggleExpand(order.id)}
                        >
                          {expandedId === order.id ? 'Hide' : 'View'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 13 }}
                          onClick={() => navigate(`/admin/orders/${order.id}/print`)}
                        >
                          🖨 Print
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === order.id && (
                    <tr key={`${order.id}-detail`}>
                      <td colSpan={6} style={{ background: 'var(--color-blush)', padding: 16 }}>
                        <OrderDetail
                          order={order}
                          items={itemsByOrder[order.id]}
                          onStatusChange={(status) => updateStatus(order.id, status)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}

function OrderDetail({ order, items, onStatusChange }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <strong>Contact</strong>
          <div style={{ fontSize: 14 }}>{order.customer_email || '—'}</div>
          <div style={{ fontSize: 14 }}>{order.customer_phone || '—'}</div>
        </div>
        <div>
          <strong>Notes</strong>
          <div style={{ fontSize: 14 }}>{order.notes || '—'}</div>
        </div>
        <div>
          <strong>Update Status</strong>
          <select
            value={order.status}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{ marginTop: 4 }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <strong>Items</strong>
      {!items ? (
        <p style={{ fontSize: 14 }}>Loading items…</p>
      ) : (
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Design(s) &amp; Placement</th>
              <th>Size</th>
              <th>Color</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
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
                      {item.personalization_price ? ` (+$${Number(item.personalization_price).toFixed(2)}/ea)` : ''}
                    </div>
                  )}
                </td>
                <td>{item.size}</td>
                <td>{item.color}</td>
                <td>{item.quantity}</td>
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
