import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dbQueries } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const salonId = Number(searchParams.get('salon_id'))
  const activeOnly = searchParams.get('active') === '1'

  if (!salonId) {
    return NextResponse.json({ error: 'salon_id requerido' }, { status: 400 })
  }

  const services = activeOnly
    ? dbQueries.getActiveServices(salonId)
    : dbQueries.getServices(salonId)

  return NextResponse.json({ services })
}

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session || (session.role !== 'owner' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description, duration_minutes, price } = body

    if (!name || !duration_minutes || price === undefined) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const result = dbQueries.createService({
      salon_id: session.salonId,
      name,
      description: description || '',
      duration_minutes: Number(duration_minutes),
      price: Number(price),
    })

    return NextResponse.json({
      success: true,
      service: { id: result.lastInsertRowid },
    }, { status: 201 })
  } catch (error) {
    console.error('Create service error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession(request)
  if (!session || (session.role !== 'owner' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { name, description, duration_minutes, price, active } = body

    dbQueries.updateService(id, {
      name,
      description: description || '',
      duration_minutes: Number(duration_minutes),
      price: Number(price),
      active: active !== undefined ? Number(active) : 1,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update service error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession(request)
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  dbQueries.deleteService(id)
  return NextResponse.json({ success: true })
}
