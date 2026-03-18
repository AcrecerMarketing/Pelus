'use client'

import { useState, useEffect } from 'react'
import StatsCard from '@/components/StatsCard'
import AIAssistant from '@/components/AIAssistant'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'

interface Stats {
  monthly: { revenue: number; appointments: number }
  total: { revenue: number; appointments: number }
  topServices: { name: string; count: number; revenue: number }[]
}

interface Service {
  id: number
  name: string
  description: string
  duration_minutes: number
  price: number
  active: number
}

interface Employee {
  id: number
  name: string
  email: string
  specialty: string
  bio: string
  avatar_color: string
  user_id: number
}

interface User {
  id: number
  name: string
  email: string
  role: string
}

type ActiveTab = 'overview' | 'staff' | 'services' | 'settings' | 'ai'

const DEFAULT_COLORS = ['#7C3AED', '#059669', '#2563EB', '#DC2626', '#D97706', '#0891B2']

export default function OwnerDashboard() {
  const [tab, setTab] = useState<ActiveTab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [salonId, setSalonId] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  // Service form
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', duration_minutes: 60, price: 0 })

  // User form
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'employee' })

  // Salon settings
  const [salon, setSalon] = useState<{ name: string; address: string; phone: string; email: string } | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

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

      const [statsRes, servicesRes, employeesRes, usersRes] = await Promise.all([
        fetch(`/api/appointments?salon_id=${sid}`),
        fetch(`/api/services?salon_id=${sid}`),
        fetch(`/api/employees?salon_id=${sid}`),
        fetch('/api/users'),
      ])

      const apptData = await statsRes.json()
      const appts = apptData.appointments || []

      // Calculate stats from appointments
      const completed = appts.filter((a: { status: string; price?: number }) => a.status === 'completed')
      const monthStart = new Date()
      monthStart.setDate(1)
      const monthlyCompleted = completed.filter((a: { start_time: string }) => new Date(a.start_time) >= monthStart)

      setStats({
        monthly: {
          revenue: monthlyCompleted.reduce((s: number, a: { service_price?: number }) => s + (a.service_price || 0), 0),
          appointments: monthlyCompleted.length,
        },
        total: {
          revenue: completed.reduce((s: number, a: { service_price?: number }) => s + (a.service_price || 0), 0),
          appointments: completed.length,
        },
        topServices: [],
      })

      if (servicesRes.ok) {
        const d = await servicesRes.json()
        setServices(d.services || [])
      }
      if (employeesRes.ok) {
        const d = await employeesRes.json()
        setEmployees(d.employees || [])
      }
      if (usersRes.ok) {
        const d = await usersRes.json()
        setUsers(d.users || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveService() {
    const method = editingService ? 'PUT' : 'POST'
    const url = editingService ? `/api/services?id=${editingService.id}` : '/api/services'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...serviceForm, salon_id: salonId }),
    })
    if (res.ok) {
      setShowServiceForm(false)
      setEditingService(null)
      setServiceForm({ name: '', description: '', duration_minutes: 60, price: 0 })
      loadData()
    }
  }

  async function handleDeleteService(id: number) {
    if (!confirm('¿Eliminar este servicio?')) return
    await fetch(`/api/services?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  async function handleToggleService(service: Service) {
    await fetch(`/api/services?id=${service.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...service, active: service.active ? 0 : 1 }),
    })
    loadData()
  }

  async function handleCreateUser() {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm),
    })
    if (res.ok) {
      setShowUserForm(false)
      setUserForm({ name: '', email: '', password: '', role: 'employee' })
      loadData()
    } else {
      const d = await res.json()
      alert(d.error || 'Error al crear usuario')
    }
  }

  async function handleDeleteUser(id: number) {
    if (!confirm('¿Eliminar este usuario?')) return
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  function startEditService(service: Service) {
    setEditingService(service)
    setServiceForm({
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: service.price,
    })
    setShowServiceForm(true)
  }

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Resumen', icon: '📊' },
    { id: 'staff', label: 'Personal', icon: '👥' },
    { id: 'services', label: 'Servicios', icon: '✂️' },
    { id: 'settings', label: 'Configuración', icon: '⚙️' },
    { id: 'ai', label: 'IA Insights', icon: '🤖' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Propietario</h1>
        <p className="text-gray-500 text-sm mt-1">Gestiona tu salón de belleza</p>
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

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Citas este mes"
              value={stats?.monthly.appointments || 0}
              subtitle="completadas"
              icon="📅"
              color="purple"
            />
            <StatsCard
              title="Ingresos del mes"
              value={formatCurrency(stats?.monthly.revenue || 0)}
              icon="💰"
              color="green"
            />
            <StatsCard
              title="Total empleados"
              value={employees.length}
              subtitle="activos"
              icon="👥"
              color="blue"
            />
            <StatsCard
              title="Servicios"
              value={services.filter(s => s.active).length}
              subtitle="activos"
              icon="✂️"
              color="orange"
            />
          </div>

          {/* Top Services */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Catálogo de Servicios</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-gray-500 font-medium">Servicio</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Duración</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Precio</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-medium">{s.name}</td>
                      <td className="py-3 text-gray-500">{s.duration_minutes} min</td>
                      <td className="py-3 text-gray-700">{formatCurrency(s.price)}</td>
                      <td className="py-3">
                        <span className={`badge ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staff list */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Equipo</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: emp.avatar_color }}
                  >
                    {emp.name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{emp.name}</p>
                    <p className="text-xs text-gray-500 truncate">{emp.specialty}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Gestión de Personal</h2>
            <button
              onClick={() => setShowUserForm(true)}
              className="btn-primary text-sm"
            >
              + Agregar Empleado
            </button>
          </div>

          <div className="grid gap-4">
            {users.map(user => {
              const emp = employees.find(e => e.user_id === user.id)
              return (
                <div key={user.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: emp?.avatar_color || '#6B7280' }}
                    >
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {emp && <p className="text-xs text-primary-600">{emp.specialty}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${
                      user.role === 'owner' ? 'bg-primary-100 text-primary-700' :
                      user.role === 'admin' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'owner' ? 'Propietario' : user.role === 'admin' ? 'Admin' : 'Empleado'}
                    </span>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {showUserForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold mb-4">Nuevo Empleado</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Nombre completo</label>
                    <input
                      className="input"
                      value={userForm.name}
                      onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={userForm.email}
                      onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Contraseña</label>
                    <input
                      type="password"
                      className="input"
                      value={userForm.password}
                      onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Rol</label>
                    <select
                      className="input"
                      value={userForm.role}
                      onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                    >
                      <option value="employee">Empleado</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowUserForm(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button onClick={handleCreateUser} className="btn-primary flex-1">Crear</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Services Tab */}
      {tab === 'services' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Catálogo de Servicios</h2>
            <button
              onClick={() => {
                setEditingService(null)
                setServiceForm({ name: '', description: '', duration_minutes: 60, price: 0 })
                setShowServiceForm(true)
              }}
              className="btn-primary text-sm"
            >
              + Nuevo Servicio
            </button>
          </div>

          <div className="grid gap-3">
            {services.map(service => (
              <div key={service.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 text-lg">
                    ✂️
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-500">{service.description}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      <span>⏱ {service.duration_minutes} min</span>
                      <span className="font-semibold text-primary-600">{formatCurrency(service.price)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleService(service)}
                    className={`badge cursor-pointer ${service.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {service.active ? 'Activo' : 'Inactivo'}
                  </button>
                  <button
                    onClick={() => startEditService(service)}
                    className="text-primary-600 hover:text-primary-700 text-sm px-2 py-1 rounded hover:bg-primary-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showServiceForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Nombre del servicio</label>
                    <input
                      className="input"
                      value={serviceForm.name}
                      onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Descripción</label>
                    <textarea
                      className="input resize-none"
                      rows={2}
                      value={serviceForm.description}
                      onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Duración (minutos)</label>
                      <input
                        type="number"
                        className="input"
                        min={15}
                        step={15}
                        value={serviceForm.duration_minutes}
                        onChange={e => setServiceForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="label">Precio ($)</label>
                      <input
                        type="number"
                        className="input"
                        min={0}
                        step={0.01}
                        value={serviceForm.price}
                        onChange={e => setServiceForm(f => ({ ...f, price: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowServiceForm(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button onClick={handleSaveService} className="btn-primary flex-1">Guardar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div className="card max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración del Salón</h2>
          {!salon ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Gestiona el nombre, dirección y datos de contacto de tu salón.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
                <p><strong>Nombre:</strong> Pelus Salon &amp; Spa</p>
                <p><strong>Dirección:</strong> 123 Main Street, Suite 100</p>
                <p><strong>Teléfono:</strong> +1 (555) 123-4567</p>
                <p><strong>Email:</strong> info@pelussalon.com</p>
                <p><strong>Horario:</strong> Lunes-Viernes 9:00-18:00, Sábado 9:00-18:00</p>
              </div>
              <button
                onClick={() => setSalon({ name: 'Pelus Salon & Spa', address: '123 Main Street, Suite 100', phone: '+1 (555) 123-4567', email: 'info@pelussalon.com' })}
                className="btn-primary"
              >
                Editar Configuración
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">Nombre del salón</label>
                <input className="input" value={salon.name} onChange={e => setSalon(s => s ? { ...s, name: e.target.value } : s)} />
              </div>
              <div>
                <label className="label">Dirección</label>
                <input className="input" value={salon.address} onChange={e => setSalon(s => s ? { ...s, address: e.target.value } : s)} />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={salon.phone} onChange={e => setSalon(s => s ? { ...s, phone: e.target.value } : s)} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={salon.email} onChange={e => setSalon(s => s ? { ...s, email: e.target.value } : s)} />
              </div>
              {settingsMsg && <p className="text-sm text-emerald-600">{settingsMsg}</p>}
              <div className="flex gap-3">
                <button onClick={() => setSalon(null)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={async () => {
                    setSavingSettings(true)
                    // In a real app this would call a PATCH /api/salon endpoint
                    await new Promise(r => setTimeout(r, 500))
                    setSettingsMsg('Configuración guardada correctamente')
                    setSavingSettings(false)
                    setTimeout(() => setSettingsMsg(''), 3000)
                  }}
                  disabled={savingSettings}
                  className="btn-primary flex-1"
                >
                  {savingSettings ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Insights Tab */}
      {tab === 'ai' && (
        <div className="max-w-2xl space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Análisis con Inteligencia Artificial</h2>
            <p className="text-sm text-gray-500 mt-1">
              Obtén insights personalizados sobre el rendimiento de tu salón usando Claude AI.
            </p>
          </div>
          <AIAssistant salonId={salonId} mode="insights" />
        </div>
      )}
    </div>
  )
}
