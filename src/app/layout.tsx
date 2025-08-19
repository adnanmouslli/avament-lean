import type { Metadata } from 'next'
import { Inter, Cairo } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { QueryProvider } from '@/components/query-provider'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const cairo = Cairo({ 
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AVAMENT - إدارة المشاريع',
  description: 'منصة إدارة المشاريع باستخدام منهجية LEAN',
  keywords: 'إدارة مشاريع, LEAN, منهجية أجايل',
  authors: [{ name: 'فريق AVAMENT' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable} font-sans antialiased`}>
        {/* 🌙 ThemeProvider: يدير الوضع المظلم/الفاتح */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 🔄 QueryProvider: يدير البيانات والـ API calls */}
          <QueryProvider>
            <div className="min-h-screen bg-background">
              {children}
            </div>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}