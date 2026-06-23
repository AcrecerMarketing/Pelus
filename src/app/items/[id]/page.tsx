import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { dbQueries } from '@/lib/db'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { notFound } from 'next/navigation'
import CommentForm from '@/components/CommentForm'
import MarkExchangedButton from '@/components/MarkExchangedButton'

const CATEGORY_LABELS: Record<string, string> = {
  pantalon: 'Pantalón',
  pulso: 'Pulso/Buzo',
  remera: 'Remera',
}
const CATEGORY_ICONS: Record<string, string> = {
  pantalon: '👖',
  pulso: '🧥',
  remera: '👕',
}
const CATEGORY_COLORS: Record<string, string> = {
  pantalon: 'bg-blue-100 text-blue-700',
  pulso: 'bg-emerald-100 text-emerald-700',
  remera: 'bg-orange-100 text-orange-700',
}
const INTEREST_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  interesado: { icon: '⭐', label: 'Me interesa', color: 'text-green-700 bg-green-100' },
  no_interesado: { icon: '👎', label: 'No me interesa', color: 'text-gray-600 bg-gray-100' },
  comentario: { icon: '💬', label: 'Comentario', color: 'text-blue-700 bg-blue-100' },
}

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await verifyToken(token) : null

  const itemId = parseInt(params.id)
  if (isNaN(itemId)) notFound()

  const item = dbQueries.getItemById(itemId)
  if (!item) notFound()

  const comments = dbQueries.getCommentsByItem(itemId)
  const isOwner = session?.userId === item.user_id

  const formattedDate = new Date(item.created_at).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-blue-600 text-sm hover:underline flex items-center gap-1 mb-6"
        >
          ← Volver al inicio
        </Link>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2 bg-gray-100 flex items-center justify-center min-h-64 md:min-h-96">
              {item.image_data ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_data}
                  alt={item.title}
                  className="w-full h-full object-cover max-h-96"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <span className="text-8xl">{CATEGORY_ICONS[item.category]}</span>
                  <span className="text-sm">Sin foto</span>
                </div>
              )}
            </div>

            <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{item.title}</h1>
                {item.status === 'intercambiado' ? (
                  <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap shrink-0">
                    ✓ Intercambiado
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap shrink-0">
                    Disponible
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${CATEGORY_COLORS[item.category]}`}
                >
                  {CATEGORY_ICONS[item.category]} {CATEGORY_LABELS[item.category]}
                </span>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                  Talle {item.size}
                </span>
              </div>

              {item.description && (
                <p className="text-gray-600 mb-6 leading-relaxed text-sm">{item.description}</p>
              )}

              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <span className="font-semibold text-gray-700">Publicado por:</span>
                  <span>{item.owner_name}</span>
                </div>
                <div className="text-xs text-gray-400">{formattedDate}</div>

                <div className="flex gap-4 mt-3 text-sm">
                  {(item.interest_count || 0) > 0 && (
                    <span className="text-green-600 font-semibold">
                      ⭐ {item.interest_count} interesado
                      {(item.interest_count || 0) !== 1 ? 's' : ''}
                    </span>
                  )}
                  {(item.comment_count || 0) > 0 && (
                    <span className="text-gray-500">
                      💬 {item.comment_count} comentario
                      {(item.comment_count || 0) !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {isOwner && item.status === 'disponible' && (
                <div className="mt-5">
                  <MarkExchangedButton itemId={item.id} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-800 mb-5">
            Comentarios ({comments.length})
          </h2>

          {comments.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
              <div className="text-4xl mb-3">💬</div>
              <p>Todavía no hay comentarios. ¡Sé el primero en comentar!</p>
            </div>
          )}

          <div className="space-y-3">
            {comments.map((comment) => {
              const config = INTEREST_CONFIG[comment.interest_type]
              return (
                <div
                  key={comment.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${config.color}`}
                    >
                      {config.icon} {config.label}
                    </span>
                    <span className="font-semibold text-gray-800 text-sm">{comment.user_name}</span>
                    <span className="text-gray-400 text-xs ml-auto">
                      {new Date(comment.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                </div>
              )
            })}
          </div>

          {session && item.status === 'disponible' && !isOwner && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Dejá tu comentario</h3>
              <CommentForm itemId={item.id} />
            </div>
          )}

          {!session && (
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center">
              <p className="text-blue-800 font-semibold text-lg mb-2">
                ¿Te interesa esta prenda?
              </p>
              <p className="text-blue-600 text-sm mb-5">
                Iniciá sesión para dejar un comentario o mostrar que te interesa.
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/login"
                  className="bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="border border-blue-300 text-blue-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-100 transition"
                >
                  Registrarse
                </Link>
              </div>
            </div>
          )}

          {session && isOwner && item.status === 'disponible' && comments.length > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <p className="text-yellow-800 text-sm font-medium">
                💡 Cuando hayas coordinado el intercambio, marcá la prenda como intercambiada.
                Se notificará automáticamente a todos los interesados.
              </p>
            </div>
          )}

          {item.status === 'intercambiado' && (
            <div className="mt-6 bg-gray-100 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-gray-700 font-semibold">Este intercambio ya fue realizado.</p>
              <p className="text-gray-500 text-sm mt-1">
                Se notificó a todos los usuarios interesados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
