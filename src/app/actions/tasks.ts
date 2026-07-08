"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Complexity, Phase, Priority, Progress, Task } from "@/lib/types";

/** Valida sesión + dominio y devuelve el client y el user id (= profiles.id). */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email?.endsWith("@heydiga.com")) {
    throw new Error("No autorizado");
  }
  return { supabase, userId: user.id };
}

type Supa = Awaited<ReturnType<typeof requireUser>>["supabase"];

type ActivityAction =
  | "create"
  | "update"
  | "move_phase"
  | "reorder"
  | "delete"
  | "queue_add"
  | "queue_remove"
  | "queue_complete"
  | "queue_archive"
  | "queue_restore";

async function logActivity(
  supabase: Supa,
  actorId: string,
  taskId: string | null,
  action: ActivityAction,
  changes?: Record<string, { from: unknown; to: unknown }>,
) {
  await supabase.from("task_activity").insert({
    task_id: taskId,
    actor_id: actorId,
    action,
    changes: changes ?? null,
  });
}

export interface TaskInput {
  title: string;
  note?: string | null;
  phase: Phase;
  progress?: Progress;
  priority?: Priority;
  complexity?: Complexity | null;
  requested_by?: string | null;
  block_id?: string | null;
}

export async function createTask(input: TaskInput) {
  const { supabase, userId } = await requireUser();

  // posición al final de su fase
  const { data: last } = await supabase
    .from("tasks")
    .select("position")
    .eq("phase", input.phase)
    .eq("archived", false)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? 0) + 1000;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title.trim(),
      note: input.note?.trim() || null,
      phase: input.phase,
      progress: input.progress ?? "por_empezar",
      priority: input.priority ?? "normal",
      complexity: input.complexity ?? null,
      requested_by: input.requested_by?.trim() || null,
      block_id: input.block_id ?? null,
      position,
      created_by: userId,
      updated_by: userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await logActivity(supabase, userId, data.id, "create");
  revalidatePath("/");
  revalidatePath("/bloques");
  return data as Task;
}

const EDITABLE: (keyof TaskInput)[] = [
  "title",
  "note",
  "phase",
  "progress",
  "priority",
  "complexity",
  "requested_by",
  "block_id",
];

export async function updateTask(id: string, patch: Partial<TaskInput>) {
  const { supabase, userId } = await requireUser();

  const { data: current, error: readErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (readErr) throw new Error(readErr.message);

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of EDITABLE) {
    if (key in patch && patch[key] !== current[key]) {
      changes[key] = { from: current[key], to: patch[key] };
    }
  }
  if (Object.keys(changes).length === 0) return current as Task;

  const { data, error } = await supabase
    .from("tasks")
    .update({ ...patch, updated_by: userId })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const movedPhase = "phase" in changes;
  await logActivity(
    supabase,
    userId,
    id,
    movedPhase ? "move_phase" : "update",
    changes,
  );
  revalidatePath("/");
  revalidatePath("/bloques");
  return data as Task;
}

/** Mueve una tarea a (phase, position) — drag entre/dentro de columnas. */
export async function moveTask(id: string, phase: Phase, position: number) {
  const { supabase, userId } = await requireUser();

  const { data: current } = await supabase
    .from("tasks")
    .select("phase")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("tasks")
    .update({ phase, position, updated_by: userId })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const changedPhase = current?.phase !== phase;
  await logActivity(
    supabase,
    userId,
    id,
    changedPhase ? "move_phase" : "reorder",
    changedPhase ? { phase: { from: current?.phase, to: phase } } : undefined,
  );
  revalidatePath("/");
  return data as Task;
}

export async function deleteTask(id: string) {
  const { supabase, userId } = await requireUser();
  const { data: current } = await supabase
    .from("tasks")
    .select("title")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, userId, id, "delete", {
    title: { from: current?.title, to: null },
  });
  revalidatePath("/");
  revalidatePath("/bloques");
  return { ok: true };
}

/** Cola de implementación. */
export async function queueAdd(taskId: string) {
  const { supabase, userId } = await requireUser();

  // dedupe entre entradas ACTIVAS (no archivadas)
  const { data: existing } = await supabase
    .from("impl_queue")
    .select("*")
    .eq("task_id", taskId)
    .is("archived_at", null)
    .maybeSingle();
  if (existing) return existing;

  const { data: last } = await supabase
    .from("impl_queue")
    .select("position")
    .is("archived_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? 0) + 1000;

  const { data, error } = await supabase
    .from("impl_queue")
    .insert({ task_id: taskId, position, added_by: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await logActivity(supabase, userId, taskId, "queue_add");
  revalidatePath("/");
  return data;
}

/** Avanza el estado de una entrada de la cola: activa → completada → historial. */
export async function queueAdvance(
  entryId: string,
): Promise<{ stage: "completed" | "archived" }> {
  const { supabase, userId } = await requireUser();
  const { data: entry } = await supabase
    .from("impl_queue")
    .select("task_id, completed_at")
    .eq("id", entryId)
    .single();

  if (entry && !entry.completed_at) {
    await supabase
      .from("impl_queue")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", entryId);
    await logActivity(supabase, userId, entry.task_id, "queue_complete");
    revalidatePath("/");
    return { stage: "completed" };
  }

  await supabase
    .from("impl_queue")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", entryId);
  if (entry) {
    // Al pasar al historial, la tarea sale del tablero general.
    await supabase.from("tasks").update({ archived: true }).eq("id", entry.task_id);
    await logActivity(supabase, userId, entry.task_id, "queue_archive");
  }
  revalidatePath("/");
  revalidatePath("/historial");
  return { stage: "archived" };
}

/** Reactiva una entrada archivada (la saca del historial de vuelta a la cola). */
export async function queueRestore(entryId: string) {
  const { supabase, userId } = await requireUser();
  const { data: entry } = await supabase
    .from("impl_queue")
    .select("task_id")
    .eq("id", entryId)
    .single();
  const { data: last } = await supabase
    .from("impl_queue")
    .select("position")
    .is("archived_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  await supabase
    .from("impl_queue")
    .update({
      archived_at: null,
      completed_at: null,
      position: (last?.position ?? 0) + 1000,
    })
    .eq("id", entryId);
  if (entry) {
    // Al restaurar, la tarea vuelve al tablero general.
    await supabase.from("tasks").update({ archived: false }).eq("id", entry.task_id);
    await logActivity(supabase, userId, entry.task_id, "queue_restore");
  }
  revalidatePath("/");
  revalidatePath("/historial");
  return { ok: true };
}

export async function queueRemove(entryId: string, taskId: string) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("impl_queue").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
  await logActivity(supabase, userId, taskId, "queue_remove");
  revalidatePath("/");
  return { ok: true };
}

export async function queueReorder(entryId: string, position: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("impl_queue")
    .update({ position })
    .eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { ok: true };
}

/** Historial de cambios de una tarea (para el drawer), con el autor resuelto. */
export async function getTaskActivity(taskId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("task_activity")
    .select("*, actor:profiles(id, name, avatar_url, email)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}
