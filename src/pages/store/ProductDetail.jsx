import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useCart } from '../../lib/CartContext'
import StoreHeader from '../../components/StoreHeader'
import StoreFooter from '../../components/StoreFooter'

const STORAGE_BUCKET = 'store-designs'
const PRODUCT_BUCKET = 'store-products'
const SECOND_DESIGN_PRICE = 5.00 // ← change this to update the extra design charge
const PERSONALIZATION_PRICE = 2.00 // ← change this to update the personalization charge

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
  const [design2Id, setDesign2Id] = useState('')
  const [placement2, setPlacement2] = useState('')
  const [showSecondDesign, setShowSecondDesign] = useState(false)
  const [personalizationText, setPersonalizationText] = useState('')
  const [showPersonalization, setShowPersonalization] = useState(false)
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
        sizesByColorId[c.color_id] = c.available_sizes || null
      })
      const colorIds = (productColorsRes.data || []).map((c) => c.color_id)

      const [designsRes, colorsRes, designPlacementsRes] = await Promise.all([
        designIds.length > 0
          ? supabase.from('designs').select('*').in('id', designIds).eq('active', true)
          : Promise.resolve({ data: [] }),
        colorIds.length > 0
          ? supabase.from('colors').select('*').in('id', colorIds).eq('active', true)
          : Promise.resolve({ data: [] }),
        designIds.length > 0
          ? supabase.from('design_placements').select('design_id, placement_id').in('design_id', designIds)
          : Promise.resolve({ data: [] }),
      ])

      const placementsByDesign = {}
      ;(designPlacementsRes.data || []).forEach((dp) => {
        if (!placementsByDesign[dp.design_id]) placementsByDesign[dp.design_id] = []
        placementsByDesign[dp.design_id].push(dp.placement_id)
      })

      setDesigns((designsRes.data || []).map((d) => ({
        ...d,
        allowedPlacementIds: placementsByDesign[d.id] || [],
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

  useEffect(() => {
    if (!colorId || !size) return
    const selectedColor = colors.find((c) => c.id === colorId)
    if (selectedColor?.availableSizes && !selectedColor.availableSizes.includes(size)) setSize('')
  }, [colorId])

  useEffect(() => {
    if (!designId || !placement) return
    const selectedDesign = designs.find((d) => d.id === designId)
    const allowed = getPlacementsForDesign(selectedDesign)
    if (allowed.length > 0 && !allowed.find(p => p.name === placement)) setPlacement('')
  }, [designId])

  useEffect(() => {
    if (!design2Id || !placement2) return
    const selectedDesign2 = designs.find((d) => d.id === design2Id)
    const allowed2 = getPlacementsForDesign(selectedDesign2)
    if (allowed2.length > 0 && !allowed2.find(p => p.name === placement2)) setPlacement2('')
  }, [design2Id])

  function getAvailableSizes() {
    if (!colorId) return product?.sizes || []
    const selectedColor = colors.find((c) => c.id === colorId)
    if (!selectedColor?.availableSizes) return product?.sizes || []
    return (product?.sizes || []).filter((s) => selectedColor.availableSizes.includes(s))
  }

  function getPlacementsForDesign(design) {
    if (!design) return placements
    if (!design.allowedPlacementIds || design.allowedPlacementIds.length === 0) return placements
    return placements.filter((p) => design.allowedPlacementIds.includes(p.id))
  }

  function handleToggleSecondDesign(val) {
    setShowSecondDesign(val)
    if (!val) { setDesign2Id(''); setPlacement2('') }
  }

  function handleAddToCart() {
    setError('')
    setJustAdded(false)
    if (colors.length > 0 && !colorId) { setError('Please choose a color.'); return }
    if (!size) { setError('Please choose a size.'); return }
    if (designs.length > 0 && !designId) { setError('Please choose a design.'); return }
    if (designId && placements.length > 0 && !placement) { setError('Please choose a placement for your design.'); return }
    if (showSecondDesign && !design2Id) { setError('Please choose a second design or remove the second design option.'); return }
    if (showSecondDesign && design2Id && placements.length > 0 && !placement2) { setError('Please choose a placement for your second design.'); return }
    if (!quantity || quantity < 1) { setError('Quantity must be at least 1.'); return }

    const basePrice = Number(product.base_price)
    const override = product.size_price_overrides?.[size]
    const garmentPrice = override !== undefined ? Number(override) : basePrice
    const secondDesignCharge = showSecondDesign && design2Id ? SECOND_DESIGN_PRICE : 0
    const personalizationCharge = showPersonalization && personalizationText.trim() ? PERSONALIZATION_PRICE : 0
    const unitPrice = garmentPrice + secondDesignCharge + personalizationCharge

    const color = colors.find((c) => c.id === colorId)
    const design = designs.find((d) => d.id === designId)
    const design2 = designs.find((d) => d.id === design2Id)

    addItem({
      product_id: product.id,
      product_name_snapshot: product.name,
      design_id: designId || null,
      design_name_snapshot: design ? design.name : null,
      placement: placement || null,
      design2_id: design2Id || null,
      design2_name_snapshot: design2 ? design2.name : null,
      placement2: placement2 || null,
      second_design_price: secondDesignCharge,
      personalization_text: (showPersonalization && personalizationText.trim()) ? personalizationText.trim() : null,
      personalization_price: personalizationCharge,
      size,
      color: color ? color.name : '',
      quantity: Number(quantity),
      unit_price: unitPrice,
      line_total: unitPrice * Number(quantity),
    })

    setJustAdded(true)
    setSize(''); setColorId(''); setDesignId(''); setPlacement('')
    setDesign2Id(''); setPlacement2(''); setShowSecondDesign(false)
    setPersonalizationText(''); setShowPersonalization(false); setQuantity(1)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}><StoreHeader />
      <div className="container"><p>Loading…</p></div>
    </div>
  )
  if (notFound) return (
    <div style={{ minHeight: '100vh' }}><StoreHeader />
      <div className="container" style={{ textAlign: 'center', marginTop: 40 }}>
        <div className="card"><h2>Item not found</h2><p>This item may no longer be available.</p>
          <Link to="/" className="btn btn-primary">Back to Store</Link></div>
      </div>
    </div>
  )

  const selectedColor = colors.find((c) => c.id === colorId)
  const selectedDesign = designs.find((d) => d.id === designId)
  const selectedDesign2 = designs.find((d) => d.id === design2Id)
  const availableSizes = getAvailableSizes()
  const availablePlacements = getPlacementsForDesign(selectedDesign)
  const availablePlacements2 = getPlacementsForDesign(selectedDesign2)

  return (
    <div style={{ minHeight: '100vh' }}>
      <StoreHeader />
      <div className="container" style={{ maxWidth: 1000 }}>
        <div style={{ marginBottom: 16 }}><Link to="/">← Back to Store</Link></div>

        {/* Top: image + color/size */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start', marginBottom: 32 }}>
          <div>
            <div className="card" style={{
              aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--color-blush), var(--color-silver-light))',
              overflow: 'hidden',
            }}>
              {selectedColor?.photoUrl
                ? <img src={selectedColor.photoUrl} alt={selectedColor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 72, opacity: 0.3 }}>👕</span>}
            </div>
            {selectedColor?.photoUrl && (
              <p style={{ fontSize: 12, opacity: 0.6, textAlign: 'center', marginTop: 8 }}>Showing: {selectedColor.name}</p>
            )}
          </div>

          <div>
            <h1 style={{ marginBottom: 4 }}>{product.name}</h1>
            {product.description && <p style={{ opacity: 0.75, marginBottom: 12 }}>{product.description}</p>}
            <p style={{ fontWeight: 700, color: 'var(--color-wine)', fontSize: 20, marginBottom: 24 }}>
              ${Number(product.base_price).toFixed(2)}+
            </p>

            {colors.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {colors.map((c) => {
                    const selected = colorId === c.id
                    return (
                      <button key={c.id} type="button" onClick={() => { setColorId(c.id); setSize('') }} title={c.name}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          padding: 8, width: 90,
                          border: selected ? '2px solid var(--color-wine)' : '1px solid var(--color-silver)',
                          borderRadius: 'var(--radius)',
                          background: selected ? 'var(--color-blush)' : 'white',
                          boxShadow: selected ? '0 2px 8px rgba(61,0,38,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                        }}>
                        {c.photoUrl
                          ? <img src={c.photoUrl} alt={c.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                          : <span style={{ width: 60, height: 60, borderRadius: 6, background: c.hex_value || '#ccc', border: '1px solid var(--color-silver)', display: 'block' }} />}
                        <span style={{ fontSize: 11, lineHeight: 1.3, textAlign: 'center', color: selected ? 'var(--color-wine)' : 'inherit', fontWeight: selected ? 600 : 400, wordBreak: 'break-word', width: '100%' }}>{c.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20, maxWidth: 280 }}>
              <label htmlFor="pd-size">Size</label>
              <select id="pd-size" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">Choose size…</option>
                {availableSizes.map((s) => {
                  const override = product.size_price_overrides?.[s]
                  return <option key={s} value={s}>{s}{override !== undefined ? ` (+$${Number(override).toFixed(2)})` : ''}</option>
                })}
              </select>
              {colorId && selectedColor?.availableSizes && (
                <p style={{ fontSize: 11, color: 'var(--color-wine)', marginTop: 4 }}>Showing sizes available in {selectedColor.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: designs + placement + order */}
        <div className="card" style={{ marginBottom: 24 }}>

          {/* First design picker */}
          {designs.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 16, fontWeight: 700 }}>Design</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginTop: 10 }}>
                {designs.map((d) => {
                  const selected = designId === d.id
                  return (
                    <button type="button" key={d.id} onClick={() => { setDesignId(d.id); setPlacement('') }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 8px',
                        border: selected ? '2px solid var(--color-wine)' : '1px solid var(--color-silver)',
                        borderRadius: 'var(--radius)',
                        background: selected ? 'var(--color-blush)' : 'white',
                        boxShadow: selected ? '0 2px 8px rgba(61,0,38,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                        cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'center',
                      }}>
                      <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={d.publicUrl} alt={d.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <span style={{ fontSize: 11, lineHeight: 1.3, color: selected ? 'var(--color-wine)' : 'inherit', fontWeight: selected ? 600 : 400, wordBreak: 'break-word', width: '100%' }}>{d.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* First placement */}
          {designId && availablePlacements.length > 0 && (
            <div style={{ marginBottom: 24, maxWidth: 340 }}>
              <label htmlFor="pd-placement">Placement</label>
              <select id="pd-placement" value={placement} onChange={(e) => setPlacement(e.target.value)}>
                <option value="">Choose placement…</option>
                {availablePlacements.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Second design toggle */}
          {designId && (
            <div style={{ marginBottom: showSecondDesign ? 20 : 24 }}>
              <label htmlFor="second-design-toggle" style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>
                Add a Second Design?
              </label>
              <select
                id="second-design-toggle"
                value={showSecondDesign ? 'yes' : 'no'}
                onChange={(e) => handleToggleSecondDesign(e.target.value === 'yes')}
                style={{ maxWidth: 340 }}
              >
                <option value="no">No second design</option>
                <option value="yes">Yes — add a second design (+${SECOND_DESIGN_PRICE.toFixed(2)})</option>
              </select>
              <p style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                A second design placement (e.g. front + back) is an additional ${SECOND_DESIGN_PRICE.toFixed(2)} per item.
              </p>
            </div>
          )}

          {/* Second design picker */}
          {showSecondDesign && (
            <div style={{
              borderTop: '1px solid var(--color-silver)', paddingTop: 20, marginBottom: 24,
            }}>
              <label style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-wine)' }}>
                Second Design <span style={{ fontWeight: 400, fontSize: 13 }}>(+${SECOND_DESIGN_PRICE.toFixed(2)} per item)</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginTop: 10, marginBottom: 20 }}>
                {designs.filter(d => d.id !== designId).map((d) => {
                  const selected = design2Id === d.id
                  return (
                    <button type="button" key={d.id} onClick={() => { setDesign2Id(d.id); setPlacement2('') }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 8px',
                        border: selected ? '2px solid var(--color-wine)' : '1px solid var(--color-silver)',
                        borderRadius: 'var(--radius)',
                        background: selected ? 'var(--color-blush)' : 'white',
                        boxShadow: selected ? '0 2px 8px rgba(61,0,38,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                        cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'center',
                      }}>
                      <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={d.publicUrl} alt={d.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <span style={{ fontSize: 11, lineHeight: 1.3, color: selected ? 'var(--color-wine)' : 'inherit', fontWeight: selected ? 600 : 400, wordBreak: 'break-word', width: '100%' }}>{d.name}</span>
                    </button>
                  )
                })}
              </div>

              {design2Id && availablePlacements2.length > 0 && (
                <div style={{ maxWidth: 340 }}>
                  <label htmlFor="pd-placement2">Placement for Second Design</label>
                  <select id="pd-placement2" value={placement2} onChange={(e) => setPlacement2(e.target.value)}>
                    <option value="">Choose placement…</option>
                    {availablePlacements2.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Personalization */}
          <div style={{ borderTop: '1px solid var(--color-silver)', paddingTop: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <label style={{ fontWeight: 700, fontSize: 15, marginBottom: 0 }}>Add Personalization?</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400, cursor: 'pointer', marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={showPersonalization}
                  onChange={(e) => {
                    setShowPersonalization(e.target.checked)
                    if (!e.target.checked) setPersonalizationText('')
                  }}
                  style={{ width: 'auto' }}
                />
                Yes — add personalized text (+${PERSONALIZATION_PRICE.toFixed(2)} per item)
              </label>
            </div>
            <p style={{ fontSize: 12, opacity: 0.65, margin: '0 0 12px 0' }}>
              Personalization is printed on the <strong>left chest or shoulder</strong> area and can be added alongside a left chest or shoulder design, or on its own.
            </p>
            {showPersonalization && (
              <div style={{ maxWidth: 400 }}>
                <label htmlFor="pd-personalization">Your Personalization Text</label>
                <input
                  id="pd-personalization"
                  type="text"
                  placeholder="e.g. John Smith, Pastor Zach, #42…"
                  value={personalizationText}
                  onChange={(e) => setPersonalizationText(e.target.value)}
                  maxLength={50}
                />
                <p style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                  {personalizationText.length}/50 characters
                </p>
              </div>
            )}
          </div>

          {/* Quantity + cart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 120 }}>
              <label htmlFor="pd-qty">Quantity</label>
              <input id="pd-qty" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingBottom: 2 }}>
              <button type="button" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }} onClick={handleAddToCart}>
                Add to Cart
              </button>
              <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: 15 }} onClick={() => navigate('/cart')}>
                View Cart
              </button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 14, marginTop: 12 }}>{error}</p>}
          {justAdded && <p style={{ color: 'var(--color-success)', fontSize: 14, marginTop: 12, fontWeight: 600 }}>Added to cart!</p>}
        </div>
      </div>
      <StoreFooter />
    </div>
  )
}
