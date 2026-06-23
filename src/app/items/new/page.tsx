import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import NewItemForm from './NewItemForm'

export default async function NewItemPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await verifyToken(token) : null

  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Publicar prenda</h1>
        <p className="text-gray-500 text-sm mb-6">
          Completá los datos de la prenda que querés intercambiar.
        </p>
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <NewItemForm />
        </div>
      </div>
    </div>
  )
}
