import type { SupabaseClient } from "@supabase/supabase-js";

const LINEAR_API = "https://api.linear.app/graphql";

export function stateToProgress(type: string, name: string) {
  if (type === "completed") return "hecho";
  if (type === "started")
    return /review/i.test(name) ? "en_revision" : "en_curso";
  return "por_empezar"; // backlog | unstarted
}

export function priorityMap(v: number | null) {
  if (v === 1) return "urgente";
  if (v === 2) return "importante";
  return "normal";
}

export async function linearGraphQL<T>(
  query: string,
  variables?: object,
): Promise<T> {
  const key = process.env.LINEAR_API_KEY;
  if (!key) throw new Error("Falta LINEAR_API_KEY en el entorno");
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data as T;
}

interface IssueNode {
  identifier: string;
  url: string;
  branchName: string | null;
  priority: number | null;
  state: { name: string; type: string };
}

/** Sync una vía Linear → app: refresca las tareas enlazadas (source='linear'). */
export async function performSync(supabase: SupabaseClient) {
  const data = await linearGraphQL<{ issues: { nodes: IssueNode[] } }>(
    `query {
       issues(first: 250, filter: { assignee: { isMe: { eq: true } } }) {
         nodes { identifier url branchName priority state { name type } }
       }
     }`,
  );
  const byId = new Map(data.issues.nodes.map((n) => [n.identifier, n]));

  const { data: linked } = await supabase
    .from("tasks")
    .select("id, linear_id")
    .eq("source", "linear")
    .not("linear_id", "is", null);

  let updated = 0;
  for (const t of linked ?? []) {
    const n = byId.get(t.linear_id as string);
    if (!n) continue;
    await supabase
      .from("tasks")
      .update({
        linear_url: n.url,
        linear_state: n.state.name,
        linear_state_type: n.state.type,
        linear_priority: n.priority,
        git_branch: n.branchName,
        progress: stateToProgress(n.state.type, n.state.name),
        priority: priorityMap(n.priority),
        archived: n.state.type === "canceled",
        linear_synced_at: new Date().toISOString(),
      })
      .eq("id", t.id);
    updated++;
  }
  return { updated };
}
