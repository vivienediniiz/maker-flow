import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export function createClient() {
  // @ts-ignore — cookies() retorna Promise em Next.js 16 mas Supabase SSR 0.12 ainda espera síncrono
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // @ts-ignore
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // @ts-ignore
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component; safe to ignore if middleware refreshes sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // @ts-ignore
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Ignore in Server Component context.
          }
        },
      },
    }
  );
}

/**
 * auth.getUser() bate no servidor de Auth do Supabase (não é só leitura de
 * cookie local) — layout.tsx e page.tsx do dashboard chamavam isso cada um
 * por conta própria, dobrando a espera à toa pro mesmo usuário na mesma
 * request. React.cache() garante que só a primeira chamada em cada
 * renderização do servidor de fato bate na rede; as próximas reaproveitam
 * o resultado.
 */
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
