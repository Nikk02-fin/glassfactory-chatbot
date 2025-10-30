import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Glass Factory AI Assistant',
  description: 'Chat with our AI assistant to find the right factories for your production needs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-inter-tight">
        {children}
      </body>
    </html>
  )
}