import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL']

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
  const [selectedColorIds, setSelectedColorIds] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [newSizeInput, setNewSizeInput] = useState('')

  async function loadData() {
    setLoading(true)
    const [productsRes, colorsRes, productColorsRes] = await Promise.all([
      supabase.from('products').select('*').order('sort_order'),
      supabase.from('colors').select('*').eq('active', true).order('name'),
      supabase.from('product_colors').select('product_id, color_id'),
    ])

    if (productsRes.error) {
      setError(productsRes.error.message)
    } else {
      const colorMap = {}
      ;(productColorsRes.data || []).forEach((pc) => {
        if (!colorMap[pc.product_id]) colorMap[pc.product_id] = []
        colorMap[pc.product_id].push(pc.color_id)
      })
      setProducts(productsRes.data.map((p) => ({ ...p, colorIds: colorMap[p.id] || [] })))
    }
    setAllColors(colorsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function resetForm() {
    setForm(emptyForm)
    setSelectedColorIds([])
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
    setSelectedColorIds(product.colorIds || [])
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
    if (value === '') {
      delete overrides[size]
    } else {
      overrides[size] = value
    }
    setForm({ ...form, size_price_overrides: overrides })
  }

  function toggleColor(colorId) {
    setSelectedColorIds((prev) =>
      prev.includes(colorId) ? prev.filter((id) => id !== colorId) : [...prev, colorId]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Product name is required.')
      return
    }
    if (!form.base_price || isNaN(parseFloat(form.base_price))) {
      setError('A valid base price is required.')
      return
    }
    if (form.sizes.length === 0) {
      setError('At least one size is required.')
      return
    }

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
      if (updateError) {
        setError(updateError.message)
        return
      }
    } else {
      const { data, error: insertError } = await supabase.from('products').insert(payload).select().single()
      if (insertError) {
        setError(insertError.message)
        return
      }
      productId = data.id
    }

    // Sync product_colors join table
    await supabase.from('product_colors').delete().eq('product_id', productId)
    if (selectedColorIds.length > 0) {
      const rows = selectedColorIds.map((colorId) => ({ product_id: productId, color_id: colorId }))
      const { error: colorError } = await supabase.from('product_colors').insert(rows)
      if (colorError) {
        setError(`Product saved, but colors failed to save: ${colorError.message}`)
        return
      }
    }

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
      alert('Could not delete — this product likely has existing orders or assigned designs. Consider deactivating it instead.')
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
              <input
                id="p-name"
                type="text"
                placeholder="e.g. Christian Ed T-Shirt"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="p-type">Type</label>
              <select
                id="p-type"
                value={form.product_type}
                onChange={(e) => setForm({ ...form, product_type: e.target.value })}
              >
                <option value="tshirt">T-Shirt</option>
                <option value="hoodie">Sweatshirt/Hoodie</option>
                <option value="jacket">Jacket</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="p-price">Base Price ($)</label>
              <input
                id="p-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="20.00"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="p-desc">Description (optional)</label>
            <textarea
              id="p-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Available Sizes &amp; Optional Price Overrides</label>
            <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 8px 0' }}>
              Leave a size's override blank to use the base price.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {form.sizes.map((size) => (
                <div key={size} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  border: '1px solid var(--color-silver)', borderRadius: 'var(--radius)',
                  padding: '6px 10px',
                }}>
                  <strong style={{ fontSize: 13 }}>{size}</strong>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={form.base_price || '0.00'}
                    value={form.size_price_overrides[size] || ''}
                    onChange={(e) => setSizeOverride(size, e.target.value)}
                    style={{ width: 70, padding: '4px 6px' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeSize(size)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontWeight: 700, padding: '0 4px' }}
                    title="Remove size"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Add size (e.g. 3XL, Youth-M)"
                value={newSizeInput}
                onChange={(e) => setNewSizeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize() } }}
                style={{ maxWidth: 220 }}
              />
              <button type="button" className="btn btn-secondary" onClick={addSize}>Add Size</button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Available Colors for This Product</label>
            {allColors.length === 0 ? (
              <p style={{ fontSize: 14, opacity: 0.7 }}>No colors set up yet — add colors on the Colors page first.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {allColors.map((color) => (
                  <label key={color.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400,
                    border: '1px solid var(--color-silver)', borderRadius: 'var(--radius)',
                    padding: '6px 10px', cursor: 'pointer',
                    background: selectedColorIds.includes(color.id) ? 'var(--color-blush)' : 'white',
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedColorIds.includes(color.id)}
                      onChange={() => toggleColor(color.id)}
                      style={{ width: 'auto' }}
                    />
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: color.hex_value || '#ccc', display: 'inline-block',
                      border: '1px solid var(--color-silver)',
                    }} />
                    {color.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Save Changes' : 'Add Product'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading…</p>
        ) : products.length === 0 ? (
          <p>No products yet — add your first one above.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Base Price</th>
                <th>Sizes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} style={{ opacity: product.active ? 1 : 0.5 }}>
                  <td>{product.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{product.product_type}</td>
                  <td>${Number(product.base_price).toFixed(2)}</td>
                  <td>{(product.sizes || []).join(', ')}</td>
                  <td>{product.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => startEdit(product)}>
                        Edit
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => toggleActive(product)}>
                        {product.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => handleDelete(product)}>
                        Delete
                      </button>
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
