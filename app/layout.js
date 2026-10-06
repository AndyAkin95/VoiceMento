import './globals.css'

export const metadata = {
  title: 'VoiceMento',
  description: 'Digital phone booth for weddings and events'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
