import './globals.css'

export const metadata = {
  title: 'Flashcards',
  description: 'Simple flashcard app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
