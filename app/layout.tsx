import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display, Cormorant_Garamond } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-dm-serif' })
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-cormorant',
})

export const metadata: Metadata = {
  title: 'StreamWedding - Find Your Perfect Wedding Vendors',
  description: 'Discover and connect with NSW wedding vendors. Match with venues, photographers, caterers and more based on your preferences.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && systemDark)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${dmSerif.variable} ${cormorant.variable} font-sans bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors`}>{children}</body>
    </html>
  )
}
