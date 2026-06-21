import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STORAGE_BUCKET = 'store-designs'

export default function ItemBuilder({ products, placements, onAdd, onCancel }) {
  const [productId, setProductId] = useState('')
  const [designs, setDesigns] = useState([])
  const [colors, setColors] = useState([])
  const [designId, setDesignId] = useState('')
  const [placement, setPlacement] = useState('')
  const [size, setSize] = useState('')
  const [colorId, setColorId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [error, setError] = useState('')

  const selectedProduct = products.find((p) => p.id === productId)

  useEffect(() => {
    if (!productId) {
      setDesigns([])
      setColors([])
      return
    }

    async function loadOptions() {
      setLoadingOptions(true)

      const [designProductsRes, productColorsRes] = await Promise.all([
        supabase.from('design_products').select('design_id').eq('product_id', productId),
        supabase.from('product_colors').select('color_id').eq('product_id', productId),
      ])

      const designIds = (designProductsRes.data || []).map((d) => d.design_id)
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
      setColors(colorsRes.data || [])
      setLoadingOptions(false)
    }

    loadOptions()
    setDesignId('')
    setPlacement('')
    setSize('')
    setColorId('')
  }, [productId])

  function handleAdd() {
    setError('')

    if (!productId) { setError('Please choose an item.'); return }
    if (!size) { setError('Please choose a size.'); return }
    if (colors.length > 0 && !colorId) { setError('Please choose a color.'); return }
    if (designs.length > 0 && !designId) { setError('Please choose a design.'); return }
    if (designId && placements.length > 0 && !placement) { setError('Please choose a placement.'); return }
    if (!quantity || quantity < 1) { setError('Quantity must be at least 1.'); return }

    const basePrice = Number(selectedProduct.base_price)
    const override = selectedProduct.size_price_overrides?.[size]
    const unitPrice = override !== undefined ? Number(override) : basePrice
    const color = colors.find((c) => c.id === colorId)
    const design = designs.find((d) => d.id === designId)

    onAdd({
      product_id: productId,
      product_name_snapshot: selectedProduct.name,
      design_id: designId || null,
      design_name_snapshot: design ? design.name : null,
      placement: placement || null,
      size,
      color: color ? color.name : '',
      quantity: Number(quantity),
      unit_price: unitPrice,
      line_total: unitPrice * Number(quantity),
    })
  }

  return (
    <div className="card" style={{ border: '2px solid var(--color-wine)', marginBottom: 20 }}>
      <h3>Add an Item</h3>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="item-product">Item</label>
        <select id="item-product" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Choose an item…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — ${Number(p.base_price).toFixed(2)}+</option>
          ))}
        </select>
      </div>

      {productId && loadingOptions && <p style={{ fontSize: 14, opacity: 0.7 }}>Loading options…</p>}

      {productId && !loadingOptions && (
        <>
          {designs.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label>Design</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {designs.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => setDesignId(d.id)}
                    style={{
                      border: designId === d.id ? '2px solid var(--color-wine)' : '1px solid var(--color-silver)',
                      borderRadius: 'var(--radius)',
                      padding: 6,
                      background: 'white',
                      width: 100,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ width: '100%', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img src={d.publicUrl} alt={d.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>{d.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {designId && placements.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="item-placement">Placement</label>
              <select id="item-placement" value={placement} onChange={(e) => setPlacement(e.target.value)}>
                <option value="">Choose placement…</option>
                {placements.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label htmlFor="item-size">Size</label>
              <select id="item-size" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">Choose size…</option>
                {(selectedProduct?.sizes || []).map((s) => {
                  const override = selectedProduct.size_price_overrides?.[s]
                  return (
                    <option key={s} value={s}>
                      {s}{override !== undefined ? ` (+$${Number(override).toFixed(2)})` : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {colors.length > 0 && (
              <div>
                <label htmlFor="item-color">Color</label>
                <select id="item-color" value={colorId} onChange={(e) => setColorId(e.target.value)}>
                  <option value="">Choose color…</option>
                  {colors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="item-qty">Quantity</label>
              <input
                id="item-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {error && <p style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={handleAdd}>Add to Order</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
