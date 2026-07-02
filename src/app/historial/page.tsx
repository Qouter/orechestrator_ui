import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HistoryRestore } from "@/components/HistoryRestore";
import { PHASE_LABEL, type Phase } from "@/lib/types";

const PHASE_VAR: Record<Phase, string> = {
  ventas: "--ventas",
  onboarding: "--onboarding",
  retention: "--retention",
};

interface TaskLite {
  id: string;
  title: string;
  phase: Phase;
}
interface RawRow {
  id: string;
  completed_at: string | null;
  archived_at: string | null;
  task: TaskLite | TaskLite[] | null;
}
interface Row {
  id: string;
  completed_at: string | null;
  archived_at: string | null;
  task: TaskLite | null;
}

export default async function HistorialPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("impl_queue")
    .select("id, completed_at, archived_at, task:tasks(id, title, phase)")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  const rows: Row[] = ((data ?? []) as unknown as RawRow[]).map((r) => ({
    id: r.id,
    completed_at: r.completed_at,
    archived_at: r.archived_at,
    task: Array.isArray(r.task) ? r.task[0] ?? null : r.task,
  }));

  const fmt = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="app">
      <main className="hist">
        <Link className="hist-back" href="/">
          ← Volver al tablero
        </Link>
        <h1>Historial de implementación</h1>
        <p className="hist-sub">
          Tareas que pasaron por la cola de implementación y se archivaron.
        </p>

        {rows.length === 0 ? (
          <p className="hist-empty">
            Aún no hay nada en el historial. Marca una tarea de la cola como
            completada y púlsala de nuevo para archivarla aquí.
          </p>
        ) : (
          <div className="hist-list">
            {rows.map((r) => (
              <div className="hist-item" key={r.id}>
                <svg
                  className="hist-check"
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M5.3 8.2l1.9 1.9 3.5-3.9" />
                </svg>
                <div className="hist-body">
                  <div className="hist-title">
                    {r.task?.title ?? "(tarea eliminada)"}
                  </div>
                  <div className="hist-meta">
                    {r.task && (
                      <span
                        className="hist-phase"
                        style={{ color: `var(${PHASE_VAR[r.task.phase]})` }}
                      >
                        {PHASE_LABEL[r.task.phase]}
                      </span>
                    )}
                    {r.archived_at && (
                      <span>archivada {fmt.format(new Date(r.archived_at))}</span>
                    )}
                  </div>
                </div>
                <HistoryRestore entryId={r.id} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
