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

      <section className="store-hero">
        <h1>Support your church, look great doing it</h1>
        <p>Tap any item to choose a design, color and size.</p>
        <p className="store-hero-note">No online payment: you pay at pickup (cash, check or Venmo).</p>
      </section>

      <div className="container" style={{ flex: 1 }}>
        {/* Category filters */}
        <div className="chip-row">
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`chip${active ? ' chip-on' : ''}`}>{cat}</button>
            )
          })}
        </div>

        {loading ? <p>Loading products…</p> : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p>{activeCategory === 'All Products' ? 'No items available right now. Check back soon!' : 'No items in this category yet.'}</p>
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map(product => (
              <Link key={product.id} to={'/product/' + product.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card product-card">
                  <div className="product-thumb">
                    {previewImages[product.id]
                      ? <img src={previewImages[product.id]} alt={product.name} />
                      : <span style={{ fontSize: 48, opacity: 0.3 }}>👕</span>
                    }
                  </div>
                  <div className="product-info">
                    {product.category && (
                      <div className="product-cat">
                        {product.category}
                      </div>
                    )}
                    <div className="product-name">{product.name}</div>
                    {product.description && <div className="product-desc">{product.description}</div>}
                    <div className="product-price">
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
