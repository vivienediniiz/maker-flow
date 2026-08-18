import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { calculateShipping } from "@/lib/melhorEnvio";

export const dynamic = "force-dynamic";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Cotação de frete via Melhor Envio — o token nunca sai do servidor.
 * Body: { destinationCep, weightG, heightCm, widthCm, lengthCm }.
 * CEP de origem vem do perfil (profiles.cep) ou de settings.origin_cep,
 * mesma referência já usada em /dashboard/shipping.
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
  const { destinationCep, weightG, heightCm, widthCm, lengthCm } = body;

  if (!destinationCep || !weightG || !heightCm || !widthCm || !lengthCm) {
    return NextResponse.json({ error: "Preencha CEP de destino, peso e dimensões." }, { status: 400 });
  }

  const admin = adminClient();

  const [{ data: integration }, { data: profile }, { data: settings }] = await Promise.all([
    admin
      .from("integrations")
      .select("id, credential_secret_id, status")
      .eq("user_id", user.id)
      .eq("platform", "melhor_envio")
      .maybeSingle(),
    admin.from("profiles").select("cep").eq("id", user.id).single(),
    admin.from("settings").select("origin_cep").eq("user_id", user.id).single(),
  ]);

  const originCep = profile?.cep || settings?.origin_cep;
  if (!originCep) {
    return NextResponse.json(
      { error: "Cadastre o CEP do seu estúdio em Minha Conta antes de cotar frete." },
      { status: 400 }
    );
  }

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    return NextResponse.json(
      { error: "Conecte sua conta do Melhor Envio em Integrações antes de cotar frete." },
      { status: 400 }
    );
  }

  try {
    const quotes = await calculateShipping(admin, integration, {
      originCep,
      destinationCep,
      weightG: Number(weightG),
      heightCm: Number(heightCm),
      widthCm: Number(widthCm),
      lengthCm: Number(lengthCm),
    });
    return NextResponse.json({ quotes });
  } catch (err) {
    await admin.from("integrations").update({ status: "error" }).eq("id", integration.id);
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
