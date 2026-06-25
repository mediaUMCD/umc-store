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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('sort_order')

      if (error || !data) {
        setLoading(false)
        return
      }
      setProducts(data)

      const productIds = data.map((p) => p.id)
      if (productIds.length === 0) {
        setLoading(false)
        return
      }

      const previews = {}

      // 1. Prefer a product color photo (first color that has one) per product
      const { data: productColors } = await supabase
        .from('product_colors')
        .select('product_id, image_path')
        .in('product_id', productIds)

      ;(productColors || []).forEach((pc) => {
        if (!previews[pc.product_id] && pc.image_path) {
          previews[pc.product_id] = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(pc.image_path).data.publicUrl
        }
      })

      // 2. Fall back to a design graphic for any product without a photo yet
      const { data: designLinks } = await supabase
        .from('design_products')
        .select('product_id, design_id')
        .in('product_id', productIds)

      const designIds = [...new Set((designLinks || []).map((d) => d.design_id))]
      if (designIds.length > 0) {
        const { data: designs } = await supabase
          .from('designs')
          .select('id, image_path')
          .in('id', designIds)
          .eq('active', true)

        const designImageById = {}
        ;(designs || []).forEach((d) => {
          designImageById[d.id] = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(d.image_path).data.publicUrl
        })

        ;(designLinks || []).forEach((link) => {
          if (!previews[link.product_id] && designImageById[link.design_id]) {
            previews[link.product_id] = designImageById[link.design_id]
          }
        })
      }

      setPreviewImages(previews)
      setLoading(false)
    }
    loadProducts()
  }, [])

  return (
    <div style={{ minHeight: '100vh' }}>
      <StoreHeader />

      <div className="container">
        <div className="card" style={{ marginBottom: 28, textAlign: 'center' }}>
          <p style={{ margin: 0 }}>
            Browse our current fundraiser apparel below. Orders are collected here and <strong>paid for in person</strong> (cash, check, or Venmo) at pickup — no online payment required.
          </p>
        </div>

        {/* Category filter tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  border: active ? 'none' : '1px solid var(--color-silver)',
                  background: active ? 'var(--color-wine)' : 'white',
                  color: active ? 'white' : 'var(--color-wine)',
                  fontWeight: active ? 700 : 400,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {loading ? (
          <p>Loading products…</p>
        ) : products.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p>No items are available for order right now. Please check back soon!</p>
          </div>
        ) : (() => {
          const filtered = activeCategory === 'All Products'
            ? products
            : products.filter(p => p.category === activeCategory)
          return filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <p>No items in this category yet.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 24,
            }}>
              {filtered.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="card" style={{
                  padding: 0,
                  overflow: 'hidden',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <div style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    background: 'linear-gradient(135deg, var(--color-blush), var(--color-silver-light))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {previewImages[product.id] ? (
                      <img
                        src={previewImages[product.id]}
                        alt={product.name}
                        style={{ maxWidth: '70%', maxHeight: '70%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: 48, opacity: 0.3 }}>👕</span>
                    )}
                  </div>
                  <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: 6, fontSize: 19 }}>{product.name}</h3>
                    {product.description && (
                      <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 12, flex: 1 }}>{product.description}</p>
                    )}
                    <p style={{ fontWeight: 700, color: 'var(--color-wine)', marginBottom: 0, fontSize: 16 }}>
                      Starting at ${Number(product.base_price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Link>
              ))}
            </div>
          )
        })()}
      </div>
      <StoreFooter />
    </div>
  )
}
