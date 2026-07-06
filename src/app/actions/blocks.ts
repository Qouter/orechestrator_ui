"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Block } from "@/lib/types";

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

export interface BlockInput {
  name: string;
  color?: string;
  description?: string | null;
}

export async function createBlock(input: BlockInput) {
  const { supabase, userId } = await requireUser();
  const { data: last } = await supabase
    .from("blocks")
    .select("position")
    .eq("archived", false)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? 0) + 1000;

  const { data, error } = await supabase
    .from("blocks")
    .insert({
      name: input.name.trim(),
      color: input.color ?? "#5b8cff",
      description: input.description?.trim() || null,
      position,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/bloques");
  return data as Block;
}

export async function updateBlock(id: string, patch: Partial<BlockInput>) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("blocks")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() || null }
        : {}),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/bloques");
  return data as Block;
}

export async function deleteBlock(id: string) {
  const { supabase } = await requireUser();
  // tasks.block_id se pone a null solo (FK on delete set null).
  const { error } = await supabase.from("blocks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/bloques");
  return { ok: true };
}

/** Reordena la prioridad de un bloque (position = midpoint calculado en cliente). */
export async function moveBlock(id: string, position: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("blocks")
    .update({ position })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/bloques");
  return { ok: true };
}
