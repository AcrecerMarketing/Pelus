import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pelus Salon & Spa',
  description: 'Sistema de gestión para salón de belleza',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
