"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

/** Toggle del like del usuario actual a la sección "Orden de implementación". */
export async function toggleImplLike(): Promise<{ liked: boolean }> {
  const { supabase, userId } = await requireUser();

  const { data: existing } = await supabase
    .from("impl_order_likes")
    .select("profile_id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("impl_order_likes").delete().eq("profile_id", userId);
    revalidatePath("/");
    return { liked: false };
  }

  await supabase.from("impl_order_likes").insert({ profile_id: userId });
  revalidatePath("/");
  return { liked: true };
}

/** Toggle del like del usuario actual a la sección "Bloques". */
export async function toggleBlocksLike(): Promise<{ liked: boolean }> {
  const { supabase, userId } = await requireUser();

  const { data: existing } = await supabase
    .from("blocks_section_likes")
    .select("profile_id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("blocks_section_likes")
      .delete()
      .eq("profile_id", userId);
    revalidatePath("/bloques");
    return { liked: false };
  }

  await supabase.from("blocks_section_likes").insert({ profile_id: userId });
  revalidatePath("/bloques");
  return { liked: true };
}
