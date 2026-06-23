import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dbQueries } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || undefined
  const items = dbQueries.getItems(category ? { category } : undefined)
  return NextResponse.json(items)
}

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { title, category, size, description, image_data } = await request.json()

    if (!title?.trim() || !category || !size) {
      return NextResponse.json(
        { error: 'Título, categoría y talle son requeridos' },
        { status: 400 }
      )
    }

    if (!['pantalon', 'pulso', 'remera'].includes(category)) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
    }

    const result = dbQueries.createItem({
      user_id: session.userId,
      title: title.trim(),
      category,
      size,
      description: description?.trim() || '',
      image_data: image_data || null,
    })

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (error) {
    console.error('Create item error:', error)
    return NextResponse.json({ error: 'Error al crear la prenda' }, { status: 500 })
  }
}
