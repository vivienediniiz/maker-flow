import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TelemetrySchema = z.object({
  status: z.enum(["idle", "printing", "paused", "error", "offline"]),
  file_name: z.string().optional(),
  progress_percent: z.number().min(0).max(100).optional(),
  eta_minutes: z.number().min(0).optional(),
  nozzle_temp_c: z.number().optional(),
  bed_temp_c: z.number().optional(),
});

/**
 * Printers/print-farm agents (OctoPrint, Klipper/Moonraker, Bambu Lab, custom ESP32 bridges)
 * POST telemetry here using the printer's api_key_webhook as a bearer token.
 *
 * Body: { status, file_name?, progress_percent?, eta_minutes?, nozzle_temp_c?, bed_temp_c? }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.replace("Bearer ", "");

  if (!apiKey) {
    return NextResponse.json({ error: "API key ausente" }, { status: 401 });
  }

  const parsed = TelemetrySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
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

  const { error: updateError } = await supabase
    .from("printers")
    .update({
      status: parsed.data.status,
      current_file_name: parsed.data.file_name ?? null,
      current_progress_percent: parsed.data.progress_percent ?? null,
      current_eta_minutes: parsed.data.eta_minutes ?? null,
      current_nozzle_temp_c: parsed.data.nozzle_temp_c ?? null,
      current_bed_temp_c: parsed.data.bed_temp_c ?? null,
      last_telemetry_at: new Date().toISOString(),
    })
    .eq("id", printer.id);

  if (updateError) {
    return NextResponse.json({ error: "Falha ao atualizar status" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, printer_id: printer.id }, { status: 200 });
}
