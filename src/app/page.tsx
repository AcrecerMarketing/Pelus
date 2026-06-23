import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { dbQueries } from '@/lib/db'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await verifyToken(token) : null

  const category = searchParams.category
  const items = dbQueries.getItems(category ? { category } : undefined)
  const categories = ['pantalon', 'pulso', 'remera']

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {!session && (
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white py-12 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-5xl mb-3">👕 👖 🧥</div>
            <h2 className="text-3xl font-bold mb-3">
              Intercambiá uniformes del Colegio Pablo Freire
            </h2>
            <p className="text-blue-200 mb-8 max-w-xl mx-auto text-lg">
              Publicá las prendas que ya no usás y encontrá lo que necesitás.
              ¡Ahorrá y ayudá a otros alumnos!
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/register"
                className="bg-yellow-400 text-blue-900 px-8 py-3 rounded-xl font-bold text-lg hover:bg-yellow-300 transition"
              >
                Registrarse gratis
              </Link>
              <Link
                href="/login"
                className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-blue-700 transition"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <Link
            href="/"
            className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition ${
              !category
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
          >
            Todas las prendas
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/?category=${cat}`}
              className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition flex items-center gap-1.5 ${
                category === cat
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
              }`}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              {CATEGORY_LABELS[cat]}s
            </Link>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👔</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay prendas publicadas todavía
            </h3>
            <p className="text-gray-500 mb-6">
              {session
                ? '¡Sé el primero en publicar una prenda!'
                : 'Registrate para publicar prendas.'}
            </p>
            {session && (
              <Link
                href="/items/new"
                className="inline-block bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition"
              >
                Publicar prenda
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item) => (
              <Link key={item.id} href={`/items/${item.id}`} className="group block">
                <div
                  className={`bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all border border-gray-100 ${
                    item.status === 'intercambiado' ? 'opacity-65' : ''
                  }`}
                >
                  <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                    {item.image_data ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_data}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-7xl">{CATEGORY_ICONS[item.category]}</span>
                    )}
                    {item.status === 'intercambiado' && (
                      <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                        <span className="bg-white text-gray-800 px-3 py-1.5 rounded-full text-sm font-bold">
                          ✓ Intercambiado
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-800 text-sm leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${
                          CATEGORY_COLORS[item.category]
                        }`}
                      >
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-semibold">
                        Talle {item.size}
                      </span>
                      <span className="truncate">por {item.owner_name}</span>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-gray-100 text-xs">
                      {(item.interest_count || 0) > 0 ? (
                        <span className="flex items-center gap-1 text-green-600 font-semibold">
                          ⭐ {item.interest_count}{' '}
                          interesado{(item.interest_count || 0) !== 1 ? 's' : ''}
                        </span>
                      ) : null}
                      {(item.comment_count || 0) > 0 ? (
                        <span className="flex items-center gap-1 text-gray-400">
                          💬 {item.comment_count}
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin comentarios</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
