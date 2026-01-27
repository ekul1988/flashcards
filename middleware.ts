import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('flashcards-auth')
  const isAuthenticated = authCookie?.value === 'valid-session'

  // Allow access to the login API route
  if (request.nextUrl.pathname === '/api/login') {
    return NextResponse.next()
  }

  // If not authenticated, redirect to login page
  if (!isAuthenticated && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If authenticated and trying to access login, redirect to home
  if (isAuthenticated && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
