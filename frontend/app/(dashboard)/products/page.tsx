'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Package, Upload, X } from 'lucide-react'
import { useBusiness } from '@/lib/business-context'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Product = {
  id: string
  name: string
  description: string
  price: number
  currency: string
  stock_quantity: number
  category: string
  image_url: string
  is_available: boolean
}

const emptyForm = {
  name: '', description: '', price: '',
  stock_quantity: '', category: '', image_url: '',
}

export default function ProductsPage() {
  const { businessId } = useBusiness()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (businessId) fetchProducts()
  }, [businessId])

  async function fetchProducts() {
    try {
      const res = await fetch(`${API}/products/business/${businessId}`)
      const data = await res.json()
      setProducts(data.products || [])
    } finally {
      setLoading(false)
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function uploadImage(file: File): Promise<string | null> {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const filename = `${businessId}/${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from('products')
        .upload(filename, file, { upsert: true })

      if (error) throw error

      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(filename)

      return data.publicUrl
    } catch (e) {
      console.error('Upload failed:', e)
      return null
    } finally {
      setUploading(false)
    }
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    setForm(f => ({ ...f, image_url: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    if (!form.name || !form.price) return
    setSaving(true)
    try {
      let imageUrl = form.image_url

      if (imageFile) {
        const uploaded = await uploadImage(imageFile)
        if (uploaded) imageUrl = uploaded
      }

      const payload = {
        business_id: businessId,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity) || 0,
        category: form.category,
        image_url: imageUrl,
      }

      if (editId) {
        await fetch(`${API}/products/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch(`${API}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      setForm(emptyForm)
      setImageFile(null)
      setImagePreview(null)
      setShowForm(false)
      setEditId(null)
      fetchProducts()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return
    await fetch(`${API}/products/${id}`, { method: 'DELETE' })
    fetchProducts()
  }

  function handleEdit(p: Product) {
    setForm({
      name: p.name,
      description: p.description || '',
      price: p.price.toString(),
      stock_quantity: p.stock_quantity.toString(),
      category: p.category || '',
      image_url: p.image_url || '',
    })
    setImagePreview(p.image_url || null)
    setEditId(p.id)
    setShowForm(true)
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>
            Products
          </h1>
          <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 2 }}>
            {products.length} products in your catalogue
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditId(null)
            setForm(emptyForm)
            setImageFile(null)
            setImagePreview(null)
          }}
          className="btn btn-primary"
        >
          <Plus size={14} /> Add product
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-900)', marginBottom: 16 }}>
            {editId ? 'Edit product' : 'New product'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
            {/* Image upload */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 8 }}>
                Product image
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', height: 180,
                  border: `2px dashed ${imagePreview ? 'var(--brand-primary)' : 'var(--neutral-200)'}`,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden',
                  background: 'var(--neutral-50)',
                  position: 'relative',
                  transition: 'border-color 0.15s',
                }}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      onClick={e => { e.stopPropagation(); clearImage() }}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={12} color="#fff" />
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Upload size={24} color="var(--neutral-300)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 12, color: 'var(--neutral-400)' }}>
                      Tap to upload photo
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--neutral-300)', marginTop: 2 }}>
                      JPG, PNG up to 5MB
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              {uploading && (
                <div style={{ fontSize: 11, color: 'var(--brand-primary)', marginTop: 6, textAlign: 'center' }}>
                  Uploading...
                </div>
              )}
            </div>

            {/* Product details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'name', label: 'Product name *', placeholder: 'e.g. Ankara Dress Set' },
                { key: 'price', label: 'Price (₦) *', placeholder: 'e.g. 25000', type: 'number' },
                { key: 'stock_quantity', label: 'Stock quantity', placeholder: 'e.g. 10', type: 'number' },
                { key: 'category', label: 'Category', placeholder: 'e.g. Dresses, Tops, Accessories' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 4 }}>
                    {label}
                  </label>
                  <input
                    type={type || 'text'}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 4 }}>
                  Description
                </label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : uploading ? 'Uploading...' : editId ? 'Update product' : 'Add product'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); clearImage() }}
              className="btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Products grid */}
      {loading ? (
        <div style={{ color: 'var(--neutral-400)', fontSize: 13 }}>Loading products...</div>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Package size={40} color="var(--neutral-300)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 4 }}>No products yet</div>
          <div style={{ fontSize: 12, color: 'var(--neutral-300)' }}>
            Add your first product so the AI can answer pricing questions
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  style={{ width: '100%', height: 160, objectFit: 'cover' }}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div style={{
                  height: 100, background: 'var(--neutral-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Package size={32} color="var(--neutral-300)" />
                </div>
              )}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    {p.category && (
                      <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 1 }}>{p.category}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-primary)', whiteSpace: 'nowrap' }}>
                    {formatCurrency(p.price, p.currency)}
                  </div>
                </div>
                {p.description && (
                  <div style={{
                    fontSize: 12, color: 'var(--neutral-500)', marginTop: 6, lineHeight: 1.5,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {p.description}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <span style={{
                    fontSize: 11,
                    color: p.stock_quantity > 0 ? 'var(--success)' : 'var(--danger)',
                    fontWeight: 500,
                  }}>
                    {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleEdit(p)}
                      style={{
                        padding: '5px 8px', border: '1px solid var(--neutral-200)',
                        borderRadius: 6, background: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Pencil size={12} color="var(--neutral-500)" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      style={{
                        padding: '5px 8px', border: '1px solid var(--danger-bg)',
                        borderRadius: 6, background: 'var(--danger-bg)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Trash2 size={12} color="var(--danger)" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}