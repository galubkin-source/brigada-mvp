import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Brigados darbai',
  description: 'Testinė geležinkelio brigados darbų PWA',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#111827',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="lt"><body>{children}<script src="/register-sw.js" defer /></body></html>
}
