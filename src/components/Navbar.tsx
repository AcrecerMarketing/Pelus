import Link from 'next/link'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { dbQueries } from '@/lib/db'
import LogoutButton from './LogoutButton'

export default async function Navbar() {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await verifyToken(token) : null
  const unreadCount = session ? dbQueries.getUnreadCount(session.userId) : 0

  return (
    <nav className="bg-blue-800 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="text-2xl">👕</span>
          <div>
            <div className="font-bold text-base leading-tight">Intercambio de Uniformes</div>
            <div className="text-blue-300 text-xs">Colegio Pablo Freire</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link
                href="/items/new"
                className="bg-yellow-400 text-blue-900 px-4 py-2 rounded-xl font-bold text-sm hover:bg-yellow-300 transition hidden sm:block"
              >
                + Publicar
              </Link>
              <Link href="/notifications" className="relative p-1">
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <LogoutButton name={session.name} />
            </>
          ) : (
            <>
              <Link href="/login" className="text-blue-200 hover:text-white text-sm">
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="bg-white text-blue-800 px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-50 transition"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
