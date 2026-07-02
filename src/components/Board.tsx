"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { PhaseColumn } from "./PhaseColumn";
import { ImplQueue, type QueueRow } from "./ImplQueue";
import { TaskDrawer } from "./TaskDrawer";
import { ComplexityBadge } from "./ComplexityBadge";
import {
  moveTask,
  queueAdd,
  queueAdvance,
  queueRemove,
  queueReorder,
} from "@/app/actions/tasks";
import { toggleImplLike } from "@/app/actions/likes";
import {
  PHASES,
  type Phase,
  type Profile,
  type QueueEntry,
  type Task,
} from "@/lib/types";

type Board = Record<Phase, Task[]>;
type Mode = { kind: "new"; phase: Phase } | { kind: "edit"; task: Task };

function group(tasks: Task[]): Board {
  const b: Board = { ventas: [], onboarding: [], retention: [] };
  for (const t of tasks) b[t.phase].push(t);
  for (const p of PHASES) b[p].sort((a, b2) => a.position - b2.position);
  return b;
}

function midpoint(positions: number[], index: number): number {
  const prev = index - 1 >= 0 ? positions[index - 1] : null;
  const next = index + 1 < positions.length ? positions[index + 1] : null;
  if (prev == null && next == null) return 1000;
  if (prev == null) return (next as number) - 1000;
  if (next == null) return prev + 1000;
  return (prev + next) / 2;
}

const isQueueId = (id: string | number) =>
  id === "queue" || String(id).startsWith("q:");

/**
 * Colisión a medida:
 * - Arrastrando una tarea: la cola solo cuenta si el puntero está DENTRO de ella;
 *   si no, se ignora la cola y se resuelve entre columnas (así mover a Retention,
 *   pegada a la cola, funciona y no encola por accidente).
 * - Arrastrando un ítem de la cola: solo se consideran la cola y sus ítems.
 */
const collisionDetectionStrategy: CollisionDetection = (args) => {
  const activeId = String(args.active.id);

  if (activeId.startsWith("q:")) {
    return closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter((d) =>
        isQueueId(d.id),
      ),
    });
  }

  const within = pointerWithin(args);
  const queueHit = within.find((c) => isQueueId(c.id));
  if (queueHit) return [queueHit];

  return closestCorners({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (d) => !isQueueId(d.id),
    ),
  });
};

export function BoardView({
  initialTasks,
  initialQueue,
  initialLikers,
  currentUser,
}: {
  initialTasks: Task[];
  initialQueue: QueueEntry[];
  initialLikers: Profile[];
  currentUser: Profile | null;
}) {
  const [board, setBoard] = useState<Board>(() => group(initialTasks));
  const [queue, setQueue] = useState<QueueEntry[]>(() =>
    [...initialQueue].sort((a, b) => a.position - b.position),
  );
  const [likers, setLikers] = useState<Profile[]>(() => initialLikers);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Mode | null>(null);

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
    toggleImplLike().catch(() =>
      setLikers((prev) =>
        mine
          ? [...prev, currentUser]
          : prev.filter((p) => p.id !== currentUser.id),
      ),
    );
  }

  const boardRef = useRef(board);
  boardRef.current = board;
  const startPhase = useRef<Phase | null>(null);
  const activeType = useRef<"task" | "queue" | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = useMemo(() => {
    const m = new Map<string, Task>();
    for (const p of PHASES) for (const t of board[p]) m.set(t.id, t);
    return m;
  }, [board]);

  const queueRows: QueueRow[] = useMemo(
    () =>
      queue
        .map((entry) => {
          const task = byId.get(entry.task_id);
          return task ? { entry, task } : null;
        })
        .filter((r): r is QueueRow => r !== null),
    [queue, byId],
  );

  const queuedIds = useMemo(
    () => new Set(queue.map((e) => e.task_id)),
    [queue],
  );

  const activeTask = activeId ? byId.get(activeId) ?? null : null;

  function phaseOf(id: string): Phase | null {
    for (const p of PHASES)
      if (boardRef.current[p].some((t) => t.id === id)) return p;
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("q:")) {
      activeType.current = "queue";
      setActiveId(null);
    } else {
      activeType.current = "task";
      startPhase.current = phaseOf(id);
      setActiveId(id);
    }
  }

  function onDragOver(e: DragOverEvent) {
    if (activeType.current !== "task" || !e.over) return;
    const activeId = String(e.active.id);
    const overId = String(e.over.id);
    if (overId === "queue" || overId.startsWith("q:")) return;

    const from = phaseOf(activeId);
    const to = (PHASES as string[]).includes(overId)
      ? (overId as Phase)
      : phaseOf(overId);
    if (!from || !to || from === to) return;

    setBoard((prev) => {
      const fromArr = [...prev[from]];
      const idx = fromArr.findIndex((t) => t.id === activeId);
      if (idx < 0) return prev;
      const moved = { ...fromArr[idx], phase: to };
      fromArr.splice(idx, 1);
      const toArr = [...prev[to]];
      let insertAt = toArr.length;
      if (!(PHASES as string[]).includes(overId)) {
        const overIdx = toArr.findIndex((t) => t.id === overId);
        insertAt = overIdx < 0 ? toArr.length : overIdx;
      }
      toArr.splice(insertAt, 0, moved);
      return { ...prev, [from]: fromArr, [to]: toArr };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const aId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    const type = activeType.current;
    activeType.current = null;
    setActiveId(null);
    if (!overId) return;

    if (type === "queue") {
      const activeEntry = aId.slice(2);
      const overEntry = overId.startsWith("q:") ? overId.slice(2) : null;
      if (!overEntry || activeEntry === overEntry) return;
      setQueue((prev) => {
        const oldIndex = prev.findIndex((x) => x.id === activeEntry);
        const newIndex = prev.findIndex((x) => x.id === overEntry);
        if (oldIndex < 0 || newIndex < 0) return prev;
        const next = arrayMove(prev, oldIndex, newIndex);
        const pos = midpoint(next.map((x) => x.position), newIndex);
        next[newIndex] = { ...next[newIndex], position: pos };
        queueReorder(activeEntry, pos).catch(() => {});
        return next;
      });
      return;
    }

    // task
    if (overId === "queue" || overId.startsWith("q:")) {
      addToQueue(aId);
      return;
    }

    const phase = phaseOf(aId);
    if (!phase) return;
    const crossed = startPhase.current !== phase;

    setBoard((prev) => {
      const arr = [...prev[phase]];
      const oldIndex = arr.findIndex((t) => t.id === aId);
      if (oldIndex < 0) return prev;

      let index = oldIndex;
      if (!crossed) {
        const target = (PHASES as string[]).includes(overId)
          ? arr.length - 1
          : arr.findIndex((t) => t.id === overId);
        index = target < 0 ? oldIndex : target;
      }
      const nextArr = index === oldIndex ? arr : arrayMove(arr, oldIndex, index);
      const pos = midpoint(nextArr.map((t) => t.position), index);
      nextArr[index] = { ...nextArr[index], position: pos, phase };
      moveTask(aId, phase, pos).catch(() => {});
      return { ...prev, [phase]: nextArr };
    });
  }

  function addToQueue(taskId: string) {
    if (queuedIds.has(taskId)) return;
    const tmp: QueueEntry = {
      id: `tmp-${taskId}`,
      task_id: taskId,
      position: (queue.at(-1)?.position ?? 0) + 1000,
      added_by: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      archived_at: null,
    };
    setQueue((prev) => [...prev, tmp]);
    queueAdd(taskId)
      .then((real) =>
        setQueue((prev) =>
          prev.map((e) => (e.id === tmp.id ? (real as QueueEntry) : e)),
        ),
      )
      .catch(() => setQueue((prev) => prev.filter((e) => e.id !== tmp.id)));
  }

  function removeFromQueue(entry: QueueEntry) {
    setQueue((prev) => prev.filter((e) => e.id !== entry.id));
    if (!entry.id.startsWith("tmp-"))
      queueRemove(entry.id, entry.task_id).catch(() => {});
  }

  // 1er clic: completa (se queda tachada). 2º clic: pasa al historial
  // y la tarea desaparece del tablero.
  function advanceQueueItem(entry: QueueEntry) {
    if (!entry.completed_at) {
      setQueue((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, completed_at: new Date().toISOString() }
            : e,
        ),
      );
    } else {
      setQueue((prev) => prev.filter((e) => e.id !== entry.id));
      setBoard((prev) => {
        const next: Board = { ventas: [], onboarding: [], retention: [] };
        for (const p of PHASES)
          next[p] = prev[p].filter((t) => t.id !== entry.task_id);
        return next;
      });
    }
    if (!entry.id.startsWith("tmp-")) queueAdvance(entry.id).catch(() => {});
  }

  function upsertTask(task: Task) {
    setBoard((prev) => {
      const next: Board = { ventas: [], onboarding: [], retention: [] };
      for (const p of PHASES) next[p] = prev[p].filter((t) => t.id !== task.id);
      next[task.phase] = [...next[task.phase], task].sort(
        (a, b) => a.position - b.position,
      );
      return next;
    });
  }

  function removeTask(id: string) {
    setBoard((prev) => {
      const next: Board = { ventas: [], onboarding: [], retention: [] };
      for (const p of PHASES) next[p] = prev[p].filter((t) => t.id !== id);
      return next;
    });
    setQueue((prev) => prev.filter((e) => e.task_id !== id));
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="board-wrap">
          <div className="board">
            {PHASES.map((phase) => (
              <PhaseColumn
                key={phase}
                phase={phase}
                tasks={board[phase]}
                queuedIds={queuedIds}
                onOpen={(t) => setDrawer({ kind: "edit", task: t })}
                onQueue={(t) => addToQueue(t.id)}
                onAdd={(p) => setDrawer({ kind: "new", phase: p })}
              />
            ))}
          </div>
          <ImplQueue
            rows={queueRows}
            onRemove={removeFromQueue}
            onAdvance={advanceQueueItem}
            likers={likers}
            likedByMe={likedByMe}
            onToggleLike={toggleLike}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="card dragging">
              <div className="card-top">
                <span className="card-grip">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="6" cy="4" r="1.3" /><circle cx="10" cy="4" r="1.3" /><circle cx="6" cy="8" r="1.3" /><circle cx="10" cy="8" r="1.3" /><circle cx="6" cy="12" r="1.3" /><circle cx="10" cy="12" r="1.3" /></svg>
                </span>
                <div className="card-title">{activeTask.title}</div>
                {activeTask.complexity && (
                  <ComplexityBadge value={activeTask.complexity} />
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {drawer && (
        <TaskDrawer
          mode={drawer}
          onClose={() => setDrawer(null)}
          onSaved={upsertTask}
          onDeleted={removeTask}
        />
      )}
    </>
  );
}
