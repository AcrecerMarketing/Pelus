import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dbQueries } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const salonId = Number(searchParams.get('salon_id'))

  if (!salonId) {
    return NextResponse.json({ error: 'salon_id requerido' }, { status: 400 })
  }

  const employees = dbQueries.getEmployees(salonId)
  return NextResponse.json({ employees })
}

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { user_id, specialty, bio, avatar_color } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })
    }

    const result = dbQueries.createEmployee({
      user_id: Number(user_id),
      salon_id: session.salonId,
      specialty: specialty || '',
      bio: bio || '',
      avatar_color: avatar_color || '#7C3AED',
    })

    return NextResponse.json({
      success: true,
      employee: { id: result.lastInsertRowid },
    }, { status: 201 })
  } catch (error) {
    console.error('Create employee error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession(request)
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { specialty, bio, avatar_color } = body

    dbQueries.updateEmployee(id, {
      specialty: specialty || '',
      bio: bio || '',
      avatar_color: avatar_color || '#7C3AED',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update employee error:', error)
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

  dbQueries.deleteEmployee(id)
  return NextResponse.json({ success: true })
}
