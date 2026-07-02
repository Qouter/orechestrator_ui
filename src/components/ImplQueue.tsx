"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  likers,
  likedByMe,
  onToggleLike,
}: {
  rows: QueueRow[];
  onRemove: (entry: QueueEntry) => void;
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

      <LikeBar likers={likers} likedByMe={likedByMe} onToggle={onToggleLike} />
    </aside>
  );
}

function LikeBar({
  likers,
  likedByMe,
  onToggle,
}: {
  likers: Profile[];
  likedByMe: boolean;
  onToggle: () => void;
}) {
  const names = likers.map((p) => p.name ?? p.email ?? "—").join(", ");
  return (
    <div className="like-bar">
      <button
        className={`like-btn ${likedByMe ? "on" : ""}`}
        onClick={onToggle}
        aria-pressed={likedByMe}
        aria-label={likedByMe ? "Quitar tu like" : "Dar like al orden"}
      >
        <HeartIcon filled={likedByMe} />
        {likers.length > 0 && <span className="like-count">{likers.length}</span>}
      </button>

      {likers.length > 0 && (
        <div className="likers" data-names={names}>
          {likers.map((p) =>
            p.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                className="liker-av"
                src={p.avatar_url}
                alt={p.name ?? ""}
              />
            ) : (
              <span key={p.id} className="liker-av liker-fallback">
                {(p.name ?? p.email ?? "?").charAt(0).toUpperCase()}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M8 13.5C8 13.5 2 10 2 5.75 2 3.9 3.4 2.5 5.1 2.5c1 0 1.9.5 2.4 1.3l.5.8.5-.8c.5-.8 1.4-1.3 2.4-1.3 1.7 0 3.1 1.4 3.1 3.25C14 10 8 13.5 8 13.5z" />
    </svg>
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
