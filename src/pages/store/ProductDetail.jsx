import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useCart } from '../../lib/CartContext'
import StoreHeader from '../../components/StoreHeader'
import StoreFooter from '../../components/StoreFooter'

const STORAGE_BUCKET = 'store-designs'
const PRODUCT_BUCKET = 'store-products'

export default function ProductDetail() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [designs, setDesigns] = useState([])
  const [colors, setColors] = useState([])
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [designId, setDesignId] = useState('')
  const [placement, setPlacement] = useState('')
  const [size, setSize] = useState('')
  const [colorId, setColorId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const [justAdded, setJustAdded] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const { data: productData, error: productError } = await supabase
        .from('products').select('*').eq('id', productId).eq('active', true).single()

      if (productError || !productData) { setNotFound(true); setLoading(false); return }
      setProduct(productData)

      const [designProductsRes, productColorsRes, placementsRes] = await Promise.all([
        supabase.from('design_products').select('design_id').eq('product_id', productId),
        supabase.from('product_colors').select('color_id, image_path, available_sizes').eq('product_id', productId),
        supabase.from('placements').select('*').eq('active', true).order('sort_order'),
      ])

      const designIds = (designProductsRes.data || []).map((d) => d.design_id)
      const photoByColorId = {}
      const sizesByColorId = {}
      ;(productColorsRes.data || []).forEach((c) => {
        if (c.image_path) {
          photoByColorId[c.color_id] = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(c.image_path).data.publicUrl
        }
        sizesByColorId[c.color_id] = c.available_sizes || null // null = all sizes
      })
      const colorIds = (productColorsRes.data || []).map((c) => c.color_id)

      const [designsRes, colorsRes] = await Promise.all([
        designIds.length > 0
          ? supabase.from('designs').select('*').in('id', designIds).eq('active', true)
          : Promise.resolve({ data: [] }),
        colorIds.length > 0
          ? supabase.from('colors').select('*').in('id', colorIds).eq('active', true)
          : Promise.resolve({ data: [] }),
      ])

      setDesigns((designsRes.data || []).map((d) => ({
        ...d,
        publicUrl: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(d.image_path).data.publicUrl,
      })))
      setColors((colorsRes.data || []).map((c) => ({
        ...c,
        photoUrl: photoByColorId[c.id] || null,
        availableSizes: sizesByColorId[c.id] || null,
      })))
      setPlacements(placementsRes.data || [])
      setLoading(false)
    }
    loadData()
  }, [productId])

  // When color changes, clear size if it's no longer available
  useEffect(() => {
    if (!colorId || !size) return
    const selectedColor = colors.find((c) => c.id === colorId)
    if (!selectedColor) return
    if (selectedColor.availableSizes && !selectedColor.availableSizes.includes(size)) {
      setSize('')
    }
  }, [colorId])

  // Sizes available for the currently selected color (or all sizes if no color / no restriction)
  function getAvailableSizes() {
    if (!colorId) return product?.sizes || []
    const selectedColor = colors.find((c) => c.id === colorId)
    if (!selectedColor || !selectedColor.availableSizes) return product?.sizes || []
    return (product?.sizes || []).filter((s) => selectedColor.availableSizes.includes(s))
  }

  function handleAddToCart() {
    setError('')
    setJustAdded(false)

    if (!size) { setError('Please choose a size.'); return }
    if (colors.length > 0 && !colorId) { setError('Please choose a color.'); return }
    if (designs.length > 0 && !designId) { setError('Please choose a design.'); return }
    if (designId && placements.length > 0 && !placement) { setError('Please choose a placement.'); return }
    if (!quantity || quantity < 1) { setError('Quantity must be at least 1.'); return }

    const basePrice = Number(product.base_price)
    const override = product.size_price_overrides?.[size]
    const unitPrice = override !== undefined ? Number(override) : basePrice
    const color = colors.find((c) => c.id === colorId)
    const design = designs.find((d) => d.id === designId)

    addItem({
      product_id: product.id,
      product_name_snapshot: product.name,
      design_id: designId || null,
      design_name_snapshot: design ? design.name : null,
      placement: placement || null,
      size,
      color: color ? color.name : '',
      quantity: Number(quantity),
      unit_price: unitPrice,
      line_total: unitPrice * Number(quantity),
    })

    setJustAdded(true)
    setSize('')
    setColorId('')
    setQuantity(1)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}><StoreHeader />
      <div className="container"><p>Loading…</p></div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh' }}><StoreHeader />
      <div className="container" style={{ textAlign: 'center', marginTop: 40 }}>
        <div className="card">
          <h2>Item not found</h2>
          <p>This item may no longer be available.</p>
          <Link to="/" className="btn btn-primary">Back to Store</Link>
        </div>
      </div>
    </div>
  )

  const selectedDesign = designs.find((d) => d.id === designId)
  const selectedColorPhoto = colors.find((c) => c.id === colorId)?.photoUrl || null
  const availableSizes = getAvailableSizes()

  return (
    <div style={{ minHeight: '100vh' }}>
      <StoreHeader />
      <div className="container" style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: 16 }}><Link to="/">← Back to Store</Link></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
          {/* Image preview */}
          <div>
            <div className="card" style={{
              aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--color-blush), var(--color-silver-light))',
              overflow: 'hidden', position: 'relative',
            }}>
              {selectedColorPhoto ? (
                <img src={selectedColorPhoto} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : selectedDesign ? (
                <img src={selectedDesign.publicUrl} alt={selectedDesign.name} style={{ maxWidth: '75%', maxHeight: '75%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 72, opacity: 0.3 }}>👕</span>
              )}
              {selectedColorPhoto && selectedDesign && (
                <div style={{
                  position: 'absolute', bottom: 12, right: 12, width: 72, height: 72,
                  background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--color-silver)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 6,
                }}>
                  <img src={selectedDesign.publicUrl} alt={selectedDesign.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              )}
            </div>
            {selectedColorPhoto && (
              <p style={{ fontSize: 12, opacity: 0.6, textAlign: 'center', marginTop: 8 }}>
                Showing: {colors.find((c) => c.id === colorId)?.name}
              </p>
            )}
          </div>

          {/* Options panel */}
          <div>
            <h1 style={{ marginBottom: 4 }}>{product.name}</h1>
            {product.description && <p style={{ opacity: 0.75, marginBottom: 12 }}>{product.description}</p>}
            <p style={{ fontWeight: 700, color: 'var(--color-wine)', fontSize: 20, marginBottom: 20 }}>
              ${Number(product.base_price).toFixed(2)}+
            </p>

            {designs.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <label>Design</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {designs.map((d) => (
                    <button type="button" key={d.id} onClick={() => setDesignId(d.id)} style={{
                      border: designId === d.id ? '2px solid var(--color-wine)' : '1px solid var(--color-silver)',
                      borderRadius: 'var(--radius)', padding: 6, background: 'white', width: 90, textAlign: 'center',
                    }}>
                      <div style={{ width: '100%', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={d.publicUrl} alt={d.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>{d.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {designId && placements.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="pd-placement">Placement</label>
                <select id="pd-placement" value={placement} onChange={(e) => setPlacement(e.target.value)}>
                  <option value="">Choose placement…</option>
                  {placements.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              {colors.length > 0 && (
                <div>
                  <label htmlFor="pd-color">Color</label>
                  <select id="pd-color" value={colorId} onChange={(e) => { setColorId(e.target.value); setSize('') }}>
                    <option value="">Choose color…</option>
                    {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="pd-size">Size</label>
                <select id="pd-size" value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="">Choose size…</option>
                  {availableSizes.map((s) => {
                    const override = product.size_price_overrides?.[s]
                    return (
                      <option key={s} value={s}>
                        {s}{override !== undefined ? ` (+$${Number(override).toFixed(2)})` : ''}
                      </option>
                    )
                  })}
                </select>
                {colorId && colors.find(c => c.id === colorId)?.availableSizes && (
                  <p style={{ fontSize: 11, color: 'var(--color-wine)', marginTop: 4 }}>
                    Showing sizes available in {colors.find(c => c.id === colorId)?.name}
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 18, maxWidth: 120 }}>
              <label htmlFor="pd-qty">Quantity</label>
              <input id="pd-qty" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>

            {error && <p style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 12 }}>{error}</p>}
            {justAdded && <p style={{ color: 'var(--color-success)', fontSize: 14, marginBottom: 12, fontWeight: 600 }}>Added to cart!</p>}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }} onClick={handleAddToCart}>
                Add to Cart
              </button>
              <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: 15 }} onClick={() => navigate('/cart')}>
                View Cart
              </button>
            </div>
          </div>
        </div>
      </div>
      <StoreFooter />
    </div>
  )
}
