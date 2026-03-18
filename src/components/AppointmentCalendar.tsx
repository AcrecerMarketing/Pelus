'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatShortDate, getStatusColor, getStatusLabel } from '@/lib/utils'

interface Appointment {
  id: number
  client_name: string
  client_phone: string
  client_email: string
  service_name: string
  employee_name: string
  start_time: string
  end_time: string
  status: string
  notes: string
  service_id: number
  employee_id: number
}

interface AppointmentCalendarProps {
  salonId: number
  employeeId?: number
  role?: 'admin' | 'employee'
}

type ViewMode = 'week' | 'day'

function getWeekDays(date: Date): Date[] {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setDate(diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8am to 6pm

export default function AppointmentCalendar({ salonId, employeeId, role = 'admin' }: AppointmentCalendarProps) {
  const [view, setView] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [showModal, setShowModal] = useState(false)

  const weekDays = getWeekDays(currentDate)
  const startDate = dateToStr(weekDays[0])
  const endDate = dateToStr(weekDays[6])

  useEffect(() => {
    loadAppointments()
  }, [startDate, endDate])

  async function loadAppointments() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        salon_id: String(salonId),
        start_date: startDate,
        end_date: endDate + 'T23:59:59',
        ...(employeeId ? { employee_id: String(employeeId) } : {}),
      })
      const res = await fetch(`/api/appointments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: number, status: string) {
    const res = await fetch(`/api/appointments?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setShowModal(false)
      setSelectedAppt(null)
      loadAppointments()
    }
  }

  function getAppointmentsForDay(date: Date): Appointment[] {
    const dateStr = dateToStr(date)
    return appointments.filter(a => a.start_time.startsWith(dateStr))
  }

  function getTopPosition(time: string): number {
    const d = new Date(time.replace(' ', 'T'))
    const hours = d.getHours()
    const minutes = d.getMinutes()
    return ((hours - 8) * 60 + minutes) / 60 * 80
  }

  function getHeight(start: string, end: string): number {
    const s = new Date(start.replace(' ', 'T'))
    const e = new Date(end.replace(' ', 'T'))
    const mins = (e.getTime() - s.getTime()) / 60000
    return (mins / 60) * 80
  }

  const statusColors: Record<string, string> = {
    confirmed: 'bg-emerald-100 border-emerald-400 text-emerald-800',
    pending: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    completed: 'bg-blue-100 border-blue-400 text-blue-800',
    cancelled: 'bg-red-100 border-red-400 text-red-800',
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
            className="btn-secondary px-2 py-1 text-sm"
          >←</button>
          <h3 className="font-semibold text-gray-900 text-sm">
            {weekDays[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
            className="btn-secondary px-2 py-1 text-sm"
          >→</button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="btn-secondary px-2 py-1 text-xs"
          >Hoy</button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1 rounded text-sm font-medium ${view === 'week' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >Semana</button>
          <button
            onClick={() => setView('day')}
            className={`px-3 py-1 rounded text-sm font-medium ${view === 'day' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >Día</button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500 text-sm">Cargando citas...</div>
      )}

      {!loading && (
        <div className="overflow-x-auto">
          <div className="flex" style={{ minWidth: '700px' }}>
            {/* Time column */}
            <div className="w-12 flex-shrink-0">
              <div className="h-8"></div>
              {HOURS.map(h => (
                <div key={h} className="h-20 flex items-start pt-1">
                  <span className="text-xs text-gray-400 leading-none">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Days */}
            {(view === 'week' ? weekDays : [currentDate]).map((day, idx) => {
              const dayAppts = getAppointmentsForDay(day)
              const isToday = dateToStr(day) === dateToStr(new Date())

              return (
                <div key={idx} className="flex-1 min-w-0 border-l border-gray-100">
                  {/* Day header */}
                  <div className={`h-8 text-center border-b border-gray-100 flex items-center justify-center gap-1 ${isToday ? 'bg-primary-50' : ''}`}>
                    <span className="text-xs text-gray-500">{day.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                    <span className={`text-xs font-bold ${isToday ? 'text-primary-600' : 'text-gray-700'}`}>{day.getDate()}</span>
                  </div>

                  {/* Hour grid + appointments */}
                  <div className="relative">
                    {HOURS.map(h => (
                      <div key={h} className="h-20 border-b border-gray-50"></div>
                    ))}

                    {dayAppts.map(appt => (
                      <button
                        key={appt.id}
                        onClick={() => { setSelectedAppt(appt); setShowModal(true) }}
                        className={`absolute left-0.5 right-0.5 rounded text-xs p-1 border-l-2 text-left overflow-hidden hover:opacity-90 transition-opacity ${statusColors[appt.status] || 'bg-gray-100 border-gray-400 text-gray-800'}`}
                        style={{
                          top: `${getTopPosition(appt.start_time)}px`,
                          height: `${Math.max(getHeight(appt.start_time, appt.end_time), 24)}px`,
                        }}
                      >
                        <div className="font-medium truncate">{appt.client_name}</div>
                        <div className="truncate opacity-75">{appt.service_name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {showModal && selectedAppt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalle de Cita</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <span className={`badge ${getStatusColor(selectedAppt.status)}`}>{getStatusLabel(selectedAppt.status)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Cliente</p>
                  <p className="font-medium">{selectedAppt.client_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Teléfono</p>
                  <p className="font-medium">{selectedAppt.client_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Servicio</p>
                  <p className="font-medium">{selectedAppt.service_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Estilista</p>
                  <p className="font-medium">{selectedAppt.employee_name || 'Sin asignar'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Inicio</p>
                  <p className="font-medium">{formatTime(selectedAppt.start_time)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Fin</p>
                  <p className="font-medium">{formatTime(selectedAppt.end_time)}</p>
                </div>
              </div>
              {selectedAppt.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notas</p>
                  <p className="text-sm">{selectedAppt.notes}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedAppt.status === 'pending' && (
                <button
                  onClick={() => updateStatus(selectedAppt.id, 'confirmed')}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  Confirmar
                </button>
              )}
              {(selectedAppt.status === 'confirmed' || selectedAppt.status === 'pending') && (
                <button
                  onClick={() => updateStatus(selectedAppt.id, 'completed')}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  Completar
                </button>
              )}
              {selectedAppt.status !== 'cancelled' && selectedAppt.status !== 'completed' && (
                <button
                  onClick={() => updateStatus(selectedAppt.id, 'cancelled')}
                  className="btn-danger text-sm py-1.5 px-3"
                >
                  Cancelar
                </button>
              )}
              <button onClick={() => setShowModal(false)} className="btn-secondary text-sm py-1.5 px-3">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
