import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  // ✅ Content negotiation for agents (Accept: text/markdown support)
  const acceptHeader = request.headers.get('Accept') || '';
  const varyHeader = 'Accept, Accept-Encoding';
  response.headers.set('Vary', varyHeader);

  // Support markdown responses for agents
  if (acceptHeader.includes('text/markdown') || acceptHeader.includes('application/markdown')) {
    response.headers.set('Content-Type', 'text/markdown; charset=utf-8');
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Raiz: se logado (sessão válida), vai pro dashboard. Se não, mostra landing.
  if (request.nextUrl.pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Força renderização da landing page, nunca redireciona
    return NextResponse.next();
  }

  // Protege /dashboard e /admin — quem não tiver sessão válida vai pro login
  if (!user && (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin"))) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*"],
};