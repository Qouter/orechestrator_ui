"use client";

import Link from "next/link";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LikeBar } from "./LikeBar";
import {
  PHASE_LABEL,
  type Phase,
  type Profile,
  type QueueEntry,
  type Task,
} from "@/lib/types";

const PHASE_VAR: Record<Phase, string> = {
  ventas: "--ventas",
  onboarding: "--onboarding",
  retention: "--retention",
};

export interface QueueRow {
  entry: QueueEntry;
  task: Task;
}

export function ImplQueue({
  rows,
  onRemove,
  onAdvance,
  likers,
  likedByMe,
  onToggleLike,
}: {
  rows: QueueRow[];
  onRemove: (entry: QueueEntry) => void;
  onAdvance: (entry: QueueEntry) => void;
  likers: Profile[];
  likedByMe: boolean;
  onToggleLike: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "queue",
    data: { type: "queue" },
  });

  return (
    <aside ref={setNodeRef} className={`queue ${isOver ? "is-over" : ""}`}>
      <div className="queue-head">
        <h2>Orden de implementación</h2>
        <Link className="queue-hist-link" href="/historial">
          Historial
        </Link>
      </div>
      <SortableContext
        items={rows.map((r) => `q:${r.entry.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="queue-list">
          {rows.map((r, i) => (
            <QueueItem
              key={r.entry.id}
              row={r}
              n={i + 1}
              onRemove={onRemove}
              onAdvance={onAdvance}
            />
          ))}
        </div>
      </SortableContext>
      {rows.length === 0 && (
        <p className="queue-empty">
          Arrastra tareas aquí (o pulsa el + de una tarjeta) para fijar el orden
          de implementación entre fases.
        </p>
      )}

      <LikeBar
        likers={likers}
        likedByMe={likedByMe}
        onToggle={onToggleLike}
        label="el orden"
      />
    </aside>
  );
}

function QueueItem({
  row,
  n,
  onRemove,
  onAdvance,
}: {
  row: QueueRow;
  n: number;
  onRemove: (entry: QueueEntry) => void;
  onAdvance: (entry: QueueEntry) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `q:${row.entry.id}`, data: { type: "queue" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
  } as React.CSSProperties;

  const done = !!row.entry.completed_at;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`queue-item ${done ? "done" : ""}`}
      {...attributes}
      {...listeners}
    >
      <span className="queue-num">{done ? <CheckMini /> : n}</span>
      <div className="queue-body">
        <div className="queue-title">{row.task.title}</div>
        <div
          className="queue-phase"
          style={{ color: `var(${PHASE_VAR[row.task.phase]})` }}
        >
          {PHASE_LABEL[row.task.phase]}
        </div>
      </div>
      <button
        className={`icon-btn ${done ? "adv-done" : "adv"}`}
        title={done ? "Pasar al historial" : "Marcar completada"}
        aria-label={done ? "Pasar al historial" : "Marcar completada"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onAdvance(row.entry)}
      >
        {done ? <ArchiveIcon /> : <CircleCheckIcon />}
      </button>
      <button
        className="icon-btn"
        title="Quitar de la cola"
        aria-label="Quitar de la cola"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(row.entry)}
      >
        <XIcon />
      </button>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function CircleCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 8.2l1.8 1.8 3.3-3.6" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="12" height="3" rx="0.8" />
      <path d="M3 6v6.2c0 .5.4.8.8.8h8.4c.4 0 .8-.3.8-.8V6" />
      <path d="M6.3 9h3.4" />
    </svg>
  );
}

function CheckMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-6.5" />
    </svg>
  );
}
