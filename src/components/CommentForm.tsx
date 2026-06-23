'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const INTEREST_OPTIONS = [
  {
    value: 'interesado',
    label: '⭐ Me interesa',
    activeClass: 'border-green-500 bg-green-50 text-green-700',
  },
  {
    value: 'comentario',
    label: '💬 Tengo una pregunta',
    activeClass: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  {
    value: 'no_interesado',
    label: '👎 No me interesa',
    activeClass: 'border-gray-400 bg-gray-50 text-gray-600',
  },
]

export default function CommentForm({ itemId }: { itemId: number }) {
  const router = useRouter()
  const [interestType, setInterestType] = useState('comentario')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/items/${itemId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, interest_type: interestType }),
    })

    if (res.ok) {
      setContent('')
      setInterestType('comentario')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Error al publicar el comentario')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex flex-wrap gap-2 mb-4">
        {INTEREST_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setInterestType(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition ${
              interestType === opt.value
                ? opt.activeClass
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        rows={3}
        maxLength={500}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
        placeholder={
          interestType === 'interesado'
            ? '¡Me interesa! Escribí algo para coordinar el intercambio...'
            : 'Escribí tu comentario o pregunta aquí...'
        }
      />

      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400">{content.length}/500</span>
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-800 transition disabled:opacity-50"
        >
          {loading ? 'Publicando...' : 'Publicar comentario'}
        </button>
      </div>
    </form>
  )
}
