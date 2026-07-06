import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { BlocksView } from "@/components/BlocksView";
import type { Block, Profile, Task } from "@/lib/types";

export default async function BloquesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, blocksRes, tasksRes, likesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
    supabase
      .from("blocks")
      .select("*")
      .eq("archived", false)
      .order("position", { ascending: true }),
    supabase.from("tasks").select("*").eq("archived", false),
    supabase
      .from("blocks_section_likes")
      .select("profile:profiles(id, name, avatar_url, email, slack_user_id)")
      .order("created_at", { ascending: true }),
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
      <Header profile={profile} active="blocks" />
      <BlocksView
        initialBlocks={(blocksRes.data as Block[]) ?? []}
        tasks={(tasksRes.data as Task[]) ?? []}
        initialLikers={likers}
        currentUser={profile}
      />
    </div>
  );
}
