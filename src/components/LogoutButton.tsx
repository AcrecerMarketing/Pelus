'use client'

import { useRouter } from 'next/navigation'

export default function LogoutButton({ name }: { name: string }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-blue-300 hidden sm:block max-w-[120px] truncate">{name}</span>
      <button
        onClick={handleLogout}
        className="text-blue-300 hover:text-white text-sm underline"
      >
        Salir
      </button>
    </div>
  )
}
