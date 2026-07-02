"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PHASE_LABEL, type Phase, type QueueEntry, type Task } from "@/lib/types";

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
}: {
  rows: QueueRow[];
  onRemove: (entry: QueueEntry) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "queue",
    data: { type: "queue" },
  });

  return (
    <aside ref={setNodeRef} className={`queue ${isOver ? "is-over" : ""}`}>
      <div className="queue-head">
        <h2>Orden de implementación</h2>
      </div>
      <SortableContext
        items={rows.map((r) => `q:${r.entry.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="queue-list">
          {rows.map((r, i) => (
            <QueueItem key={r.entry.id} row={r} n={i + 1} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
      {rows.length === 0 && (
        <p className="queue-empty">
          Arrastra tareas aquí (o pulsa el + de una tarjeta) para fijar el orden
          de implementación entre fases.
        </p>
      )}
    </aside>
  );
}

function QueueItem({
  row,
  n,
  onRemove,
}: {
  row: QueueRow;
  n: number;
  onRemove: (entry: QueueEntry) => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="queue-item"
      {...attributes}
      {...listeners}
    >
      <span className="queue-num">{n}</span>
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
