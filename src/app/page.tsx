import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { BoardView } from "@/components/Board";
import type { Profile, QueueEntry, Task } from "@/lib/types";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, tasksRes, queueRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
    supabase
      .from("tasks")
      .select("*")
      .eq("archived", false)
      .order("position", { ascending: true }),
    supabase
      .from("impl_queue")
      .select("*")
      .order("position", { ascending: true }),
  ]);

  return (
    <div className="app">
      <Header profile={(profileRes.data as Profile) ?? null} />
      <BoardView
        initialTasks={(tasksRes.data as Task[]) ?? []}
        initialQueue={(queueRes.data as QueueEntry[]) ?? []}
      />
    </div>
  );
}
