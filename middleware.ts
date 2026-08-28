import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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

  // Raiz do site: quem não tem sessão vê a landing, quem tem vai pro app.
  // Sem isso, `studiomaker3d.com.br` levava todo visitante direto pro login —
  // quem nunca ouviu falar do produto não via preço nem funcionalidade.
  //
  // A decisão fica aqui e não no splash (app/page.tsx) porque lá ela roda no
  // navegador: o visitante baixaria a página toda, veria a logo, e só então
  // seria redirecionado. Aqui é no servidor, sem piscar, e um crawler recebe
  // redirect em vez de uma tela de logo sem conteúdo.
  //
  // O `from` preserva o splash nas entradas internas: `logo` (clique na
  // logo), `logout` (botão Sair) e `app` (start_url do PWA instalado).
  if (request.nextUrl.pathname === "/" && !request.nextUrl.searchParams.has("from")) {
    return NextResponse.redirect(new URL(user ? "/dashboard" : "/home", request.url));
  }

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
