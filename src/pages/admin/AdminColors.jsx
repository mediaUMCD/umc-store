import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function AdminColors() {
  const [colors, setColors] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', hex_value: '#3D0026' })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  async function loadColors() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('colors')
      .select('*')
      .order('name')
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setColors(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadColors()
  }, [])

  function resetForm() {
    setForm({ name: '', hex_value: '#3D0026' })
    setEditingId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Color name is required.')
      return
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from('colors')
        .update({ name: form.name.trim(), hex_value: form.hex_value })
        .eq('id', editingId)
      if (updateError) {
        setError(updateError.message)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('colors')
        .insert({ name: form.name.trim(), hex_value: form.hex_value })
      if (insertError) {
        setError(insertError.message)
        return
      }
    }

    resetForm()
    loadColors()
  }

  function startEdit(color) {
    setForm({ name: color.name, hex_value: color.hex_value || '#3D0026' })
    setEditingId(color.id)
  }

  async function toggleActive(color) {
    await supabase.from('colors').update({ active: !color.active }).eq('id', color.id)
    loadColors()
  }

  async function handleDelete(color) {
    if (!confirm(`Delete "${color.name}"? This will fail if it's still assigned to a product.`)) return
    const { error: deleteError } = await supabase.from('colors').delete().eq('id', color.id)
    if (deleteError) {
      alert('Could not delete — this color is likely still assigned to one or more products. Consider deactivating it instead.')
    } else {
      loadColors()
    }
  }

  return (
    <AdminLayout title="Manage Colors">
      <p style={{ opacity: 0.75, marginTop: -8, marginBottom: 24 }}>
        This is the global color pool. When creating or editing a product, you'll choose which of these colors that specific product offers.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>{editingId ? 'Edit Color' : 'Add a Color'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label htmlFor="color-name">Name</label>
              <input
                id="color-name"
                type="text"
                placeholder="e.g. Burgundy"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div style={{ flex: '0 0 100px' }}>
              <label htmlFor="color-hex">Swatch</label>
              <input
                id="color-hex"
                type="color"
                value={form.hex_value}
                onChange={(e) => setForm({ ...form, hex_value: e.target.value })}
                style={{ height: 38, padding: 2 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Save Changes' : 'Add Color'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </div>
          {error && <p style={{ color: 'var(--color-danger)', fontSize: 14, marginTop: 12 }}>{error}</p>}
        </form>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading…</p>
        ) : colors.length === 0 ? (
          <p>No colors yet — add your first one above.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Swatch</th>
                <th>Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => (
                <tr key={color.id} style={{ opacity: color.active ? 1 : 0.5 }}>
                  <td>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: color.hex_value || '#ccc',
                      border: '1px solid var(--color-silver)',
                    }} />
                  </td>
                  <td>{color.name}</td>
                  <td>{color.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => startEdit(color)}>
                        Edit
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => toggleActive(color)}>
                        {color.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => handleDelete(color)}>
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
