/**
 * Seed inicial: vuelca las tareas curadas de `.claude/roadmap.yaml` a Supabase.
 *
 * Uso (desde orchestrator_ui/):
 *   npx tsx scripts/seed.ts
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 * El service role salta la RLS. La fase se pone a 'ventas' por defecto (la
 * agrupación por persona no mapea a fase) — se recoloca arrastrando en la UI.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Carga mínima de .env.local ────────────────────────────────────────────────
function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

// ── Mapeo status curado → ejes nuevos ────────────────────────────────────────
type Progress = "por_empezar" | "en_curso" | "en_revision" | "hecho";
type Priority = "urgente" | "importante" | "normal";

function mapStatus(s?: string): { progress: Progress; priority: Priority } {
  const v = (s ?? "").toLowerCase();
  if (v === "urgente") return { progress: "por_empezar", priority: "urgente" };
  if (v === "importante") return { progress: "por_empezar", priority: "importante" };
  if (v === "en curso") return { progress: "en_curso", priority: "normal" };
  if (v === "validando" || v === "casi")
    return { progress: "en_revision", priority: "normal" };
  return { progress: "por_empezar", priority: "normal" };
}

interface YamlTask { title: string; note?: string; status?: string }
interface YamlBlock { title: string; tasks?: YamlTask[] }
interface YamlConfig { blocks?: YamlBlock[] }

async function main() {
  const yamlPath = join(ROOT, "..", ".claude", "roadmap.yaml");
  const cfg = yaml.load(readFileSync(yamlPath, "utf8")) as YamlConfig;
  const blocks = cfg.blocks ?? [];

  const rows = blocks.flatMap((block, bi) =>
    (block.tasks ?? []).map((t, ti) => {
      const { progress, priority } = mapStatus(t.status);
      return {
        title: t.title,
        note: (t.note ?? "").trim() || null,
        phase: "ventas" as const,
        progress,
        priority,
        complexity: null,
        requested_by: block.title,
        position: (bi * 100 + ti + 1) * 1000,
      };
    }),
  );

  const supabase = createClient(URL!, KEY!, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.from("tasks").insert(rows).select("id");
  if (error) {
    console.error("Error insertando:", error.message);
    process.exit(1);
  }
  console.log(`✓ Insertadas ${data?.length ?? 0} tareas (fase inicial: ventas).`);
}

main();
