import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
const PRODUCT_BUCKET = 'store-products'

const emptyForm = {
  name: '',
  product_type: 'tshirt',
  description: '',
  base_price: '',
  sizes: [...DEFAULT_SIZES],
  size_price_overrides: {},
  active: true,
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [allColors, setAllColors] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  // colorSelections: { [colorId]: { selected, existingPath, newFile, previewUrl, availableSizes } }
  const [colorSelections, setColorSelections] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [newSizeInput, setNewSizeInput] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)
    const [productsRes, colorsRes, productColorsRes] = await Promise.all([
      supabase.from('products').select('*').order('sort_order'),
      supabase.from('colors').select('*').eq('active', true).order('name'),
      supabase.from('product_colors').select('product_id, color_id, image_path, available_sizes'),
    ])

    if (productsRes.error) {
      setError(productsRes.error.message)
    } else {
      const colorMap = {}
      ;(productColorsRes.data || []).forEach((pc) => {
        if (!colorMap[pc.product_id]) colorMap[pc.product_id] = []
        colorMap[pc.product_id].push({
          color_id: pc.color_id,
          image_path: pc.image_path,
          available_sizes: pc.available_sizes || null,
        })
      })
      setProducts(productsRes.data.map((p) => ({ ...p, productColors: colorMap[p.id] || [] })))
    }
    setAllColors(colorsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function publicUrl(path) {
    return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl
  }

  function resetForm() {
    setForm(emptyForm)
    setColorSelections({})
    setEditingId(null)
    setNewSizeInput('')
  }

  function startEdit(product) {
    setForm({
      name: product.name,
      product_type: product.product_type,
      description: product.description || '',
      base_price: String(product.base_price),
      sizes: product.sizes || [...DEFAULT_SIZES],
      size_price_overrides: product.size_price_overrides || {},
      active: product.active,
    })
    const selections = {}
    ;(product.productColors || []).forEach((pc) => {
      selections[pc.color_id] = {
        selected: true,
        existingPath: pc.image_path || null,
        newFile: null,
        previewUrl: pc.image_path ? publicUrl(pc.image_path) : null,
        availableSizes: pc.available_sizes || null, // null = all sizes
      }
    })
    setColorSelections(selections)
    setEditingId(product.id)
  }

  function addSize() {
    const trimmed = newSizeInput.trim().toUpperCase()
    if (!trimmed || form.sizes.includes(trimmed)) return
    setForm({ ...form, sizes: [...form.sizes, trimmed] })
    setNewSizeInput('')
  }

  function removeSize(size) {
    const { [size]: _removed, ...remainingOverrides } = form.size_price_overrides
    setForm({
      ...form,
      sizes: form.sizes.filter((s) => s !== size),
      size_price_overrides: remainingOverrides,
    })
  }

  function setSizeOverride(size, value) {
    const overrides = { ...form.size_price_overrides }
    if (value === '') { delete overrides[size] } else { overrides[size] = value }
    setForm({ ...form, size_price_overrides: overrides })
  }

  function toggleColor(colorId) {
    setColorSelections((prev) => {
      const current = prev[colorId]
      if (current?.selected) {
        return { ...prev, [colorId]: { ...current, selected: false } }
      }
      return {
        ...prev,
        [colorId]: {
          selected: true,
          existingPath: current?.existingPath || null,
          newFile: null,
          previewUrl: current?.previewUrl || null,
          availableSizes: null, // null = all sizes available
        },
      }
    })
  }

  function setColorPhoto(colorId, file) {
    setColorSelections((prev) => ({
      ...prev,
      [colorId]: {
        ...prev[colorId],
        newFile: file,
        previewUrl: file
          ? URL.createObjectURL(file)
          : prev[colorId]?.existingPath
            ? publicUrl(prev[colorId].existingPath)
            : null,
      },
    }))
  }

  function toggleColorSize(colorId, size) {
    setColorSelections((prev) => {
      const current = prev[colorId]
      // null means "all sizes" — clicking a size switches to explicit list
      const currentSizes = current?.availableSizes ?? form.sizes
      const next = currentSizes.includes(size)
        ? currentSizes.filter((s) => s !== size)
        : [...currentSizes, size]
      // If all sizes are selected, store null (all) for simplicity
      const allSelected = form.sizes.every((s) => next.includes(s))
      return {
        ...prev,
        [colorId]: { ...current, availableSizes: allSelected ? null : next },
      }
    })
  }

  function isSizeAvailableForColor(colorId, size) {
    const sel = colorSelections[colorId]
    if (!sel?.availableSizes) return true // null = all sizes
    return sel.availableSizes.includes(size)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) { setError('Product name is required.'); return }
    if (!form.base_price || isNaN(parseFloat(form.base_price))) { setError('A valid base price is required.'); return }
    if (form.sizes.length === 0) { setError('At least one size is required.'); return }

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      product_type: form.product_type,
      description: form.description.trim() || null,
      base_price: parseFloat(form.base_price),
      sizes: form.sizes,
      size_price_overrides: form.size_price_overrides,
      active: form.active,
    }

    let productId = editingId

    if (editingId) {
      const { error: updateError } = await supabase.from('products').update(payload).eq('id', editingId)
      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      const { data, error: insertError } = await supabase.from('products').insert(payload).select().single()
      if (insertError) { setError(insertError.message); setSaving(false); return }
      productId = data.id

      // Auto-assign all existing designs to new product
      const { data: allDesigns } = await supabase.from('designs').select('id').eq('active', true)
      if (allDesigns && allDesigns.length > 0) {
        const designRows = allDesigns.map((d) => ({ design_id: d.id, product_id: productId }))
        await supabase.from('design_products').insert(designRows)
      }
    }

    // Upload any new color photos, building rows to insert
    const selectedEntries = Object.entries(colorSelections).filter(([, v]) => v.selected)
    const rows = []
    for (const [colorId, sel] of selectedEntries) {
      let imagePath = sel.existingPath || null
      if (sel.newFile) {
        const ext = sel.newFile.name.split('.').pop()
        imagePath = `${productId}/${colorId}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_BUCKET)
          .upload(imagePath, sel.newFile, { upsert: true })
        if (uploadError) { setError(`Photo upload failed: ${uploadError.message}`); setSaving(false); return }
      }
      rows.push({
        product_id: productId,
        color_id: colorId,
        image_path: imagePath,
        available_sizes: sel.availableSizes || null,
      })
    }

    await supabase.from('product_colors').delete().eq('product_id', productId)
    if (rows.length > 0) {
      const { error: colorError } = await supabase.from('product_colors').insert(rows)
      if (colorError) { setError(`Product saved, but colors failed: ${colorError.message}`); setSaving(false); return }
    }

    setSaving(false)
    resetForm()
    loadData()
  }

  async function toggleActive(product) {
    await supabase.from('products').update({ active: !product.active }).eq('id', product.id)
    loadData()
  }

  async function handleDelete(product) {
    if (!confirm(`Delete "${product.name}"? This will fail if it has existing orders.`)) return
    const { error: deleteError } = await supabase.from('products').delete().eq('id', product.id)
    if (deleteError) {
      alert('Could not delete — this product likely has existing orders. Consider deactivating it instead.')
    } else {
      loadData()
    }
  }

  return (
    <AdminLayout title="Manage Products">
      <div className="card" style={{ marginBottom: 24 }}>
        <h3>{editingId ? 'Edit Product' : 'Add a Product'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label htmlFor="p-name">Product Name</label>
              <input id="p-name" type="text" placeholder="e.g. Christian Ed T-Shirt"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="p-type">Type</label>
              <select id="p-type" value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value })}>
                <option value="tshirt">T-Shirt</option>
                <option value="hoodie">Sweatshirt/Hoodie</option>
                <option value="jacket">Jacket</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="p-price">Base Price ($)</label>
              <input id="p-price" type="number" step="0.01" min="0" placeholder="20.00"
                value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="p-desc">Description (optional)</label>
            <textarea id="p-desc" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Available Sizes &amp; Optional Price Overrides</label>
            <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 8px 0' }}>
              Leave a size's override blank to use the base price. Remove any sizes this product doesn't come in.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {form.sizes.map((size) => (
                <div key={size} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  border: '1px solid var(--color-silver)', borderRadius: 'var(--radius)', padding: '6px 10px',
                }}>
                  <strong style={{ fontSize: 13 }}>{size}</strong>
                  <input type="number" step="0.01" min="0" placeholder={form.base_price || '0.00'}
                    value={form.size_price_overrides[size] || ''}
                    onChange={(e) => setSizeOverride(size, e.target.value)}
                    style={{ width: 70, padding: '4px 6px' }} />
                  <button type="button" onClick={() => removeSize(size)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontWeight: 700, padding: '0 4px' }}
                    title="Remove size">×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Add size (e.g. Youth-M)" value={newSizeInput}
                onChange={(e) => setNewSizeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize() } }}
                style={{ maxWidth: 220 }} />
              <button type="button" className="btn btn-secondary" onClick={addSize}>Add Size</button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Available Colors &amp; Size Restrictions</label>
            <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 8px 0' }}>
              Check each color this product comes in. By default all sizes are available — uncheck sizes to restrict a color to specific sizes only.
            </p>
            {allColors.length === 0 ? (
              <p style={{ fontSize: 14, opacity: 0.7 }}>No colors set up yet — add colors on the Colors page first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allColors.map((color) => {
                  const sel = colorSelections[color.id]
                  const isSelected = sel?.selected
                  return (
                    <div key={color.id} style={{
                      border: '1px solid var(--color-silver)', borderRadius: 'var(--radius)',
                      padding: '10px 12px', background: isSelected ? 'var(--color-blush)' : 'white',
                    }}>
                      {/* Color toggle row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, cursor: 'pointer', marginBottom: 0 }}>
                          <input type="checkbox" checked={!!isSelected} onChange={() => toggleColor(color.id)} style={{ width: 'auto' }} />
                          <span style={{
                            width: 16, height: 16, borderRadius: '50%',
                            background: color.hex_value || '#ccc', display: 'inline-block',
                            border: '1px solid var(--color-silver)',
                          }} />
                          <strong>{color.name}</strong>
                        </label>
                        {isSelected && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                            {sel?.previewUrl && (
                              <img src={sel.previewUrl} alt={`${color.name} preview`}
                                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-silver)' }} />
                            )}
                            <input type="file" accept="image/*"
                              onChange={(e) => setColorPhoto(color.id, e.target.files?.[0] || null)}
                              style={{ fontSize: 13, width: 'auto' }} />
                          </div>
                        )}
                      </div>

                      {/* Size availability matrix for this color */}
                      {isSelected && form.sizes.length > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-silver-light)' }}>
                          <p style={{ fontSize: 12, opacity: 0.7, margin: '0 0 6px 0' }}>
                            Sizes available in {color.name} — uncheck to restrict:
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {form.sizes.map((size) => {
                              const available = isSizeAvailableForColor(color.id, size)
                              return (
                                <label key={size} style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 13, fontWeight: 400, cursor: 'pointer',
                                  padding: '4px 10px', borderRadius: 'var(--radius)',
                                  border: '1px solid var(--color-silver)',
                                  background: available ? 'white' : '#f5f5f5',
                                  opacity: available ? 1 : 0.5,
                                }}>
                                  <input type="checkbox" checked={available}
                                    onChange={() => toggleColorSize(color.id, size)}
                                    style={{ width: 'auto' }} />
                                  {size}
                                </label>
                              )
                            })}
                          </div>
                          {sel?.availableSizes && (
                            <p style={{ fontSize: 11, color: 'var(--color-wine)', marginTop: 4 }}>
                              ⚠ Restricted to: {sel.availableSizes.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Product'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        {loading ? <p>Loading…</p> : products.length === 0 ? (
          <p>No products yet — add your first one above.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Type</th><th>Base Price</th><th>Sizes</th><th>Colors</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} style={{ opacity: product.active ? 1 : 0.5 }}>
                  <td>{product.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{product.product_type}</td>
                  <td>${Number(product.base_price).toFixed(2)}</td>
                  <td>{(product.sizes || []).join(', ')}</td>
                  <td>{(product.productColors || []).length}</td>
                  <td>{product.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => startEdit(product)}>Edit</button>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => toggleActive(product)}>
                        {product.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => handleDelete(product)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}
