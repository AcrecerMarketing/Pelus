import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { dbQueries, Item, getSizeGroupLabel } from '@/lib/db'
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

const SIZE_GROUP_META = {
  inicial: { label: 'Inicial', sublabel: 'Talles 0, 2, 4', color: 'bg-violet-100 text-violet-700' },
  primaria: { label: 'Primaria', sublabel: 'Talles 6–14', color: 'bg-amber-100 text-amber-700' },
  liceo: { label: 'Liceo', sublabel: 'Talles 16, XS–XL', color: 'bg-teal-100 text-teal-700' },
}

const GENDER_META = {
  nina: { label: 'Niña', icon: '👧', color: 'bg-pink-100 text-pink-700' },
  nino: { label: 'Niño', icon: '👦', color: 'bg-sky-100 text-sky-700' },
  unisex: { label: 'Unisex', icon: '👤', color: 'bg-purple-100 text-purple-700' },
}

function getDaysLeft(expiresAt: string | undefined): number {
  if (!expiresAt) return 60
  const expiry = new Date(expiresAt.replace(' ', 'T') + 'Z')
  return Math.ceil((expiry.getTime() - Date.now()) / 86400000)
}

function ExpiryBadge({ item }: { item: Item }) {
  if (item.status === 'intercambiado') return null
  const days = getDaysLeft(item.expires_at)
  if (days <= 0)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold">
        Expirada
      </span>
    )
  const cls =
    days <= 3
      ? 'bg-red-50 text-red-600 border border-red-200'
      : days <= 14
        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        : 'bg-green-50 text-green-600 border border-green-200'
  const icon = days <= 3 ? '🔴' : days <= 14 ? '⚠️' : '✅'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${cls}`}>
      {icon} {days}d
    </span>
  )
}

function buildUrl(
  current: { category?: string; sizeGroup?: string; gender?: string },
  override: { category?: string; sizeGroup?: string; gender?: string }
) {
  const merged = { ...current, ...override }
  const p = new URLSearchParams()
  if (merged.category) p.set('category', merged.category)
  if (merged.sizeGroup) p.set('sizeGroup', merged.sizeGroup)
  if (merged.gender) p.set('gender', merged.gender)
  const s = p.toString()
  return s ? `/?${s}` : '/'
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string; sizeGroup?: string; gender?: string }
}) {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await verifyToken(token) : null

  const { category, sizeGroup, gender } = searchParams
  const currentFilters = { category, sizeGroup, gender }

  const items = dbQueries.getItems({
    category,
    sizeGroup,
    gender,
  })

  const categories = ['pantalon', 'pulso', 'remera']
  const sizeGroupKeys = ['inicial', 'primaria', 'liceo'] as const
  const genderKeys = ['nina', 'nino', 'unisex'] as const

  const pillBase =
    'px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition border'
  const pillActive = 'bg-green-800 text-white border-green-800 shadow-sm'
  const pillInactive = 'bg-white text-gray-600 border-gray-200 hover:border-green-300'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {!session && (
        <div className="bg-gradient-to-r from-green-900 to-green-700 text-white py-12 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-5xl mb-3">👕 👖 🧥</div>
            <h2 className="text-3xl font-bold mb-3">
              Intercambiá uniformes del Colegio Pablo Freire
            </h2>
            <p className="text-green-200 mb-8 max-w-xl mx-auto text-lg">
              Publicá las prendas que ya no usás y encontrá lo que necesitás.
              ¡Ahorrá y ayudá a otros alumnos!
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/register"
                className="bg-yellow-400 text-green-900 px-8 py-3 rounded-xl font-bold text-lg hover:bg-yellow-300 transition"
              >
                Registrarse gratis
              </Link>
              <Link
                href="/login"
                className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-green-800 transition"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8 space-y-3">
          {/* Category */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0">
              Tipo
            </span>
            <div className="flex gap-2 flex-wrap">
              <Link href={buildUrl(currentFilters, { category: undefined })} className={`${pillBase} ${!category ? pillActive : pillInactive}`}>
                Todas
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={buildUrl(currentFilters, { category: category === cat ? undefined : cat })}
                  className={`${pillBase} ${category === cat ? pillActive : pillInactive} flex items-center gap-1`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  {CATEGORY_LABELS[cat]}
                </Link>
              ))}
            </div>
          </div>

          {/* Size group */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0">
              Nivel
            </span>
            <div className="flex gap-2 flex-wrap">
              <Link href={buildUrl(currentFilters, { sizeGroup: undefined })} className={`${pillBase} ${!sizeGroup ? pillActive : pillInactive}`}>
                Todos
              </Link>
              {sizeGroupKeys.map((key) => {
                const meta = SIZE_GROUP_META[key]
                return (
                  <Link
                    key={key}
                    href={buildUrl(currentFilters, { sizeGroup: sizeGroup === key ? undefined : key })}
                    className={`${pillBase} ${sizeGroup === key ? pillActive : pillInactive}`}
                    title={meta.sublabel}
                  >
                    {meta.label}
                    <span className="ml-1.5 text-xs opacity-70">({meta.sublabel})</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Gender */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0">
              Para
            </span>
            <div className="flex gap-2 flex-wrap">
              <Link href={buildUrl(currentFilters, { gender: undefined })} className={`${pillBase} ${!gender ? pillActive : pillInactive}`}>
                Todos
              </Link>
              {genderKeys.map((key) => {
                const meta = GENDER_META[key]
                return (
                  <Link
                    key={key}
                    href={buildUrl(currentFilters, { gender: gender === key ? undefined : key })}
                    className={`${pillBase} ${gender === key ? pillActive : pillInactive} flex items-center gap-1`}
                  >
                    <span>{meta.icon}</span>
                    {meta.label === 'Niña' ? 'Niñas' : meta.label === 'Niño' ? 'Niños' : meta.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👔</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay prendas con esos filtros
            </h3>
            <p className="text-gray-500 mb-6">
              {session
                ? '¡Sé el primero en publicar una prenda!'
                : 'Registrate para publicar prendas.'}
            </p>
            {session && (
              <Link
                href="/items/new"
                className="inline-block bg-green-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-900 transition"
              >
                Publicar prenda
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item) => {
              const sizeGroup = getSizeGroupLabel(item.size)
              const genderMeta = item.gender && item.gender !== 'unisex' ? GENDER_META[item.gender] : null
              return (
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
                      {/* Size group badge (top-left) */}
                      {sizeGroup && item.status !== 'intercambiado' && (
                        <div className="absolute top-2 left-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${SIZE_GROUP_META[sizeGroup.key as keyof typeof SIZE_GROUP_META]?.color}`}>
                            {sizeGroup.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight group-hover:text-green-700 transition-colors line-clamp-2">
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

                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-semibold">
                          Talle {item.size}
                        </span>
                        {genderMeta && (
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${genderMeta.color}`}>
                            {genderMeta.icon} {genderMeta.label}
                          </span>
                        )}
                        <span className="truncate">por {item.owner_name}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 text-xs flex-wrap">
                        <ExpiryBadge item={item} />
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
