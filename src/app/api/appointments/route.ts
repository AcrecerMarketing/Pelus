import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dbQueries } from '@/lib/db'
import { addMinutes } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const salonId = Number(searchParams.get('salon_id'))
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const employeeId = searchParams.get('employee_id')

  if (!salonId) {
    return NextResponse.json({ error: 'salon_id requerido' }, { status: 400 })
  }

  if (startDate && endDate) {
    let appointments = dbQueries.getAppointmentsByDateRange(salonId, startDate, endDate)
    if (employeeId) {
      appointments = appointments.filter(a => a.employee_id === Number(employeeId))
    }
    return NextResponse.json({ appointments })
  }

  const appointments = dbQueries.getAppointments(salonId)
  return NextResponse.json({ appointments })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      salon_id,
      client_name,
      client_phone,
      client_email,
      service_id,
      employee_id,
      start_time,
      notes,
    } = body

    if (!salon_id || !client_name || !service_id || !start_time) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const service = dbQueries.getServiceById(service_id)
    if (!service) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    }

    const end_time = addMinutes(start_time, service.duration_minutes)

    const result = dbQueries.createAppointment({
      salon_id,
      client_name,
      client_phone: client_phone || '',
      client_email: client_email || '',
      service_id,
      employee_id: employee_id || null,
      start_time,
      end_time,
      status: 'pending',
      notes: notes || '',
    })

    return NextResponse.json({
      success: true,
      appointment: { id: result.lastInsertRowid },
    }, { status: 201 })
  } catch (error) {
    console.error('Create appointment error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { status, notes, employee_id } = body

    if (status) {
      dbQueries.updateAppointmentStatus(id, status)
    }

    if (notes !== undefined || employee_id !== undefined) {
      const updateData: Record<string, unknown> = {}
      if (notes !== undefined) updateData.notes = notes
      if (employee_id !== undefined) updateData.employee_id = employee_id
      dbQueries.updateAppointment(id, updateData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update appointment error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession(request)
  if (!session || (session.role !== 'owner' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  dbQueries.deleteAppointment(id)
  return NextResponse.json({ success: true })
}
