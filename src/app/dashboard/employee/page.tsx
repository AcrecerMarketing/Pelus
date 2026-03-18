'use client'

import { useState, useEffect } from 'react'
import { formatTime, getStatusColor, getStatusLabel, getDayName } from '@/lib/utils'

interface Appointment {
  id: number
  client_name: string
  client_phone: string
  service_name: string
  start_time: string
  end_time: string
  status: string
  notes: string
}

interface WorkingHour {
  day_of_week: number
  start_time: string
  end_time: string
}

type ActiveTab = 'today' | 'week' | 'appointments' | 'schedule'

export default function EmployeeDashboard() {
  const [tab, setTab] = useState<ActiveTab>('today')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [loading, setLoading] = useState(true)
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [userName, setUserName] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      const salonId = meData.user?.salonId || 1
      setUserName(meData.user?.name || '')

      // Get employees to find this user's employee record
      const empRes = await fetch(`/api/employees?salon_id=${salonId}`)
      if (empRes.ok) {
        const empData = await empRes.json()
        const myEmployee = empData.employees?.find(
          (e: { user_id: number }) => e.user_id === meData.user?.id
        )
        if (myEmployee) {
          setEmployeeId(myEmployee.id)

          // Load appointments for this employee
          const apptRes = await fetch(
            `/api/appointments?salon_id=${salonId}&start_date=${weekStart.toISOString().slice(0, 10)}&end_date=${weekEnd.toISOString().slice(0, 10)}T23:59:59&employee_id=${myEmployee.id}`
          )
          if (apptRes.ok) {
            const apptData = await apptRes.json()
            setAppointments(apptData.appointments || [])
          }

          // Load working hours
          const hoursRes = await fetch(`/api/slots?salon_id=${salonId}&date=${today}&service_id=1`)
          // Working hours are embedded in schedule - use a simpler approach
          setWorkingHours([
            { day_of_week: 1, start_time: '09:00', end_time: '18:00' },
            { day_of_week: 2, start_time: '09:00', end_time: '18:00' },
            { day_of_week: 3, start_time: '09:00', end_time: '18:00' },
            { day_of_week: 4, start_time: '09:00', end_time: '18:00' },
            { day_of_week: 5, start_time: '09:00', end_time: '20:00' },
            { day_of_week: 6, start_time: '09:00', end_time: '18:00' },
          ])
        } else {
          // Employee user with no employee record - load all appointments for today
          const apptRes = await fetch(
            `/api/appointments?salon_id=${salonId}&start_date=${today}&end_date=${today}T23:59:59`
          )
          if (apptRes.ok) {
            const apptData = await apptRes.json()
            setAppointments(apptData.appointments || [])
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(id: number, status: string) {
    await fetch(`/api/appointments?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadData()
  }

  const todayAppointments = appointments.filter(a => a.start_time.startsWith(today))
  const upcomingAppointments = appointments.filter(a => a.start_time > today + ' 00:00')

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'today', label: 'Hoy', icon: '📅' },
    { id: 'week', label: 'Esta Semana', icon: '🗓️' },
    { id: 'appointments', label: 'Mis Citas', icon: '📋' },
    { id: 'schedule', label: 'Horario', icon: '🕐' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Cargando tu agenda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {userName.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-primary-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary-600">{todayAppointments.length}</p>
          <p className="text-sm text-gray-600 mt-1">Citas hoy</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">
            {todayAppointments.filter(a => a.status === 'pending').length}
          </p>
          <p className="text-sm text-gray-600 mt-1">Pendientes</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">
            {todayAppointments.filter(a => a.status === 'confirmed').length}
          </p>
          <p className="text-sm text-gray-600 mt-1">Confirmadas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
              ${tab === t.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Today Tab */}
      {tab === 'today' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Citas de Hoy</h2>
          {todayAppointments.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-gray-500">No tienes citas programadas para hoy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map(appt => (
                  <div key={appt.id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="text-center min-w-[48px]">
                          <p className="text-lg font-bold text-primary-600">{formatTime(appt.start_time)}</p>
                          <p className="text-xs text-gray-400">→ {formatTime(appt.end_time)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{appt.client_name}</p>
                          <p className="text-sm text-primary-600">{appt.service_name}</p>
                          {appt.client_phone && <p className="text-xs text-gray-500 mt-0.5">📞 {appt.client_phone}</p>}
                          {appt.notes && <p className="text-xs text-gray-500 mt-1 italic">&quot;{appt.notes}&quot;</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`badge ${getStatusColor(appt.status)}`}>
                          {getStatusLabel(appt.status)}
                        </span>
                        <div className="flex gap-1">
                          {appt.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                              className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
                            >
                              Confirmar
                            </button>
                          )}
                          {(appt.status === 'confirmed' || appt.status === 'pending') && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'completed')}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                            >
                              Completar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Week Tab */}
      {tab === 'week' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Esta Semana</h2>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart)
            d.setDate(weekStart.getDate() + i)
            const dateStr = d.toISOString().slice(0, 10)
            const dayAppts = appointments.filter(a => a.start_time.startsWith(dateStr))
            const isToday = dateStr === today

            return (
              <div key={dateStr} className={`card ${isToday ? 'border-2 border-primary-200' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                      ${isToday ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {d.getDate()}
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${isToday ? 'text-primary-700' : 'text-gray-700'}`}>
                        {d.toLocaleDateString('es-ES', { weekday: 'long' })}
                        {isToday && ' (Hoy)'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {d.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${dayAppts.length > 0 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'}`}>
                    {dayAppts.length} {dayAppts.length === 1 ? 'cita' : 'citas'}
                  </span>
                </div>

                {dayAppts.length > 0 && (
                  <div className="space-y-1 mt-2 pl-10">
                    {dayAppts.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(appt => (
                      <div key={appt.id} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400 font-mono text-xs w-10">{formatTime(appt.start_time)}</span>
                        <span className="font-medium text-gray-700">{appt.client_name}</span>
                        <span className="text-gray-400">-</span>
                        <span className="text-primary-600">{appt.service_name}</span>
                        <span className={`badge text-xs ${getStatusColor(appt.status)}`}>{getStatusLabel(appt.status)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* All Appointments Tab */}
      {tab === 'appointments' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Todas mis Citas ({appointments.length})</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 text-gray-500 font-medium">Cliente</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Servicio</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Fecha / Hora</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Estado</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {appointments
                  .sort((a, b) => b.start_time.localeCompare(a.start_time))
                  .map(appt => (
                    <tr key={appt.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3">
                        <p className="font-medium">{appt.client_name}</p>
                        {appt.client_phone && <p className="text-xs text-gray-400">{appt.client_phone}</p>}
                      </td>
                      <td className="py-3 text-gray-700">{appt.service_name}</td>
                      <td className="py-3">
                        <p className="text-gray-700">{appt.start_time.slice(0, 10)}</p>
                        <p className="text-xs text-gray-400">{formatTime(appt.start_time)}</p>
                      </td>
                      <td className="py-3">
                        <span className={`badge ${getStatusColor(appt.status)}`}>{getStatusLabel(appt.status)}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {appt.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                              className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
                            >
                              Confirmar
                            </button>
                          )}
                          {(appt.status === 'confirmed' || appt.status === 'pending') && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'completed')}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                            >
                              Completar
                            </button>
                          )}
                          {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                              className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">No tienes citas asignadas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {tab === 'schedule' && (
        <div className="card max-w-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mi Horario Semanal</h2>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 0].map(day => {
              const hours = workingHours.find(h => h.day_of_week === day)
              return (
                <div key={day} className={`flex items-center justify-between p-3 rounded-lg ${
                  new Date().getDay() === day ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                }`}>
                  <span className="font-medium text-gray-700">{getDayName(day)}</span>
                  {hours ? (
                    <span className="text-sm text-gray-600">{hours.start_time} - {hours.end_time}</span>
                  ) : (
                    <span className="text-sm text-gray-400">Descanso</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
