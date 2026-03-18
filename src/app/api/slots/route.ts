import { NextRequest, NextResponse } from 'next/server'
import { dbQueries } from '@/lib/db'
import { isSlotAvailable } from '@/lib/utils'

interface TimeSlot {
  start: string
  end: string
  display: string
}

function formatDisplayTime(dateStr: string): string {
  const d = new Date(dateStr.replace(' ', 'T'))
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function addMinutesToStr(dateStr: string, minutes: number): string {
  const d = new Date(dateStr.replace(' ', 'T'))
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const salonId = Number(searchParams.get('salon_id'))
  const date = searchParams.get('date')
  const serviceId = Number(searchParams.get('service_id'))
  const employeeId = searchParams.get('employee_id')

  if (!salonId || !date || !serviceId) {
    return NextResponse.json({ error: 'salon_id, date, service_id requeridos' }, { status: 400 })
  }

  const service = dbQueries.getServiceById(serviceId)
  if (!service) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
  }

  const salon = dbQueries.getSalon(salonId)
  if (!salon) {
    return NextResponse.json({ error: 'Salón no encontrado' }, { status: 404 })
  }

  // Determine working hours for the day
  const dateObj = new Date(date)
  const dayOfWeek = dateObj.getDay() // 0=Sunday, 1=Monday, etc.

  let openHour = 9
  let closeHour = 18

  // Parse salon hours if available
  if (salon.hours_json) {
    try {
      const hours = JSON.parse(salon.hours_json)
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayName = dayNames[dayOfWeek]
      const dayHours = hours[dayName]
      if (!dayHours) {
        return NextResponse.json({ slots: [], message: 'Salón cerrado este día' })
      }
      openHour = parseInt(dayHours.open.split(':')[0])
      closeHour = parseInt(dayHours.close.split(':')[0])
    } catch {
      // Use defaults
    }
  }

  // Get existing appointments for this day
  const startOfDay = `${date} 00:00`
  const endOfDay = `${date} 23:59`
  let existingAppointments = dbQueries.getAppointmentsByDateRange(salonId, startOfDay, endOfDay)

  // Filter by employee if specified
  if (employeeId) {
    existingAppointments = existingAppointments.filter(a => a.employee_id === Number(employeeId))
  }

  // Check if day is in the past
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (dateObj < today) {
    return NextResponse.json({ slots: [] })
  }

  // Generate slots every 30 minutes
  const slots: TimeSlot[] = []
  const slotIntervalMinutes = 30
  let currentHour = openHour
  let currentMinute = 0

  while (true) {
    const startStr = `${date} ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
    const endStr = addMinutesToStr(startStr, service.duration_minutes)

    // Check if end time exceeds closing time
    const endHour = parseInt(endStr.split(' ')[1].split(':')[0])
    const endMin = parseInt(endStr.split(' ')[1].split(':')[1])
    if (endHour > closeHour || (endHour === closeHour && endMin > 0)) break

    // Skip past slots if today
    const slotDate = new Date(`${date}T${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`)
    const now = new Date()
    if (slotDate > now) {
      if (isSlotAvailable(startStr, service.duration_minutes, existingAppointments)) {
        slots.push({
          start: startStr,
          end: endStr,
          display: formatDisplayTime(startStr),
        })
      }
    }

    currentMinute += slotIntervalMinutes
    if (currentMinute >= 60) {
      currentMinute -= 60
      currentHour++
    }
    if (currentHour >= closeHour) break
  }

  return NextResponse.json({ slots })
}
