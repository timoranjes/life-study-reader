import type { Metadata, Viewport } from 'next'
import { Noto_Serif_SC, Noto_Sans_SC } from 'next/font/google'
import { Merriweather, Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/hooks/use-language'
import { ReaderSettingsProvider } from '@/hooks/use-reader-settings'
import './globals.css'

// Chinese fonts
const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-noto-serif-sc',
})

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-sc',
})

// Note: KaiTi uses system fonts only (KaiTi, STKaiti) - no Google font needed

// English fonts
const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-merriweather',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: '生命讀經',
  description: 'Life-Study of the Bible - A serene reading experience for Chinese Bible study',
  openGraph: {
    title: '生命讀經',
    description: 'Life-Study of the Bible - A serene reading experience for Chinese Bible study',
    type: 'website',
    locale: 'zh_TW',
  },
  twitter: {
    card: 'summary',
    title: '生命讀經',
    description: 'Life-Study of the Bible - A serene reading experience for Chinese Bible study',
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f0e8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={`${notoSerifSC.variable} ${notoSansSC.variable} ${merriweather.variable} ${inter.variable} ${jetbrainsMono.variable} font-serif antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <ReaderSettingsProvider>
              {children}
            </ReaderSettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
