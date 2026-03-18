export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const date = new Date(timeStr.includes('T') ? timeStr : timeStr.replace(' ', 'T'))
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'))
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'))
  return date.toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
  })
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return days[dayOfWeek] || ''
}

export function addMinutes(dateStr: string, minutes: number): string {
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'))
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString().slice(0, 16).replace('T', ' ')
}

export function generateTimeSlots(startHour: number, endHour: number, intervalMinutes: number, date: string): string[] {
  const slots: string[] = []
  const current = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00`)
  const end = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00`)

  while (current < end) {
    slots.push(current.toISOString().slice(0, 16).replace('T', ' '))
    current.setMinutes(current.getMinutes() + intervalMinutes)
  }

  return slots
}

export function isSlotAvailable(
  slotStart: string,
  durationMinutes: number,
  existingAppointments: { start_time: string; end_time: string }[]
): boolean {
  const slotStartDate = new Date(slotStart.includes('T') ? slotStart : slotStart.replace(' ', 'T'))
  const slotEndDate = new Date(slotStartDate.getTime() + durationMinutes * 60000)

  for (const appt of existingAppointments) {
    const apptStart = new Date(appt.start_time.includes('T') ? appt.start_time : appt.start_time.replace(' ', 'T'))
    const apptEnd = new Date(appt.end_time.includes('T') ? appt.end_time : appt.end_time.replace(' ', 'T'))

    if (slotStartDate < apptEnd && slotEndDate > apptStart) {
      return false
    }
  }

  return true
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800'
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'completed': return 'bg-blue-100 text-blue-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed': return 'Confirmado'
    case 'pending': return 'Pendiente'
    case 'completed': return 'Completado'
    case 'cancelled': return 'Cancelado'
    default: return status
  }
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
