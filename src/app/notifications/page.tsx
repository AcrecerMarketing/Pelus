import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { dbQueries } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default async function NotificationsPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await verifyToken(token) : null

  if (!session) redirect('/login')

  const notifications = dbQueries.getNotificationsByUser(session.userId)
  // Mark all as read after loading
  dbQueries.markAllNotificationsRead(session.userId)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🔔 Notificaciones</h1>
          <Link href="/" className="text-blue-600 text-sm hover:underline">
            ← Volver
          </Link>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No tenés notificaciones todavía
            </h3>
            <p className="text-gray-500 text-sm">
              Cuando alguien marque un intercambio de una prenda que te interesó,
              recibirás una notificación aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl p-4 shadow-sm border transition ${
                  n.read === 0
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5 shrink-0">
                    {n.read === 0 ? '🔵' : '⚪'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-relaxed ${
                        n.read === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      {n.message}
                    </p>
                    {n.item_title && (
                      <p className="text-xs text-gray-500 mt-1">
                        Prenda:{' '}
                        <span className="font-medium">{n.item_title}</span>
                      </p>
                    )}
                    {n.item_id && (
                      <Link
                        href={`/items/${n.item_id}`}
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        Ver prenda →
                      </Link>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(n.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
