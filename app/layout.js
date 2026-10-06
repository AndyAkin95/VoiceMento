import './globals.css'

export const metadata = {
  title: 'VoiceMento',
  description: 'Digital phone booth for weddings and events',
  themeColor: '#0b0d0c',
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
        <link rel="manifest" href="./manifest.json?v=5" />
        <link rel="icon" type="image/png" href="./apple-touch-icon.png?v=5" />
        <link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png?v=5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VoiceMento" />
      </head>
      <body>{children}</body>
    </html>
  )
}
