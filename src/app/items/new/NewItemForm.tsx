'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { value: 'pantalon', label: 'Pantalón', icon: '👖' },
  { value: 'pulso', label: 'Pulso / Buzo', icon: '🧥' },
  { value: 'remera', label: 'Remera', icon: '👕' },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '6', '8', '10', '12', '14', '16']

export default function NewItemForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('remera')
  const [size, setSize] = useState('M')
  const [description, setDescription] = useState('')
  const [imageData, setImageData] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 800
        let w = img.width
        let h = img.height
        if (w > maxSize) {
          h = Math.round((h * maxSize) / w)
          w = maxSize
        }
        if (h > maxSize) {
          w = Math.round((w * maxSize) / h)
          h = maxSize
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const base64 = canvas.toDataURL('image/jpeg', 0.75)
        setImageData(base64)
        setImagePreview(base64)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, size, description, image_data: imageData }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/items/${data.id}`)
    } else {
      const data = await res.json()
      setError(data.error || 'Error al publicar la prenda')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de prenda *</label>
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                category === cat.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-3xl">{cat.icon}</span>
              <span
                className={`text-xs font-semibold ${
                  category === cat.value ? 'text-blue-700' : 'text-gray-500'
                }`}
              >
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Título *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={100}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ej: Pantalón azul marino talle M, buen estado"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Talle *</label>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`w-12 h-10 rounded-lg text-sm font-semibold border-2 transition ${
                size === s
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={500}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Describí el estado de la prenda, cuánto tiempo fue usada, si tiene algún desgaste, etc."
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Foto de la prenda
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl cursor-pointer transition overflow-hidden ${
            imagePreview ? 'border-blue-300' : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          {imagePreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Vista previa"
                className="w-full max-h-64 object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                <span className="bg-white text-gray-800 px-4 py-2 rounded-xl font-medium text-sm">
                  📷 Cambiar foto
                </span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <div className="text-4xl mb-3">📷</div>
              <div className="text-sm font-medium">Tocá para subir una foto</div>
              <div className="text-xs mt-1">JPG, PNG — máx. 10MB</div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !title.trim()}
        className="w-full bg-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition disabled:opacity-50"
      >
        {loading ? 'Publicando...' : '✓ Publicar prenda'}
      </button>
    </form>
  )
}
