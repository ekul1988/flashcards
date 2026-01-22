import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()

  if (password === process.env.SITE_PASSWORD) {
    const response = NextResponse.json({ success: true })
    response.cookies.set('flashcards-auth', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    return response
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
}
