import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { calculateShipping, fetchMelhorEnvioBalance, buildShippingParties } from "@/lib/melhorEnvio";
import { loadShippingContext } from "@/lib/shippingLabel";
import { apiError } from "@/lib/apiError";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Passo 1 da compra de frete: valida endereço (origem + destino) e saldo
 * ANTES de mostrar qualquer opção de transportadora — se algo faltar, a
 * pessoa corrige antes de perder tempo escolhendo transportadora.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { weightG, heightCm, widthCm, lengthCm } = body;

  if (!weightG || !heightCm || !widthCm || !lengthCm) {
    return NextResponse.json({ error: "Preencha peso e dimensões do pacote." }, { status: 400 });
  }

  const admin = adminClient();
  const ctx = await loadShippingContext(admin, user.id, params.id);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 400 });
  }
  const { client, profile, integration } = ctx;

  const parties = buildShippingParties(profile, client);
  if ("missing" in parties) {
    return NextResponse.json({ error: "Endereço incompleto pra gerar etiqueta.", missing: parties.missing }, { status: 400 });
  }

  try {
    const [balance, { quotes, unavailable }] = await Promise.all([
      fetchMelhorEnvioBalance(admin, integration),
      calculateShipping(admin, integration, {
        originCep: profile.cep!,
        destinationCep: client.cep!,
        weightG: Number(weightG),
        heightCm: Number(heightCm),
        widthCm: Number(widthCm),
        lengthCm: Number(lengthCm),
      }),
    ]);

    return NextResponse.json({ balance, quotes, unavailable });
  } catch (err) {
    return apiError("shipping-quote-by-id", err, "Não foi possível cotar o frete agora. Tente novamente.");
  }
}
