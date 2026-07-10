"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { moveBlock } from "@/app/actions/blocks";
import { toggleBlocksLike } from "@/app/actions/likes";
import { updateTask } from "@/app/actions/tasks";
import { BlockEditor } from "./BlockEditor";
import { ComplexityBadge } from "./ComplexityBadge";
import { CopyIdButton } from "./CopyIdButton";
import { LikeBar } from "./LikeBar";
import { toast } from "./Toaster";
import {
  PHASE_LABEL,
  PROGRESS_LABEL,
  isUntriaged,
  type Block,
  type Phase,
  type Profile,
  type Progress,
  type Task,
} from "@/lib/types";

const PHASE_VAR: Record<Phase, string> = {
  ventas: "--ventas",
  onboarding: "--onboarding",
  retention: "--retention",
};
const PROGRESS_VAR: Record<Progress, string> = {
  por_empezar: "--pg-empezar",
  en_curso: "--pg-curso",
  en_revision: "--pg-revision",
  hecho: "--pg-hecho",
};

function midpoint(positions: number[], index: number): number {
  const prev = index - 1 >= 0 ? positions[index - 1] : null;
  const next = index + 1 < positions.length ? positions[index + 1] : null;
  if (prev == null && next == null) return 1000;
  if (prev == null) return (next as number) - 1000;
  if (next == null) return prev + 1000;
  return (prev + next) / 2;
}

type EditorMode = { kind: "new" } | { kind: "edit"; block: Block } | null;

export function BlocksView({
  initialBlocks,
  tasks,
  initialLikers,
  currentUser,
}: {
  initialBlocks: Block[];
  tasks: Task[];
  initialLikers: Profile[];
  currentUser: Profile | null;
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [taskList, setTaskList] = useState<Task[]>(tasks);
  const [editor, setEditor] = useState<EditorMode>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [likers, setLikers] = useState<Profile[]>(initialLikers);

  function toggleDone(t: Task) {
    const next: Progress = t.progress === "hecho" ? "por_empezar" : "hecho";
    setTaskList((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, progress: next } : x)),
    );
    updateTask(t.id, { progress: next })
      .then(() =>
        toast(
          next === "hecho" ? "Marcada como hecha" : "Marcada como pendiente",
          { description: t.title, variant: next === "hecho" ? "success" : "default" },
        ),
      )
      .catch(() => {
        setTaskList((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, progress: t.progress } : x)),
        );
        toast("No se pudo actualizar la tarea", {
          description: t.title,
          variant: "error",
        });
      });
  }

  const likedByMe = currentUser
    ? likers.some((p) => p.id === currentUser.id)
    : false;

  function toggleLike() {
    if (!currentUser) return;
    const mine = likers.some((p) => p.id === currentUser.id);
    setLikers((prev) =>
      mine
        ? prev.filter((p) => p.id !== currentUser.id)
        : [...prev, currentUser],
    );
    toggleBlocksLike().catch(() =>
      setLikers((prev) =>
        mine
          ? [...prev, currentUser]
          : prev.filter((p) => p.id !== currentUser.id),
      ),
    );
  }

  const byBlock = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of taskList) {
      if (!t.block_id) continue;
      const arr = m.get(t.block_id);
      if (arr) arr.push(t);
      else m.set(t.block_id, [t]);
    }
    return m;
  }, [taskList]);

  const unassigned = useMemo(
    () => taskList.filter((t) => !t.block_id),
    [taskList],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldI = prev.findIndex((b) => b.id === active.id);
      const newI = prev.findIndex((b) => b.id === over.id);
      if (oldI < 0 || newI < 0) return prev;
      const next = arrayMove(prev, oldI, newI);
      const pos = midpoint(next.map((b) => b.position), newI);
      next[newI] = { ...next[newI], position: pos };
      moveBlock(String(active.id), pos).catch(() =>
        toast("No se pudo reordenar los bloques", { variant: "error" }),
      );
      return next;
    });
  }

  function toggle(id: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function onSaved(b: Block) {
    const existed = blocks.some((x) => x.id === b.id);
    setBlocks((prev) =>
      existed
        ? prev.map((x) => (x.id === b.id ? b : x))
        : [...prev, b].sort((a, c) => a.position - c.position),
    );
    setEditor(null);
    toast(existed ? "Bloque actualizado" : "Bloque creado", {
      description: b.name,
      variant: "success",
    });
  }
  function onDeleted(id: string) {
    const name = blocks.find((b) => b.id === id)?.name;
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setEditor(null);
    toast("Bloque eliminado", { description: name });
  }

  return (
    <main className="blocks">
      <div className="blocks-head">
        <h1>Bloques</h1>
        <button className="btn btn-primary" onClick={() => setEditor({ kind: "new" })}>
          + Bloque
        </button>
      </div>
      <p className="blocks-sub">
        Los grandes frentes del proyecto, ordenados por prioridad. Arrastra para
        reordenar; abre un bloque para ver sus tareas.
      </p>

      {blocks.length === 0 ? (
        <div className="blocks-empty">
          <b>Aún no hay bloques</b>
          Crea tu primer bloque para agrupar las tareas por frente estratégico.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="block-list">
              {blocks.map((b, i) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  n={i + 1}
                  tasks={byBlock.get(b.id) ?? []}
                  open={open.has(b.id)}
                  onToggle={() => toggle(b.id)}
                  onEdit={() => setEditor({ kind: "edit", block: b })}
                  onToggleDone={toggleDone}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {unassigned.length > 0 && (
        <div className="unassigned">
          <h2>Sin bloque · {unassigned.length}</h2>
          <div className="bcard">
            <div className="btasks" style={{ paddingLeft: 15 }}>
              {unassigned.map((t) => (
                <TaskRow key={t.id} t={t} onToggleDone={toggleDone} />
              ))}
            </div>
          </div>
        </div>
      )}

      <LikeBar
        likers={likers}
        likedByMe={likedByMe}
        onToggle={toggleLike}
        label="los bloques"
      />

      {editor && (
        <BlockEditor
          mode={editor}
          onClose={() => setEditor(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </main>
  );
}

function BlockCard({
  block,
  n,
  tasks,
  open,
  onToggle,
  onEdit,
  onToggleDone,
}: {
  block: Block;
  n: number;
  tasks: Task[];
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onToggleDone: (t: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
  } as React.CSSProperties;

  const total = tasks.length;
  const done = tasks.filter((t) => t.progress === "hecho").length;
  const urg = tasks.filter((t) => t.priority === "urgente").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const cnt = (p: Phase) => tasks.filter((t) => t.phase === p).length;

  return (
    <section ref={setNodeRef} style={style} className={`bcard ${open ? "open" : ""}`}>
      <div className="bcard-main" onClick={onToggle}>
        <span
          className="bgrip"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Arrastrar bloque"
        >
          <GripIcon />
        </span>
        <span className="bnum">{n}</span>
        <span className="bdot" style={{ background: block.color }} />
        <span className="bname">{block.name}</span>
        <div className="bprog">
          <div className="bprog-track">
            <div
              className="bprog-fill"
              style={{ width: `${pct}%`, background: block.color }}
            />
          </div>
          <span className="bprog-label">
            {done}/{total}
          </span>
        </div>
        <button
          className="icon-btn bedit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Editar bloque"
          aria-label="Editar bloque"
        >
          <PencilIcon />
        </button>
        <span className="bchev">›</span>
      </div>

      <div className="bmeta">
        <span>
          {total} {total === 1 ? "tarea" : "tareas"}
        </span>
        {urg > 0 && (
          <span style={{ color: "var(--prio-urgente)" }}>
            {urg} {urg === 1 ? "urgente" : "urgentes"}
          </span>
        )}
        <span>
          <span className="ph" style={{ color: "var(--ventas)" }}>
            V {cnt("ventas")}
          </span>{" "}
          ·{" "}
          <span className="ph" style={{ color: "var(--onboarding)" }}>
            O {cnt("onboarding")}
          </span>{" "}
          ·{" "}
          <span className="ph" style={{ color: "var(--retention)" }}>
            R {cnt("retention")}
          </span>
        </span>
      </div>

      {open && (
        <div className="btasks">
          {tasks.length === 0 ? (
            <div className="btask-empty">Sin tareas en este bloque.</div>
          ) : (
            tasks.map((t) => (
              <TaskRow key={t.id} t={t} onToggleDone={onToggleDone} />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function TaskRow({
  t,
  onToggleDone,
}: {
  t: Task;
  onToggleDone: (t: Task) => void;
}) {
  const done = t.progress === "hecho";
  return (
    <div className="btask-row">
      <button
        className={`btask-check ${done ? "done" : ""}`}
        onClick={() => onToggleDone(t)}
        title={done ? "Marcar como pendiente" : "Marcar como hecha"}
        aria-label={done ? "Marcar como pendiente" : "Marcar como hecha"}
      >
        <CheckIcon />
      </button>
      <span className={`btask-title ${done ? "done" : ""}`}>{t.title}</span>
      {isUntriaged(t) && (
        <span
          className="chip chip-triage"
          title="Falta bloque o contexto (nota / enlace a Linear)"
        >
          Sin triar
        </span>
      )}
      <span
        className="chip"
        style={{ color: `var(${PHASE_VAR[t.phase]})` }}
      >
        {PHASE_LABEL[t.phase]}
      </span>
      <span
        className="chip chip-progress"
        style={{ ["--pgc" as string]: `var(${PROGRESS_VAR[t.progress]})` }}
      >
        <span className="dot" />
        {PROGRESS_LABEL[t.progress]}
      </span>
      {t.complexity && <ComplexityBadge value={t.complexity} />}
      <CopyIdButton task={t} />
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="4" r="1.3" /><circle cx="10" cy="4" r="1.3" />
      <circle cx="6" cy="8" r="1.3" /><circle cx="10" cy="8" r="1.3" />
      <circle cx="6" cy="12" r="1.3" /><circle cx="10" cy="12" r="1.3" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 4.8" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 2.5l2.5 2.5M3 13l.5-2.5 7-7 2 2-7 7L3 13z" />
    </svg>
  );
}
