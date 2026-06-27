import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import StoreHeader from '../../components/StoreHeader'
import StoreFooter from '../../components/StoreFooter'

const STORAGE_BUCKET = 'store-designs'
const PRODUCT_BUCKET = 'store-products'
const CATEGORIES = ['All Products', 'Clothing', 'Swag', 'Wearable Accessories', 'Special Event Fundraising']

export default function StoreHome() {
  const [products, setProducts] = useState([])
  const [previewImages, setPreviewImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All Products')

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase.from('products').select('*').eq('active', true).order('sort_order')
      if (error || !data) { setLoading(false); return }
      setProducts(data)

      const productIds = data.map(p => p.id)
      if (productIds.length === 0) { setLoading(false); return }

      const previews = {}
      const { data: productColors } = await supabase.from('product_colors').select('product_id, image_path').in('product_id', productIds)
      ;(productColors || []).forEach(pc => {
        if (!previews[pc.product_id] && pc.image_path) {
          previews[pc.product_id] = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(pc.image_path).data.publicUrl
        }
      })

      const { data: designLinks } = await supabase.from('design_products').select('product_id, design_id').in('product_id', productIds)
      const designIds = [...new Set((designLinks || []).map(d => d.design_id))]
      if (designIds.length > 0) {
        const { data: designs } = await supabase.from('designs').select('id, image_path').in('id', designIds).eq('active', true)
        ;(designLinks || []).forEach(link => {
          if (!previews[link.product_id]) {
            const design = (designs || []).find(d => d.id === link.design_id)
            if (design) previews[link.product_id] = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(design.image_path).data.publicUrl
          }
        })
      }

      setPreviewImages(previews)
      setLoading(false)
    }
    loadProducts()
  }, [])

  const filtered = activeCategory === 'All Products' ? products : products.filter(p => p.category === activeCategory)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <StoreHeader />

      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, #3D0026 0%, #7A0047 100%)',
        textAlign: 'center',
        padding: '32px 24px 28px',
        borderBottom: '4px solid #F7E6F0',
      }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em', color: 'white' }}>
          Support Your Church, Look Great Doing It
        </h1>
        <p style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', maxWidth: 560, marginInline: 'auto', color: 'white', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
          Select any item to explore logo designs, colors, and customization options.
        </p>
        <p style={{ fontSize: 14, margin: 0, maxWidth: 500, marginInline: 'auto', color: 'rgba(255,255,255,0.85)' }}>
          Orders are collected here and <strong style={{ color: 'white' }}>paid for in person</strong> (cash, check, or Venmo) at pickup — no online payment required.
        </p>
      </div>

      <div className="container" style={{ flex: 1 }}>
        {/* Category filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '24px 0 20px' }}>
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '8px 18px', borderRadius: 999,
                border: active ? 'none' : '1px solid var(--color-silver)',
                background: active ? 'var(--color-wine)' : 'white',
                color: active ? 'white' : 'var(--color-wine)',
                fontWeight: active ? 700 : 400,
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                boxShadow: active ? '0 2px 8px rgba(61,0,38,0.2)' : 'none',
              }}>{cat}</button>
            )
          })}
        </div>

        {loading ? <p>Loading products…</p> : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p>{activeCategory === 'All Products' ? 'No items available right now. Check back soon!' : 'No items in this category yet.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, paddingBottom: 40 }}>
            {filtered.map(product => (
              <Link key={product.id} to={'/product/' + product.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ overflow: 'hidden', transition: 'box-shadow 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(61,0,38,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                  <div style={{
                    height: 220, background: '#f8f0f5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 12,
                  }}>
                    {previewImages[product.id]
                      ? <img src={previewImages[product.id]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <span style={{ fontSize: 48, opacity: 0.3 }}>👕</span>
                    }
                  </div>
                  <div style={{ padding: '0 4px 4px' }}>
                    {product.category && (
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-burgundy)', marginBottom: 4 }}>
                        {product.category}
                      </div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{product.name}</div>
                    {product.description && <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 8 }}>{product.description}</div>}
                    <div style={{ fontWeight: 700, color: 'var(--color-wine)', fontSize: 18 }}>
                      ${Number(product.base_price).toFixed(2)}+
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <StoreFooter />
    </div>
  )
}
