import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export default async function Home() {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value

  if (token) {
    const payload = await verifyToken(token)
    if (payload) {
      if (payload.role === 'owner') redirect('/dashboard/owner')
      if (payload.role === 'admin') redirect('/dashboard/admin')
      if (payload.role === 'employee') redirect('/dashboard/employee')
    }
  }

  redirect('/login')
}
