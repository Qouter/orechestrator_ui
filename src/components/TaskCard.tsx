"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ComplexityBadge } from "./ComplexityBadge";
import {
  PRIORITY_LABEL,
  PROGRESS_LABEL,
  type Progress,
  type Task,
} from "@/lib/types";

const PROGRESS_VAR: Record<Progress, string> = {
  por_empezar: "--pg-empezar",
  en_curso: "--pg-curso",
  en_revision: "--pg-revision",
  hecho: "--pg-hecho",
};

export function TaskCard({
  task,
  onOpen,
  onQueue,
  queued,
}: {
  task: Task;
  onOpen: (t: Task) => void;
  onQueue: (t: Task) => void;
  queued: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", phase: task.phase } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? "dragging" : ""}`}
      onClick={() => onOpen(task)}
    >
      <div className="card-top">
        <button
          className="card-grip"
          aria-label="Arrastrar tarea"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripIcon />
        </button>
        <div className="card-title">{task.title}</div>
        {task.complexity && <ComplexityBadge value={task.complexity} />}
      </div>

      {task.note && <p className="card-note">{task.note}</p>}

      <div className="card-meta">
        <span
          className="chip chip-progress"
          style={{ ["--pgc" as string]: `var(${PROGRESS_VAR[task.progress]})` }}
        >
          <span className="dot" />
          {PROGRESS_LABEL[task.progress]}
        </span>

        {task.priority !== "normal" && (
          <span
            className="chip chip-prio"
            style={{
              ["--prc" as string]:
                task.priority === "urgente"
                  ? "var(--prio-urgente)"
                  : "var(--prio-importante)",
            }}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>
        )}

        {task.linear_id && (
          <a
            className="linbadge"
            href={task.linear_url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            title={`Ver ${task.linear_id} en Linear`}
            onClick={(e) => e.stopPropagation()}
          >
            {task.linear_id}
          </a>
        )}

        {task.requested_by && (
          <span className="card-req">· {task.requested_by}</span>
        )}

        <button
          className="icon-btn card-queue"
          title={queued ? "Ya está en la cola" : "Añadir a la cola de implementación"}
          aria-label={queued ? "Ya está en la cola" : "Añadir a la cola"}
          disabled={queued}
          onClick={(e) => {
            e.stopPropagation();
            if (!queued) onQueue(task);
          }}
        >
          {queued ? <CheckIcon /> : <PlusIcon />}
        </button>
      </div>
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="4" r="1.3" />
      <circle cx="10" cy="4" r="1.3" />
      <circle cx="6" cy="8" r="1.3" />
      <circle cx="10" cy="8" r="1.3" />
      <circle cx="6" cy="12" r="1.3" />
      <circle cx="10" cy="12" r="1.3" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-6.5" />
    </svg>
  );
}
