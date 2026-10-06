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
        <link rel="icon" href="./icon.svg" />
        <link rel="apple-touch-icon" href="./icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="VoiceMento" />
      </head>
      <body>{children}</body>
    </html>
  )
}
