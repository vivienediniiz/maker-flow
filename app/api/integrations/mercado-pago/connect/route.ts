import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { setIntegrationCredential } from "@/lib/vault";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * O Mercado Pago não tem OAuth de app pra vendas do maker — o maker cola o
 * Access Token da própria conta MP dele (Painel do desenvolvedor > Credenciais
 * de produção). Validamos o token de verdade contra a API antes de salvar.
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  const webhookSecret = typeof body.webhookSecret === "string" ? body.webhookSecret.trim() : null;

  if (!accessToken) {
    return NextResponse.json({ error: "Access Token é obrigatório" }, { status: 400 });
  }

  const meRes = await fetch("https://api.mercadopago.com/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!meRes.ok) {
    return NextResponse.json({ error: "Access Token inválido — o Mercado Pago rejeitou." }, { status: 400 });
  }

  const admin = adminClient();

  const { data: existing } = await admin
    .from("integrations")
    .select("id, credential_secret_id")
    .eq("user_id", user.id)
    .eq("platform", "mercado_pago")
    .maybeSingle();

  let secretId: string;
  try {
    secretId = await setIntegrationCredential(
      admin,
      existing?.credential_secret_id ?? null,
      accessToken,
      `mercado_pago:${user.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const { data: integration, error } = await admin
    .from("integrations")
    .upsert(
      {
        ...(existing?.id ? { id: existing.id } : {}),
        user_id: user.id,
        platform: "mercado_pago",
        status: "connected",
        credential_secret_id: secretId,
        webhook_secret: webhookSecret,
      },
      { onConflict: "user_id,platform" }
    )
    .select()
    .single();

  if (error || !integration) {
    return NextResponse.json({ error: error?.message ?? "Falha ao salvar integração" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    webhookUrl: `${SITE_URL}/api/webhooks/mercado-pago/${integration.id}`,
  });
}
