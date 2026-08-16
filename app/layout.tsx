import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/ui/navbar'
import { MobileTabBar } from '@/components/ui/mobile-tab-bar'
import { AuthProvider } from '@/components/ui/auth-context'
import { DeepLinkHandler } from '@/components/ui/deep-link-handler'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Nachas — Turn Your Growth Into Charity',
  description: 'Take on spiritual challenges. Get sponsored per day you complete. Raise money for charity.',
  manifest: '/manifest.json',
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Nachas' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a1628',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-nachas-dark text-white min-h-screen`}>
        <AuthProvider>
          <DeepLinkHandler />
          <Navbar />
          <main>{children}</main>
          <MobileTabBar />
        </AuthProvider>
      </body>
    </html>
  )
}
