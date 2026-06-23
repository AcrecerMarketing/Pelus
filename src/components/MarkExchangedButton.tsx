'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkExchangedButton({ itemId }: { itemId: number }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    const res = await fetch(`/api/items/${itemId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'intercambiado' }),
    })
    if (res.ok) {
      router.refresh()
    }
    setLoading(false)
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
      >
        ✓ Marcar como intercambiado
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-amber-800 text-sm font-semibold mb-1">¿Confirmar intercambio?</p>
        <p className="text-amber-700 text-xs">
          Se notificará a todos los usuarios que mostraron interés en esta prenda.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="flex-1 border-2 border-gray-300 text-gray-600 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition text-sm"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition text-sm disabled:opacity-50"
        >
          {loading ? 'Marcando...' : '✓ Confirmar'}
        </button>
      </div>
    </div>
  )
}
