import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { BlocksView } from "@/components/BlocksView";
import type { Block, Profile, Task } from "@/lib/types";

export default async function BloquesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, blocksRes, tasksRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
    supabase
      .from("blocks")
      .select("*")
      .eq("archived", false)
      .order("position", { ascending: true }),
    supabase.from("tasks").select("*").eq("archived", false),
  ]);

  return (
    <div className="app">
      <Header profile={(profileRes.data as Profile) ?? null} active="blocks" />
      <BlocksView
        initialBlocks={(blocksRes.data as Block[]) ?? []}
        tasks={(tasksRes.data as Task[]) ?? []}
      />
    </div>
  );
}
