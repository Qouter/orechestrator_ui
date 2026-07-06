import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { BoardView } from "@/components/Board";
import type { Block, Profile, QueueEntry, Task } from "@/lib/types";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, tasksRes, queueRes, likesRes, blocksRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
      supabase
        .from("tasks")
        .select("*")
        .eq("archived", false)
        .order("position", { ascending: true }),
      supabase
        .from("impl_queue")
        .select("*")
        .is("archived_at", null)
        .order("position", { ascending: true }),
      supabase
        .from("impl_order_likes")
        .select("profile:profiles(id, name, avatar_url, email, slack_user_id)")
        .order("created_at", { ascending: true }),
      supabase
        .from("blocks")
        .select("*")
        .eq("archived", false)
        .order("position", { ascending: true }),
    ]);

  const profile = (profileRes.data as Profile) ?? null;
  const likeRows = (likesRes.data ?? []) as unknown as Array<{
    profile: Profile | Profile[] | null;
  }>;
  const likers = likeRows
    .map((r) => (Array.isArray(r.profile) ? r.profile[0] : r.profile))
    .filter((p): p is Profile => !!p);

  return (
    <div className="app">
      <Header profile={profile} active="board" />
      <BoardView
        initialTasks={(tasksRes.data as Task[]) ?? []}
        initialQueue={(queueRes.data as QueueEntry[]) ?? []}
        initialLikers={likers}
        currentUser={profile}
        blocks={(blocksRes.data as Block[]) ?? []}
      />
    </div>
  );
}
