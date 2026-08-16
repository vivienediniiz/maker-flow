import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";

/**
 * Callback do fluxo OAuth do Supabase Auth (Google/Facebook no login) —
 * diferente dos callbacks de integração de venda (Mercado Pago etc). Troca o
 * `code` pela sessão do usuário e manda pro dashboard.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${SITE_URL}/login`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${SITE_URL}/login?oauth_error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${SITE_URL}/dashboard`);
}
