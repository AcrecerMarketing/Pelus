'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface SidebarProps {
  role: 'owner' | 'admin' | 'employee'
  name: string
  email: string
}

const navItems = {
  owner: [
    { href: '/dashboard/owner', label: 'Resumen', icon: '📊' },
    { href: '/dashboard/owner#staff', label: 'Personal', icon: '👥' },
    { href: '/dashboard/owner#services', label: 'Servicios', icon: '✂️' },
    { href: '/dashboard/owner#settings', label: 'Configuración', icon: '⚙️' },
    { href: '/dashboard/owner#ai', label: 'IA Insights', icon: '🤖' },
  ],
  admin: [
    { href: '/dashboard/admin', label: 'Calendario', icon: '📅' },
    { href: '/dashboard/admin#appointments', label: 'Citas', icon: '📋' },
    { href: '/dashboard/admin#customers', label: 'Clientes', icon: '👤' },
    { href: '/dashboard/admin#staff', label: 'Personal', icon: '👥' },
  ],
  employee: [
    { href: '/dashboard/employee', label: 'Mi Agenda', icon: '📅' },
    { href: '/dashboard/employee#appointments', label: 'Mis Citas', icon: '📋' },
    { href: '/dashboard/employee#schedule', label: 'Horario', icon: '🕐' },
  ],
}

const roleLabels = {
  owner: 'Propietario',
  admin: 'Administrador',
  employee: 'Empleado',
}

export default function Sidebar({ role, name, email }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const items = navItems[role] || []

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      setLoggingOut(false)
    }
  }

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 shadow-sm`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">PS</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Pelus Salon</p>
              <p className="text-xs text-gray-500">{roleLabels[role]}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {items.map(item => {
          const isActive = pathname === item.href.split('#')[0] && !item.href.includes('#')
            || (item.href === '/dashboard/owner' && pathname === '/dashboard/owner' && !item.href.includes('#'))
            || (item.href === '/dashboard/admin' && pathname === '/dashboard/admin' && !item.href.includes('#'))
            || (item.href === '/dashboard/employee' && pathname === '/dashboard/employee' && !item.href.includes('#'))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
                ${isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        <div className="pt-2 border-t border-gray-100 mt-2">
          <a
            href="/book"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <span className="text-base flex-shrink-0">🔗</span>
            {!collapsed && <span>Portal de Reservas</span>}
          </a>
        </div>
      </nav>

      {/* User info + logout */}
      <div className="p-3 border-t border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: role === 'owner' ? '#7C3AED' : role === 'admin' ? '#059669' : '#2563EB' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
        >
          <span className="text-base flex-shrink-0">🚪</span>
          {!collapsed && <span>{loggingOut ? 'Cerrando...' : 'Cerrar Sesión'}</span>}
        </button>
      </div>
    </aside>
  )
}
