import type { Metadata } from 'next'
import './globals.css'
import BootstrapClient from '@/components/BootstrapClient'

export const metadata: Metadata = {
  title: 'PAXAFE Device Dashboard',
  description: 'Real-time monitoring dashboard for Tive IoT devices',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <BootstrapClient />
      </body>
    </html>
  )
}
