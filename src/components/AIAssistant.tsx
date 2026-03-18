'use client'

import { useState } from 'react'

interface AISuggestion {
  recommendation: string
  explanation: string
  suggestedSlots: string[]
  insights: string[]
}

interface AIAssistantProps {
  salonId: number
  mode?: 'insights' | 'booking'
  serviceId?: number
  date?: string
  onSlotSelect?: (slot: string) => void
}

export default function AIAssistant({ salonId, mode = 'insights', serviceId, date, onSlotSelect }: AIAssistantProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AISuggestion | null>(null)
  const [error, setError] = useState('')

  async function fetchInsights() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        salon_id: String(salonId),
        ...(serviceId ? { service_id: String(serviceId) } : {}),
        ...(date ? { date } : {}),
      })
      const res = await fetch(`/api/ai/suggest?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al obtener sugerencias')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'booking' && !result) {
    return (
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🤖</span>
          <h3 className="font-semibold text-gray-800">Asistente IA</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Obtén una sugerencia personalizada del mejor horario para tu cita.
        </p>
        <button
          onClick={fetchInsights}
          disabled={loading || !serviceId || !date}
          className="btn-primary text-sm py-1.5 px-3 disabled:opacity-40"
        >
          {loading ? 'Analizando...' : '✨ Sugerir mejor horario'}
        </button>
        {(!serviceId || !date) && (
          <p className="text-xs text-gray-400 mt-2">Selecciona servicio y fecha primero</p>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <p className="font-medium text-gray-800">Analizando patrones...</p>
            <p className="text-sm text-gray-500">La IA está procesando los datos del salón</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-4">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={fetchInsights} className="text-sm text-red-700 underline mt-2">Reintentar</button>
      </div>
    )
  }

  if (mode === 'insights' && !result) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🤖</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">IA Insights</h2>
            <p className="text-sm text-gray-500">Análisis inteligente de tu negocio</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          El asistente de IA analiza tus datos para ofrecerte recomendaciones personalizadas sobre horarios pico,
          tendencias de ingresos y optimización de servicios.
        </p>
        <button onClick={fetchInsights} className="btn-primary">
          ✨ Generar Análisis IA
        </button>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">🤖</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Recomendación IA</h3>
          <p className="text-xs text-primary-600">Powered by Claude</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <p className="text-sm font-medium text-gray-900 mb-1">Recomendación Principal</p>
        <p className="text-gray-700">{result.recommendation}</p>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <p className="text-sm font-medium text-gray-900 mb-1">Análisis</p>
        <p className="text-sm text-gray-600">{result.explanation}</p>
      </div>

      {result.suggestedSlots && result.suggestedSlots.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Horarios Sugeridos:</p>
          <div className="flex flex-wrap gap-2">
            {result.suggestedSlots.map((slot, i) => (
              <button
                key={i}
                onClick={() => onSlotSelect?.(slot)}
                className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {result.insights && result.insights.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Insights adicionales:</p>
          <ul className="space-y-1">
            {result.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-primary-500 mt-0.5">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={fetchInsights}
        className="mt-4 text-sm text-primary-600 hover:text-primary-700 underline"
      >
        Actualizar análisis
      </button>
    </div>
  )
}
