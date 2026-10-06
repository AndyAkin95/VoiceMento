import './globals.css'

export const metadata = {
  title: 'VoiceMento',
  description: 'Digital phone booth for weddings and events',
  themeColor: '#1f1c1a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VoiceMento'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="./manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="./icon-192.png?v=4" />
        <link rel="icon" type="image/png" sizes="512x512" href="./icon-512.png?v=4" />
        <link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png?v=4" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VoiceMento" />
      </head>
      <body>{children}</body>
    </html>
  )
}
