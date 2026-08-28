import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Raiz do site é a landing. Quem já tem sessão vai direto pro app, mas a
  // checagem é só a presença do cookie de auth — de propósito, sem chamar o
  // Supabase: essa é a página mais visitada e a que precisa carregar mais
  // rápido, e uma ida à rede em todo acesso anônimo sairia cara à toa.
  // Cookie vencido no pior caso manda pro /dashboard, que aí sim revalida de
  // verdade e devolve pro login.
  if (request.nextUrl.pathname === "/") {
    const hasSession = request.cookies.getAll().some((c) => /^sb-.+-auth-token/.test(c.name));
    return hasSession
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

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

  // Protect all /dashboard and /admin routes. A checagem de is_admin em si
  // (quem pode ver /admin de fato) fica em app/admin/layout.tsx — aqui só
  // garante que ninguém deslogado chegue nem nessa checagem.
  if (!user && (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin"))) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*"],
};
