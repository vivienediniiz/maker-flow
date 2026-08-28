import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br";

/**
 * Callback do fluxo OAuth do Supabase Auth (Google/Facebook no login) —
 * diferente dos callbacks de integração de venda (Mercado Pago etc). Troca o
 * `code` pela sessão do usuário e manda pro dashboard.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const refCode = req.nextUrl.searchParams.get("ref");

  if (!code) {
    return NextResponse.redirect(`${SITE_URL}/login`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${SITE_URL}/login?oauth_error=${encodeURIComponent(error.message)}`);
  }

  // Resolve indicação de afiliado (só pra cadastro via Google, já que o
  // e-mail/senha já resolve isso na trigger handle_new_user). Nunca deve
  // travar o login se algo der errado aqui — só não seta referred_by.
  if (refCode) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("referred_by").eq("id", user.id).single();

        if (profile && !profile.referred_by) {
          const { data: affiliateId } = await supabase.rpc("resolve_affiliate_code", { code: refCode });
          if (affiliateId && affiliateId !== user.id) {
            await supabase.from("profiles").update({ referred_by: affiliateId }).eq("id", user.id);
          }
        }
      }
    } catch (err) {
      console.error("[auth/callback] falha ao resolver indicação de afiliado", err);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/dashboard`);
}
