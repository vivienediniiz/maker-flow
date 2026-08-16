import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { deleteIntegrationCredential } from "@/lib/vault";
import type { IntegrationPlatform } from "@/lib/types";

const VALID_PLATFORMS: IntegrationPlatform[] = ["mercado_pago", "shopee", "tiktok_shop"];

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(_req: NextRequest, { params }: { params: { platform: string } }) {
  const platform = params.platform as IntegrationPlatform;
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = adminClient();

  const { data: integration } = await admin
    .from("integrations")
    .select("id, credential_secret_id")
    .eq("user_id", user.id)
    .eq("platform", platform)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ ok: true });
  }

  if (integration.credential_secret_id) {
    await deleteIntegrationCredential(admin, integration.credential_secret_id);
  }

  await admin
    .from("integrations")
    .update({ status: "disconnected", credential_secret_id: null, webhook_secret: null, last_event_at: null })
    .eq("id", integration.id);

  return NextResponse.json({ ok: true });
}
