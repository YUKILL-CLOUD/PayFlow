import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Refreshes the Supabase session inside Next.js middleware.
 * This ensures the session cookie stays valid across Server Component renders.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do NOT remove this line
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname, searchParams } = request.nextUrl

  // 1. If any link lands with a Supabase auth ?code=... outside /api/auth/callback, intercept and send to callback handler
  const code = searchParams.get('code')
  if (code && !pathname.startsWith('/api/auth/callback')) {
    const url = request.nextUrl.clone()
    url.pathname = '/api/auth/callback'
    return NextResponse.redirect(url)
  }

  // 2. Auth routes that logged-in users should be redirected away from
  const isAuthRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password')

  const isPublicRoute = pathname === '/' || isAuthRoute || pathname.startsWith('/reset-password')

  // Not authenticated + accessing protected route → redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated + accessing login/register/forgot-password → redirect to planner
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/planner'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
