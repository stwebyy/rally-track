import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // パブリックルート（認証不要）
  const publicRoutes = ['/signin', '/signup', '/reset-password', '/auth/confirm']

  // 現在のパスを取得
  const { pathname } = request.nextUrl

  // APIルートの場合は認証チェックをスキップ（API内で個別に認証を行う）
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // パブリックルートの場合は通常のセッション更新のみ
  if (publicRoutes.includes(pathname)) {
    return await updateSession(request)
  }

  // プライベートルートの認証チェック
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ユーザー認証状態をチェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 認証されていない場合はサインインページにリダイレクト
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
