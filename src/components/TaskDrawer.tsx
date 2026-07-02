"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createTask,
  deleteTask,
  getTaskActivity,
  updateTask,
  type TaskInput,
} from "@/app/actions/tasks";
import {
  COMPLEXITY_LABEL,
  PHASE_LABEL,
  PHASES,
  PRIORITY_LABEL,
  PROGRESS_LABEL,
  type Activity,
  type Complexity,
  type Phase,
  type Priority,
  type Progress,
  type Task,
} from "@/lib/types";

type Mode =
  | { kind: "new"; phase: Phase }
  | { kind: "edit"; task: Task };

const PROGRESSES: Progress[] = ["por_empezar", "en_curso", "en_revision", "hecho"];
const PRIORITIES: Priority[] = ["urgente", "importante", "normal"];
const COMPLEXITIES: Complexity[] = ["S", "M", "L", "XL"];

export function TaskDrawer({
  mode,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: Mode;
  onClose: () => void;
  onSaved: (t: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const editing = mode.kind === "edit" ? mode.task : null;

  const [title, setTitle] = useState(editing?.title ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [phase, setPhase] = useState<Phase>(
    editing?.phase ?? (mode.kind === "new" ? mode.phase : "ventas"),
  );
  const [progress, setProgress] = useState<Progress>(
    editing?.progress ?? "por_empezar",
  );
  const [priority, setPriority] = useState<Priority>(
    editing?.priority ?? "normal",
  );
  const [complexity, setComplexity] = useState<Complexity | null>(
    editing?.complexity ?? null,
  );
  const [requestedBy, setRequestedBy] = useState(editing?.requested_by ?? "");
  const [pending, startTransition] = useTransition();
  const [activity, setActivity] = useState<Activity[] | null>(null);

  useEffect(() => {
    if (editing) {
      getTaskActivity(editing.id)
        .then((a) => setActivity(a as unknown as Activity[]))
        .catch(() => setActivity([]));
    }
  }, [editing]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    if (!title.trim()) return;
    const input: TaskInput = {
      title,
      note,
      phase,
      progress,
      priority,
      complexity,
      requested_by: requestedBy,
    };
    startTransition(async () => {
      const saved = editing
        ? await updateTask(editing.id, input)
        : await createTask(input);
      onSaved(saved);
      onClose();
    });
  }

  function remove() {
    if (!editing) return;
    if (!confirm("¿Borrar esta tarea?")) return;
    startTransition(async () => {
      await deleteTask(editing.id);
      onDeleted(editing.id);
      onClose();
    });
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Editar tarea" : "Nueva tarea"}
      >
        <div className="drawer-head">
          <h2>{editing ? "Editar tarea" : "Nueva tarea"}</h2>
          <button
            className="icon-btn"
            style={{ marginLeft: "auto" }}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>

        <div className="drawer-body">
          <div className="field">
            <label htmlFor="t-title">Título</label>
            <input
              id="t-title"
              className="input"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Qué hay que hacer"
            />
          </div>

          <div className="field">
            <label htmlFor="t-note">Nota</label>
            <textarea
              id="t-note"
              className="textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contexto, detalles…"
            />
          </div>

          <Segmented
            label="Fase"
            options={PHASES}
            value={phase}
            display={(p) => PHASE_LABEL[p]}
            onChange={setPhase}
          />

          <Segmented
            label="Complejidad"
            options={COMPLEXITIES}
            value={complexity}
            display={(c) => `${c} · ${COMPLEXITY_LABEL[c]}`}
            onChange={(c) => setComplexity(c === complexity ? null : c)}
            clearable
          />

          <Segmented
            label="Progreso"
            options={PROGRESSES}
            value={progress}
            display={(p) => PROGRESS_LABEL[p]}
            onChange={setProgress}
          />

          <Segmented
            label="Prioridad"
            options={PRIORITIES}
            value={priority}
            display={(p) => PRIORITY_LABEL[p]}
            onChange={setPriority}
          />

          <div className="field">
            <label htmlFor="t-req">Pedida por</label>
            <input
              id="t-req"
              className="input"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="Maria, Giancarlo, Sol…"
            />
          </div>

          {editing && (
            <div className="field">
              <label>Historial</label>
              <ActivityList activity={activity} />
            </div>
          )}
        </div>

        <div className="drawer-actions">
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={pending || !title.trim()}
          >
            {pending ? "Guardando…" : editing ? "Guardar" : "Crear tarea"}
          </button>
          <button className="btn btn-secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          {editing && (
            <button
              className="btn btn-ghost"
              style={{ marginLeft: "auto", color: "var(--prio-urgente)" }}
              onClick={remove}
              disabled={pending}
            >
              Borrar
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  display,
  onChange,
  clearable,
}: {
  label: string;
  options: T[];
  value: T | null;
  display: (v: T) => string;
  onChange: (v: T) => void;
  clearable?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="seg">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(o)}
          >
            {display(o)}
          </button>
        ))}
        {clearable && value !== null && (
          <button type="button" onClick={() => onChange(value)} aria-pressed={false}>
            quitar
          </button>
        )}
      </div>
    </div>
  );
}

const ACTION_LABEL: Record<Activity["action"], string> = {
  create: "creó la tarea",
  update: "editó",
  move_phase: "cambió de fase",
  reorder: "reordenó",
  delete: "borró",
  queue_add: "añadió a la cola",
  queue_remove: "quitó de la cola",
  queue_complete: "marcó completada en la cola",
  queue_archive: "pasó al historial",
  queue_restore: "restauró desde el historial",
};

function ActivityList({ activity }: { activity: Activity[] | null }) {
  if (activity === null)
    return <p className="activity-when">Cargando historial…</p>;
  if (activity.length === 0)
    return <p className="activity-when">Sin cambios registrados aún.</p>;

  const fmt = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="activity">
      {activity.map((a) => (
        <div className="activity-item" key={a.id}>
          {a.actor?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="av" src={a.actor.avatar_url} alt="" />
          ) : (
            <span className="av" />
          )}
          <div>
            <span className="activity-who">
              {a.actor?.name ?? "Alguien"}
            </span>{" "}
            {ACTION_LABEL[a.action]}
            {a.changes && a.action === "update" && (
              <span className="activity-when">
                {" "}
                ({Object.keys(a.changes).join(", ")})
              </span>
            )}
            <div className="activity-when">
              {fmt.format(new Date(a.created_at))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
