import { NextRequest, NextResponse } from 'next/server'
import { dbQueries } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const item = dbQueries.getItemById(id)
  if (!item) return NextResponse.json({ error: 'Prenda no encontrada' }, { status: 404 })

  return NextResponse.json(item)
}
