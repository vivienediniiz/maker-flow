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
  const termsVersion = req.nextUrl.searchParams.get("terms");
  const error_desc = req.nextUrl.searchParams.get("error_description");
  const error_code = req.nextUrl.searchParams.get("error");

  console.log("[auth/callback] iniciado", {
    hasCode: !!code,
    hasError: !!error_code,
    errorCode: error_code,
    errorDesc: error_desc,
  });

  // Se houver erro vindo do Google/Supabase
  if (error_code) {
    console.error("[auth/callback] erro do OAuth provider", error_code, error_desc);
    return NextResponse.redirect(
      `${SITE_URL}/login?oauth_error=${encodeURIComponent(error_desc || error_code)}`
    );
  }

  if (!code) {
    console.error("[auth/callback] código não encontrado");
    return NextResponse.redirect(`${SITE_URL}/login`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] falha ao trocar código por sessão", error.message);
    return NextResponse.redirect(`${SITE_URL}/login?oauth_error=${encodeURIComponent(error.message)}`);
  }

  console.log("[auth/callback] sessão criada com sucesso");

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

  // Aceite dos termos no cadastro por Google. O caminho e-mail/senha grava
  // isso na trigger handle_new_user, mas signInWithOAuth não carrega metadata
  // de usuário, então aqui é o primeiro momento em que dá pra carimbar.
  // Só grava se ainda não houver aceite: quem já aceitou uma versão não pode
  // ter o carimbo trocado por um login posterior.
  if (termsVersion) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("terms_accepted_at")
          .eq("id", user.id)
          .single();

        if (profile && !profile.terms_accepted_at) {
          await supabase
            .from("profiles")
            .update({ terms_accepted_at: new Date().toISOString(), terms_version: termsVersion })
            .eq("id", user.id);
        }
      }
    } catch (err) {
      console.error("[auth/callback] falha ao registrar aceite dos termos", err);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/dashboard`);
}
