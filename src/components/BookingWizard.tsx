'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import AIAssistant from './AIAssistant'

interface Service {
  id: number
  name: string
  description: string
  duration_minutes: number
  price: number
}

interface Employee {
  id: number
  name: string
  specialty: string
  bio: string
  avatar_color: string
}

interface TimeSlot {
  start: string
  end: string
  display: string
}

interface BookingWizardProps {
  salonId: number
}

const STEPS = ['Servicio', 'Estilista & Fecha', 'Horario', 'Confirmación']

export default function BookingWizard({ salonId }: BookingWizardProps) {
  const [step, setStep] = useState(0)
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)
  const [bookingRef, setBookingRef] = useState('')
  const [error, setError] = useState('')

  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fetch(`/api/services?salon_id=${salonId}&active=1`)
      .then(r => r.json())
      .then(d => setServices(d.services || []))
  }, [salonId])

  useEffect(() => {
    fetch(`/api/employees?salon_id=${salonId}`)
      .then(r => r.json())
      .then(d => setEmployees(d.employees || []))
  }, [salonId])

  useEffect(() => {
    if (selectedDate && selectedService) {
      loadSlots()
    }
  }, [selectedDate, selectedService, selectedEmployee])

  async function loadSlots() {
    if (!selectedDate || !selectedService) return
    setLoadingSlots(true)
    setSlots([])
    try {
      const params = new URLSearchParams({
        salon_id: String(salonId),
        date: selectedDate,
        service_id: String(selectedService.id),
        ...(selectedEmployee ? { employee_id: String(selectedEmployee.id) } : {}),
      })
      const res = await fetch(`/api/slots?${params}`)
      const data = await res.json()
      setSlots(data.slots || [])
    } finally {
      setLoadingSlots(false)
    }
  }

  async function handleBook() {
    if (!selectedService || !selectedSlot || !form.name) return
    setBooking(true)
    setError('')
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salon_id: salonId,
          client_name: form.name,
          client_phone: form.phone,
          client_email: form.email,
          service_id: selectedService.id,
          employee_id: selectedEmployee?.id || null,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          notes: form.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reservar')
      setBookingRef(`#${data.appointment.id}`)
      setBooked(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al confirmar la cita')
    } finally {
      setBooking(false)
    }
  }

  function handleAISlot(slot: string) {
    const found = slots.find(s => s.display === slot || s.start.includes(slot))
    if (found) {
      setSelectedSlot(found)
      setStep(2)
    }
  }

  if (booked) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cita Reservada!</h2>
        <p className="text-gray-600 mb-1">Tu cita ha sido confirmada con el número de referencia:</p>
        <p className="text-2xl font-bold text-primary-600 mb-6">{bookingRef}</p>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 text-left max-w-sm mx-auto mb-6 space-y-2">
          <div className="flex justify-between"><span>Servicio:</span><span className="font-medium">{selectedService?.name}</span></div>
          <div className="flex justify-between"><span>Fecha:</span><span className="font-medium">{selectedDate}</span></div>
          <div className="flex justify-between"><span>Horario:</span><span className="font-medium">{selectedSlot?.display}</span></div>
          {selectedEmployee && <div className="flex justify-between"><span>Estilista:</span><span className="font-medium">{selectedEmployee.name}</span></div>}
        </div>
        <p className="text-sm text-gray-500 mb-4">Recibirás una confirmación si proporcionaste tu email.</p>
        <button
          onClick={() => {
            setBooked(false)
            setStep(0)
            setSelectedService(null)
            setSelectedEmployee(null)
            setSelectedDate('')
            setSelectedSlot(null)
            setForm({ name: '', phone: '', email: '', notes: '' })
          }}
          className="btn-primary"
        >
          Hacer otra reserva
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8 px-4">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-12 ${i < step ? 'bg-emerald-400' : 'bg-gray-200'}`}></div>
            )}
          </div>
        ))}
      </div>
      <div className="text-center mb-6">
        <p className="text-sm text-gray-500">Paso {step + 1} de {STEPS.length}: <span className="font-medium text-gray-700">{STEPS[step]}</span></p>
      </div>

      {/* Step 0: Select Service */}
      {step === 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Selecciona un Servicio</h2>
          <div className="grid gap-3">
            {services.map(service => (
              <button
                key={service.id}
                onClick={() => { setSelectedService(service); setStep(1) }}
                className={`text-left p-4 rounded-xl border-2 transition-all ${selectedService?.id === service.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{service.description}</p>
                    <p className="text-xs text-gray-400 mt-1">⏱ {service.duration_minutes} minutos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">{formatCurrency(service.price)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Select Stylist & Date */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Estilista y Fecha</h2>

          <div className="mb-5">
            <p className="label">Estilista (opcional)</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedEmployee(null)}
                className={`p-3 rounded-xl border-2 text-sm transition-all ${!selectedEmployee
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300'}`}
              >
                <div className="font-medium">Cualquier estilista</div>
                <div className="text-xs text-gray-500">Auto-asignado</div>
              </button>
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`p-3 rounded-xl border-2 text-sm transition-all text-left ${selectedEmployee?.id === emp.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: emp.avatar_color }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.specialty}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="label">Fecha de la cita</label>
            <input
              type="date"
              className="input"
              min={today}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>

          {selectedDate && selectedService && (
            <AIAssistant
              salonId={salonId}
              mode="booking"
              serviceId={selectedService.id}
              date={selectedDate}
              onSlotSelect={handleAISlot}
            />
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(0)} className="btn-secondary flex-1">Anterior</button>
            <button
              onClick={() => setStep(2)}
              disabled={!selectedDate}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Time Slot */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Selecciona un Horario</h2>
          <p className="text-sm text-gray-500 mb-4">
            {selectedDate} • {selectedService?.name} ({selectedService?.duration_minutes} min)
          </p>

          {loadingSlots && (
            <div className="text-center py-8 text-gray-500">Cargando horarios disponibles...</div>
          )}

          {!loadingSlots && slots.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay horarios disponibles para este día.</p>
              <button onClick={() => setStep(1)} className="text-primary-600 text-sm underline mt-2">Cambiar fecha</button>
            </div>
          )}

          {!loadingSlots && slots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
              {slots.map((slot, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${selectedSlot?.start === slot.start
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-primary-300 text-gray-700'}`}
                >
                  {slot.display}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">Anterior</button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedSlot}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Contact Info & Confirm */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tus Datos</h2>

          {/* Summary */}
          <div className="bg-primary-50 rounded-xl p-4 mb-5 text-sm space-y-1.5">
            <p className="font-semibold text-gray-800 mb-2">Resumen de tu cita:</p>
            <div className="flex justify-between text-gray-700">
              <span>Servicio:</span><span className="font-medium">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Fecha:</span><span className="font-medium">{selectedDate}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Horario:</span><span className="font-medium">{selectedSlot?.display}</span>
            </div>
            {selectedEmployee && (
              <div className="flex justify-between text-gray-700">
                <span>Estilista:</span><span className="font-medium">{selectedEmployee.name}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700 font-semibold pt-1 border-t border-primary-200">
              <span>Total:</span><span className="text-primary-600">{formatCurrency(selectedService?.price || 0)}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label">Nombre completo *</label>
              <input
                type="text"
                className="input"
                placeholder="Tu nombre"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                type="tel"
                className="input"
                placeholder="+1 555 000 0000"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Email (para confirmación)</label>
              <input
                type="email"
                className="input"
                placeholder="tu@correo.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Notas adicionales</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Alergias, preferencias, primera visita..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1">Anterior</button>
            <button
              onClick={handleBook}
              disabled={!form.name || booking}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {booking ? 'Confirmando...' : 'Confirmar Cita'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
