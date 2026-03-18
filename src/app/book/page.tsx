import BookingWizard from '@/components/BookingWizard'

export default function BookPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">PS</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-none">Pelus Salon</h1>
              <p className="text-xs text-gray-400">& Spa</p>
            </div>
          </div>
          <a href="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Acceso Personal →
          </a>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-2">Reserva tu Cita</h2>
          <p className="text-primary-100 text-lg">Servicios de belleza profesionales a tu alcance</p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-primary-100">
            <span>📍 123 Main Street</span>
            <span>📞 +1 (555) 123-4567</span>
            <span>⏰ Lun-Sáb 9am-6pm</span>
          </div>
        </div>
      </div>

      {/* Booking Wizard */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <BookingWizard salonId={1} />
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { icon: '✅', title: 'Sin esperas', desc: 'Reserva en línea' },
            { icon: '🤖', title: 'Sugerencias IA', desc: 'Mejor horario para ti' },
            { icon: '💜', title: 'Profesionales', desc: 'Equipo experto' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-400 border-t border-gray-100 mt-4">
        <p>&copy; 2024 Pelus Salon &amp; Spa. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
