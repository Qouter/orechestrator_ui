import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { performSync } from "@/lib/linear-sync";

/** Cron de sync Linear→app. Protegido con CRON_SECRET; usa service role (sin sesión). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Falta SUPABASE_SECRET_KEY" },
      { status: 500 },
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  try {
    const result = await performSync(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
