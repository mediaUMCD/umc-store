import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const [productsRes, designsRes, ordersRes, newOrdersRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('designs').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      ])

      setStats({
        products: productsRes.count ?? 0,
        designs: designsRes.count ?? 0,
        totalOrders: ordersRes.count ?? 0,
        newOrders: newOrdersRes.count ?? 0,
      })
      setLoading(false)
    }
    loadStats()
  }, [])

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard label="New Orders" value={stats.newOrders} highlight to="/admin/orders" />
            <StatCard label="Total Orders" value={stats.totalOrders} to="/admin/orders" />
            <StatCard label="Active Products" value={stats.products} to="/admin/products" />
            <StatCard label="Active Designs" value={stats.designs} to="/admin/designs" />
          </div>

          <div className="card">
            <h3>Quick Links</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/admin/orders" className="btn btn-primary">View Orders</Link>
              <Link to="/admin/products" className="btn btn-secondary">Manage Products</Link>
              <Link to="/admin/designs" className="btn btn-secondary">Manage Designs</Link>
              <Link to="/admin/colors" className="btn btn-secondary">Manage Colors</Link>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}

function StatCard({ label, value, highlight, to }) {
  return (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        className="card"
        style={{
          textAlign: 'center',
          borderLeft: highlight ? '4px solid var(--color-wine)' : 'none',
          cursor: 'pointer',
          transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(61, 0, 38, 0.16)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-card)'
          e.currentTarget.style.transform = 'none'
        }}
      >
        <div style={{ fontSize: 32, fontFamily: 'var(--font-heading)', color: 'var(--color-wine-dark)' }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-ink)', opacity: 0.7 }}>{label}</div>
      </div>
    </Link>
  )
}
