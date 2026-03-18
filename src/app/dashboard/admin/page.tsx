'use client'

import { useState, useEffect } from 'react'
import AppointmentCalendar from '@/components/AppointmentCalendar'
import { formatCurrency, formatDate, formatTime, getStatusColor, getStatusLabel } from '@/lib/utils'

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

interface Employee {
  id: number
  name: string
  specialty: string
  avatar_color: string
}

interface Service {
  id: number
  name: string
  duration_minutes: number
  price: number
}

type ActiveTab = 'calendar' | 'appointments' | 'customers' | 'staff'

export default function AdminDashboard() {
  const [tab, setTab] = useState<ActiveTab>('calendar')
  const [salonId, setSalonId] = useState(1)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const [apptForm, setApptForm] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    service_id: '',
    employee_id: '',
    start_time: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      const sid = meData.user?.salonId || 1
      setSalonId(sid)

      const [apptRes, empRes, svcRes] = await Promise.all([
        fetch(`/api/appointments?salon_id=${sid}`),
        fetch(`/api/employees?salon_id=${sid}`),
        fetch(`/api/services?salon_id=${sid}&active=1`),
      ])

      if (apptRes.ok) setAppointments((await apptRes.json()).appointments || [])
      if (empRes.ok) setEmployees((await empRes.json()).employees || [])
      if (svcRes.ok) setServices((await svcRes.json()).services || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAppointment() {
    if (!apptForm.client_name || !apptForm.service_id || !apptForm.start_time) return

    const service = services.find(s => s.id === Number(apptForm.service_id))
    if (!service) return

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salon_id: salonId,
        client_name: apptForm.client_name,
        client_phone: apptForm.client_phone,
        client_email: apptForm.client_email,
        service_id: Number(apptForm.service_id),
        employee_id: apptForm.employee_id ? Number(apptForm.employee_id) : null,
        start_time: apptForm.start_time.replace('T', ' '),
        notes: apptForm.notes,
      }),
    })

    if (res.ok) {
      setShowCreateForm(false)
      setApptForm({ client_name: '', client_phone: '', client_email: '', service_id: '', employee_id: '', start_time: '', notes: '' })
      loadData()
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

  const filteredAppointments = filterStatus
    ? appointments.filter(a => a.status === filterStatus)
    : appointments

  // Build unique clients list
  const clients = Array.from(
    new Map(appointments.map(a => [a.client_email || a.client_name, a])).values()
  )

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'calendar', label: 'Calendario', icon: '📅' },
    { id: 'appointments', label: 'Citas', icon: '📋' },
    { id: 'customers', label: 'Clientes', icon: '👤' },
    { id: 'staff', label: 'Personal', icon: '👥' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona citas y personal</p>
        </div>
        <button onClick={() => setShowCreateForm(true)} className="btn-primary">
          + Nueva Cita
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Pendientes', count: appointments.filter(a => a.status === 'pending').length, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Confirmadas', count: appointments.filter(a => a.status === 'confirmed').length, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Completadas', count: appointments.filter(a => a.status === 'completed').length, color: 'text-blue-600 bg-blue-50' },
          { label: 'Canceladas', count: appointments.filter(a => a.status === 'cancelled').length, color: 'text-red-600 bg-red-50' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl p-3 ${stat.color.split(' ')[1]}`}>
            <p className={`text-2xl font-bold ${stat.color.split(' ')[0]}`}>{stat.count}</p>
            <p className="text-sm text-gray-600 mt-0.5">{stat.label}</p>
          </div>
        ))}
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

      {/* Calendar Tab */}
      {tab === 'calendar' && (
        <AppointmentCalendar salonId={salonId} role="admin" />
      )}

      {/* Appointments Tab */}
      {tab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {s === '' ? 'Todas' : getStatusLabel(s)}
              </button>
            ))}
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 text-gray-500 font-medium">Cliente</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Servicio</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Estilista</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Fecha/Hora</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Estado</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(appt => (
                  <tr key={appt.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">
                      <p className="font-medium">{appt.client_name}</p>
                      <p className="text-xs text-gray-400">{appt.client_phone}</p>
                    </td>
                    <td className="py-3">{appt.service_name}</td>
                    <td className="py-3">{appt.employee_name || 'Sin asignar'}</td>
                    <td className="py-3">
                      <p>{appt.start_time.slice(0, 10)}</p>
                      <p className="text-xs text-gray-400">{formatTime(appt.start_time)}</p>
                    </td>
                    <td className="py-3">
                      <span className={`badge ${getStatusColor(appt.status)}`}>{getStatusLabel(appt.status)}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1 flex-wrap">
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
                {filteredAppointments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">No hay citas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {tab === 'customers' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Clientes ({clients.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 text-gray-500 font-medium">Nombre</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Teléfono</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Última visita</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                          {client.client_name.charAt(0)}
                        </div>
                        <span className="font-medium">{client.client_name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-500">{client.client_email || '-'}</td>
                    <td className="py-3 text-gray-500">{client.client_phone || '-'}</td>
                    <td className="py-3 text-gray-500 text-xs">{client.start_time.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {tab === 'staff' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map(emp => {
            const empAppts = appointments.filter(a => a.employee_id === emp.id)
            const todayAppts = empAppts.filter(a => a.start_time.startsWith(new Date().toISOString().slice(0, 10)))
            return (
              <div key={emp.id} className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: emp.avatar_color }}
                  >
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{emp.name}</p>
                    <p className="text-sm text-gray-500">{emp.specialty}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary-600">{todayAppts.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Citas hoy</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-700">{empAppts.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Total citas</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Appointment Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nueva Cita</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Cliente *</label>
                <input className="input" placeholder="Nombre del cliente"
                  value={apptForm.client_name}
                  onChange={e => setApptForm(f => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" placeholder="555-0000"
                  value={apptForm.client_phone}
                  onChange={e => setApptForm(f => ({ ...f, client_phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="email@ejemplo.com"
                  value={apptForm.client_email}
                  onChange={e => setApptForm(f => ({ ...f, client_email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Servicio *</label>
                <select className="input"
                  value={apptForm.service_id}
                  onChange={e => setApptForm(f => ({ ...f, service_id: e.target.value }))}>
                  <option value="">Seleccionar servicio</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min - {formatCurrency(s.price)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Estilista</label>
                <select className="input"
                  value={apptForm.employee_id}
                  onChange={e => setApptForm(f => ({ ...f, employee_id: e.target.value }))}>
                  <option value="">Sin asignar</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Fecha y hora *</label>
                <input type="datetime-local" className="input"
                  value={apptForm.start_time}
                  onChange={e => setApptForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notas</label>
                <textarea className="input resize-none" rows={2}
                  value={apptForm.notes}
                  onChange={e => setApptForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCreateForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleCreateAppointment} className="btn-primary flex-1">Crear Cita</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
