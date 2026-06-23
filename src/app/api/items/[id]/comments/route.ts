import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dbQueries } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const comments = dbQueries.getCommentsByItem(id)
  return NextResponse.json(comments)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const item = dbQueries.getItemById(id)
  if (!item) return NextResponse.json({ error: 'Prenda no encontrada' }, { status: 404 })
  if (item.status === 'intercambiado') {
    return NextResponse.json(
      { error: 'Esta prenda ya fue intercambiada, no se pueden agregar comentarios' },
      { status: 400 }
    )
  }

  try {
    const { content, interest_type } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'El comentario no puede estar vacío' }, { status: 400 })
    }

    const validTypes = ['interesado', 'no_interesado', 'comentario']
    const finalType = validTypes.includes(interest_type) ? interest_type : 'comentario'

    const result = dbQueries.createComment({
      item_id: id,
      user_id: session.userId,
      content: content.trim(),
      interest_type: finalType,
    })

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Error al crear el comentario' }, { status: 500 })
  }
}
