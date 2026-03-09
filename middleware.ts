import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/tts(.*)',
  '/reader/(.*)',
])

// Check if the request is for a static asset
function isStaticAsset(req: Request): boolean {
  const url = new URL(req.url)
  const pathname = url.pathname
  
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Files with extensions (images, fonts, etc.)
  )
}

export default clerkMiddleware(async (auth, req) => {
  // Allow all public routes and static assets without protection
  if (isPublicRoute(req) || isStaticAsset(req)) {
    return NextResponse.next()
  }
  
  // Protect all other routes
  await auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}