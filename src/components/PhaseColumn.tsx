"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { PHASE_LABEL, type Phase, type Task } from "@/lib/types";

const PHASE_VAR: Record<Phase, string> = {
  ventas: "--ventas",
  onboarding: "--onboarding",
  retention: "--retention",
};

export function PhaseColumn({
  phase,
  tasks,
  queuedIds,
  onOpen,
  onQueue,
  onAdd,
}: {
  phase: Phase;
  tasks: Task[];
  queuedIds: Set<string>;
  onOpen: (t: Task) => void;
  onQueue: (t: Task) => void;
  onAdd: (phase: Phase) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: phase,
    data: { type: "column", phase },
  });

  return (
    <section
      ref={setNodeRef}
      className={`column ${isOver ? "is-over" : ""}`}
      style={{ ["--phase" as string]: `var(${PHASE_VAR[phase]})` }}
    >
      <header className="col-head">
        <span className="col-dot" />
        <h2 className="col-name">{PHASE_LABEL[phase]}</h2>
        <span className="col-count">{tasks.length}</span>
        <button
          className="btn btn-ghost col-add"
          onClick={() => onAdd(phase)}
        >
          + tarea
        </button>
      </header>

      <div className="col-body">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onOpen={onOpen}
              onQueue={onQueue}
              queued={queuedIds.has(t.id)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="col-empty">
            Sin tareas. Arrastra aquí o pulsa “+ tarea”.
          </div>
        )}
      </div>
    </section>
  );
}
