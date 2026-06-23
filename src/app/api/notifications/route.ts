import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { dbQueries } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const notifications = dbQueries.getNotificationsByUser(session.userId)
  return NextResponse.json(notifications)
}
