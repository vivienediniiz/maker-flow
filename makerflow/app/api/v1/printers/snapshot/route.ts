import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Printers/print-farm agents (bridge.py) POST um frame JPEG aqui usando a
 * api_key_webhook da impressora como bearer token. Sobrescreve sempre o
 * mesmo arquivo (printer-snapshots/{printer_id}/latest.jpg) e atualiza
 * last_snapshot_at, pro painel saber se a imagem está "ao vivo" ou parada.
 *
 * Body: bytes JPEG crus, Content-Type: image/jpeg
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.replace("Bearer ", "");

  if (!apiKey) {
    return NextResponse.json({ error: "API key ausente" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Content-Type precisa ser image/jpeg" }, { status: 400 });
  }

  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Tamanho de imagem inválido" }, { status: 400 });
  }

  const supabase = adminClient();

  const { data: printer, error: findError } = await supabase
    .from("printers")
    .select("id, user_id")
    .eq("api_key_webhook", apiKey)
    .single();

  if (findError || !printer) {
    return NextResponse.json({ error: "Impressora não encontrada para essa API key" }, { status: 404 });
  }

  const { error: uploadError } = await supabase.storage
    .from("printer-snapshots")
    .upload(`${printer.id}/latest.jpg`, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Falha ao salvar snapshot" }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("printers")
    .update({ last_snapshot_at: new Date().toISOString() })
    .eq("id", printer.id);

  if (updateError) {
    return NextResponse.json({ error: "Falha ao atualizar last_snapshot_at" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, printer_id: printer.id }, { status: 200 });
}
