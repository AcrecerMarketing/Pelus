import { NextRequest, NextResponse } from 'next/server'
import { dbQueries } from '@/lib/db'

interface SlotInfo {
  start: string
  display: string
}

function getHourFromSlot(slot: string): number {
  const timePart = slot.includes('T') ? slot.split('T')[1] : slot.split(' ')[1]
  return parseInt(timePart.split(':')[0])
}

function ruleBased(slots: SlotInfo[], service: { name: string; duration_minutes: number }): {
  recommendation: string
  explanation: string
  suggestedSlots: string[]
  insights: string[]
} {
  const morning = slots.filter(s => getHourFromSlot(s.start) < 12)
  const afternoon = slots.filter(s => getHourFromSlot(s.start) >= 12 && getHourFromSlot(s.start) < 16)
  const evening = slots.filter(s => getHourFromSlot(s.start) >= 16)

  let bestSlots: SlotInfo[] = []
  let recommendation = ''
  let explanation = ''

  if (morning.length > 0) {
    bestSlots = morning.slice(0, 3)
    recommendation = `Te recomendamos agendar ${service.name} en la mañana`
    explanation = 'Las citas matutinas suelen tener menor tiempo de espera y los estilistas están más frescos y energizados. Es el momento ideal para servicios que requieren atención al detalle.'
  } else if (afternoon.length > 0) {
    bestSlots = afternoon.slice(0, 3)
    recommendation = `Las tardes tempranas son perfectas para tu ${service.name}`
    explanation = 'El horario de tarde temprana ofrece un equilibrio ideal: el salón ya está en pleno funcionamiento y generalmente hay menos aglomeración que en el mediodía.'
  } else if (evening.length > 0) {
    bestSlots = evening.slice(0, 3)
    recommendation = `Horario vespertino disponible para ${service.name}`
    explanation = 'Las citas de tarde son convenientes después del trabajo. El ambiente suele ser más relajado al final del día.'
  }

  return {
    recommendation,
    explanation,
    suggestedSlots: bestSlots.map(s => s.display),
    insights: [
      `El servicio "${service.name}" tiene una duración de ${service.duration_minutes} minutos`,
      'Los martes y miércoles son los días menos concurridos',
      'Reservar con 24-48 horas de anticipación garantiza disponibilidad',
      `${slots.length} horarios disponibles para la fecha seleccionada`,
    ],
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const salonId = Number(searchParams.get('salon_id'))
  const serviceId = searchParams.get('service_id')
  const date = searchParams.get('date')

  if (!salonId) {
    return NextResponse.json({ error: 'salon_id requerido' }, { status: 400 })
  }

  const salon = dbQueries.getSalon(salonId)
  if (!salon) {
    return NextResponse.json({ error: 'Salón no encontrado' }, { status: 404 })
  }

  const stats = dbQueries.getRevenueStats(salonId)
  const employees = dbQueries.getEmployees(salonId)
  const services = dbQueries.getServices(salonId)

  let service = null
  let availableSlots: SlotInfo[] = []

  if (serviceId && date) {
    service = dbQueries.getServiceById(Number(serviceId))

    const startOfDay = `${date} 00:00`
    const endOfDay = `${date} 23:59`
    const existingAppointments = dbQueries.getAppointmentsByDateRange(salonId, startOfDay, endOfDay)

    // Generate simple slots for context
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    let openHour = 9
    let closeHour = 18

    if (salon.hours_json) {
      try {
        const hours = JSON.parse(salon.hours_json)
        const dayHours = hours[dayNames[dayOfWeek]]
        if (dayHours) {
          openHour = parseInt(dayHours.open.split(':')[0])
          closeHour = parseInt(dayHours.close.split(':')[0])
        }
      } catch { /* use defaults */ }
    }

    const duration = service?.duration_minutes || 60
    for (let h = openHour; h < closeHour; h++) {
      for (const m of [0, 30]) {
        const start = `${date} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        const endH = h + Math.floor((m + duration) / 60)
        const endM = (m + duration) % 60
        if (endH > closeHour || (endH === closeHour && endM > 0)) continue

        const slotDate = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
        const now = new Date()
        if (slotDate <= now) continue

        const isAvailable = !existingAppointments.some(appt => {
          const apptStart = new Date(appt.start_time.replace(' ', 'T'))
          const apptEnd = new Date(appt.end_time.replace(' ', 'T'))
          const sStart = slotDate
          const sEnd = new Date(sStart.getTime() + duration * 60000)
          return sStart < apptEnd && sEnd > apptStart
        })

        if (isAvailable) {
          availableSlots.push({
            start,
            display: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          })
        }
      }
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || ''
  const isPlaceholder = !apiKey || apiKey === 'placeholder_key' || apiKey.startsWith('placeholder')

  if (isPlaceholder) {
    // Rule-based fallback
    if (service && availableSlots.length > 0) {
      const result = ruleBased(availableSlots, service)
      return NextResponse.json(result)
    }

    // General insights fallback
    return NextResponse.json({
      recommendation: `${salon.name} - Análisis de Negocio`,
      explanation: `Tu salón tiene ${employees.length} empleados activos y ${services.length} servicios en catálogo. Los datos muestran que el salón opera de lunes a sábado con horario de 9am a 6pm.`,
      suggestedSlots: [],
      insights: [
        `Total de citas completadas: ${stats.total.appointments}`,
        `Ingresos totales: $${stats.total.revenue.toFixed(2)}`,
        `Servicios populares: ${stats.topServices.slice(0, 2).map(s => s.name).join(', ') || 'N/A'}`,
        'Los martes y miércoles tienen menor demanda: ideales para promociones',
        'Los viernes son los días más concurridos, considera ampliar horario',
        'Agregar servicios complementarios puede aumentar el ticket promedio en 30%',
      ],
    })
  }

  // Call Claude API
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey })

    const context = service
      ? `
Salón: ${salon.name}
Servicio solicitado: ${service.name} (${service.duration_minutes} minutos, $${service.price})
Fecha: ${date}
Horarios disponibles: ${availableSlots.map(s => s.display).join(', ')}
Empleados disponibles: ${employees.length}
Total citas del mes: ${stats.monthly.appointments}
`
      : `
Salón: ${salon.name}
Empleados: ${employees.length}
Servicios: ${services.map(s => s.name).join(', ')}
Ingresos del mes: $${stats.monthly.revenue.toFixed(2)}
Citas del mes: ${stats.monthly.appointments}
Servicios más populares: ${stats.topServices.map(s => `${s.name} (${s.count} citas)`).join(', ')}
`

    const prompt = service
      ? `Eres un asistente experto en gestión de salones de belleza. Analiza los horarios disponibles y recomienda los mejores para el cliente.

${context}

Responde en JSON con exactamente este formato:
{
  "recommendation": "texto de recomendación principal (1 oración)",
  "explanation": "explicación detallada del porqué de la recomendación (2-3 oraciones)",
  "suggestedSlots": ["HH:MM", "HH:MM", "HH:MM"],
  "insights": ["insight 1", "insight 2", "insight 3"]
}

Los suggestedSlots deben ser exactamente de los horarios disponibles listados.`
      : `Eres un consultor experto en salones de belleza. Analiza los datos del negocio y proporciona insights valiosos.

${context}

Responde en JSON con exactamente este formato:
{
  "recommendation": "recomendación principal para el negocio (1 oración)",
  "explanation": "análisis detallado del estado actual del negocio (2-3 oraciones)",
  "suggestedSlots": [],
  "insights": ["insight accionable 1", "insight accionable 2", "insight accionable 3", "insight accionable 4"]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('AI suggestion error:', error)

    // Fallback to rule-based
    if (service && availableSlots.length > 0) {
      return NextResponse.json(ruleBased(availableSlots, service))
    }

    return NextResponse.json({
      recommendation: 'Análisis de negocio disponible',
      explanation: `${salon.name} tiene ${employees.length} empleados y ${services.length} servicios activos.`,
      suggestedSlots: [],
      insights: [
        `Ingresos totales: $${stats.total.revenue.toFixed(2)}`,
        `Citas completadas: ${stats.total.appointments}`,
        'Considera expandir el horario los viernes para capturar más demanda',
        'Los servicios de coloración generan mayor valor por cita',
      ],
    })
  }
}
