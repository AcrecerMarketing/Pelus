import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dbQueries } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const item = dbQueries.getItemById(id)
  if (!item) return NextResponse.json({ error: 'Prenda no encontrada' }, { status: 404 })
  if (item.user_id !== session.userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (item.status === 'intercambiado') {
    return NextResponse.json({ error: 'La prenda ya fue marcada como intercambiada' }, { status: 400 })
  }

  dbQueries.markItemAsExchanged(id)

  // Notify all interested users
  const interestedUsers = dbQueries.getInterestedUsers(id)
  for (const user of interestedUsers) {
    if (user.id !== session.userId) {
      dbQueries.createNotification({
        user_id: user.id,
        item_id: id,
        message: `La prenda "${item.title}" que te interesaba ya fue intercambiada y no está más disponible.`,
      })
    }
  }

  return NextResponse.json({ success: true })
}
