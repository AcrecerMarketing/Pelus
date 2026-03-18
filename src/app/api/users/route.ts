import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { dbQueries } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session || (session.role !== 'owner' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const users = dbQueries.getUsersBySalon(session.salonId)
  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const existingUser = dbQueries.getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está en uso' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const result = dbQueries.createUser({
      name,
      email,
      password_hash,
      role,
      salon_id: session.salonId,
    })

    return NextResponse.json({
      success: true,
      user: { id: result.lastInsertRowid },
    }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
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
    const { name, email, role } = body

    dbQueries.updateUser(id, { name, email, role })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update user error:', error)
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
  if (!id || id === session.userId) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
  }

  dbQueries.deleteUser(id)
  return NextResponse.json({ success: true })
}
