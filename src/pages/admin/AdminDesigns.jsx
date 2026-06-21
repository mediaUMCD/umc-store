import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

const STORAGE_BUCKET = 'store-designs'

const emptyForm = { name: '', category: '' }

export default function AdminDesigns() {
  const [designs, setDesigns] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [file, setFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function loadData() {
    setLoading(true)
    const [designsRes, productsRes, designProductsRes] = await Promise.all([
      supabase.from('designs').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('active', true).order('sort_order'),
      supabase.from('design_products').select('design_id, product_id'),
    ])

    if (designsRes.error) {
      setError(designsRes.error.message)
    } else {
      const productMap = {}
      ;(designProductsRes.data || []).forEach((dp) => {
        if (!productMap[dp.design_id]) productMap[dp.design_id] = []
        productMap[dp.design_id].push(dp.product_id)
      })

      const withUrls = designsRes.data.map((d) => ({
        ...d,
        productIds: productMap[d.id] || [],
        publicUrl: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(d.image_path).data.publicUrl,
      }))
      setDesigns(withUrls)
    }
    setAllProducts(productsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function resetForm() {
    setForm(emptyForm)
    setSelectedProductIds([])
    setFile(null)
    setEditingId(null)
  }

  function startEdit(design) {
    setForm({ name: design.name, category: design.category || '' })
    setSelectedProductIds(design.productIds || [])
    setEditingId(design.id)
    setFile(null)
  }

  function toggleProduct(productId) {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Design name is required.')
      return
    }
    if (!editingId && !file) {
      setError('Please choose an image file to upload.')
      return
    }

    setUploading(true)
    let imagePath = null

    if (file) {
      const fileExt = file.name.split('.').pop()
      const safeName = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
      imagePath = `${safeName}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(imagePath, file)

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        setUploading(false)
        return
      }
    }

    let designId = editingId

    if (editingId) {
      const updatePayload = { name: form.name.trim(), category: form.category.trim() || null }
      if (imagePath) updatePayload.image_path = imagePath

      const { error: updateError } = await supabase.from('designs').update(updatePayload).eq('id', editingId)
      if (updateError) {
        setError(updateError.message)
        setUploading(false)
        return
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('designs')
        .insert({ name: form.name.trim(), category: form.category.trim() || null, image_path: imagePath })
        .select()
        .single()
      if (insertError) {
        setError(insertError.message)
        setUploading(false)
        return
      }
      designId = data.id
    }

    // Sync design_products join table
    await supabase.from('design_products').delete().eq('design_id', designId)
    if (selectedProductIds.length > 0) {
      const rows = selectedProductIds.map((productId) => ({ design_id: designId, product_id: productId }))
      const { error: linkError } = await supabase.from('design_products').insert(rows)
      if (linkError) {
        setError(`Design saved, but product assignments failed: ${linkError.message}`)
        setUploading(false)
        return
      }
    }

    setUploading(false)
    resetForm()
    loadData()
  }

  async function toggleActive(design) {
    await supabase.from('designs').update({ active: !design.active }).eq('id', design.id)
    loadData()
  }

  async function handleDelete(design) {
    if (!confirm(`Delete "${design.name}"? This will fail if it's been used in existing orders.`)) return
    const { error: deleteError } = await supabase.from('designs').delete().eq('id', design.id)
    if (deleteError) {
      alert('Could not delete — this design is likely referenced by existing orders. Consider deactivating it instead.')
    } else {
      await supabase.storage.from(STORAGE_BUCKET).remove([design.image_path])
      loadData()
    }
  }

  return (
    <AdminLayout title="Manage Designs">
      <p style={{ opacity: 0.75, marginTop: -8, marginBottom: 24 }}>
        Upload graphics here, then choose which products each design is allowed to appear on. Customers will only see designs assigned to the product they're ordering.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>{editingId ? 'Edit Design' : 'Upload a Design'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label htmlFor="d-name">Design Name</label>
              <input
                id="d-name"
                type="text"
                placeholder="e.g. UMCD Cross Logo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="d-category">Category (optional)</label>
              <input
                id="d-category"
                type="text"
                placeholder="e.g. Christian Ed"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="d-file">
              {editingId ? 'Replace Image (optional)' : 'Design Image'}
            </label>
            <input
              id="d-file"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Allowed on Products</label>
            {allProducts.length === 0 ? (
              <p style={{ fontSize: 14, opacity: 0.7 }}>No products set up yet — add products on the Products page first.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {allProducts.map((product) => (
                  <label key={product.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400,
                    border: '1px solid var(--color-silver)', borderRadius: 'var(--radius)',
                    padding: '6px 10px', cursor: 'pointer',
                    background: selectedProductIds.includes(product.id) ? 'var(--color-blush)' : 'white',
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      style={{ width: 'auto' }}
                    />
                    {product.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Saving…' : editingId ? 'Save Changes' : 'Upload Design'}
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
        ) : designs.length === 0 ? (
          <p>No designs yet — upload your first one above.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {designs.map((design) => (
              <div key={design.id} className="card" style={{
                padding: 12, opacity: design.active ? 1 : 0.5, boxShadow: 'none',
                border: '1px solid var(--color-silver-light)',
              }}>
                <div style={{
                  width: '100%', height: 140, borderRadius: 'var(--radius)',
                  background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', marginBottom: 10,
                }}>
                  <img src={design.publicUrl} alt={design.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <strong style={{ fontSize: 14 }}>{design.name}</strong>
                {design.category && <div style={{ fontSize: 12, opacity: 0.6 }}>{design.category}</div>}
                <div style={{ fontSize: 12, opacity: 0.6, margin: '4px 0 10px' }}>
                  {design.productIds.length} product{design.productIds.length === 1 ? '' : 's'} assigned
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startEdit(design)}>
                    Edit
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggleActive(design)}>
                    {design.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(design)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
