"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { linearGraphQL, performSync } from "@/lib/linear-sync";

const GTM_TEAM_ID = "912ef011-6fc5-4cfe-95ae-44b5f8399c32";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email?.endsWith("@heydiga.com")) {
    throw new Error("No autorizado");
  }
  return { supabase };
}

export async function linkTask(taskId: string, rawId: string) {
  const { supabase } = await requireUser();
  const id = rawId.trim().toUpperCase();
  if (!/^[A-Z]+-\d+$/.test(id)) throw new Error("Formato inválido (p.ej. GTM-370)");
  const { error } = await supabase
    .from("tasks")
    .update({
      source: "linear",
      linear_id: id,
      linear_url: `https://linear.app/heydiga/issue/${id}`,
    })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/bloques");
  return { ok: true };
}

export async function unlinkTask(taskId: string) {
  const { supabase } = await requireUser();
  await supabase
    .from("tasks")
    .update({
      source: "manual",
      linear_id: null,
      linear_url: null,
      linear_state: null,
      linear_state_type: null,
      linear_priority: null,
      git_branch: null,
      linear_synced_at: null,
    })
    .eq("id", taskId);
  revalidatePath("/");
  revalidatePath("/bloques");
  return { ok: true };
}

/** Crea un issue en Linear (equipo GTM, assignee = viewer) y lo enlaza a la tarea. */
export async function createLinearIssue(taskId: string) {
  const { supabase } = await requireUser();
  const { data: task } = await supabase
    .from("tasks")
    .select("title, note")
    .eq("id", taskId)
    .single();
  if (!task) throw new Error("Tarea no encontrada");

  const viewer = await linearGraphQL<{ viewer: { id: string } }>(
    `query { viewer { id } }`,
  );
  const created = await linearGraphQL<{
    issueCreate: { success: boolean; issue: { identifier: string; url: string } };
  }>(
    `mutation($input: IssueCreateInput!){ issueCreate(input:$input){ success issue { identifier url } } }`,
    {
      input: {
        teamId: GTM_TEAM_ID,
        assigneeId: viewer.viewer.id,
        title: task.title,
        description: task.note ?? undefined,
      },
    },
  );
  const issue = created.issueCreate.issue;
  await supabase
    .from("tasks")
    .update({
      source: "linear",
      linear_id: issue.identifier,
      linear_url: issue.url,
      linear_state: "Todo",
      linear_state_type: "unstarted",
      linear_synced_at: new Date().toISOString(),
    })
    .eq("id", taskId);
  revalidatePath("/");
  revalidatePath("/bloques");
  return { identifier: issue.identifier, url: issue.url };
}

/** Sync manual desde el botón del header (sesión de usuario, RLS). */
export async function syncFromLinear() {
  const { supabase } = await requireUser();
  return performSync(supabase);
}
