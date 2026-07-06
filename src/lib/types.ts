export type Phase = "ventas" | "onboarding" | "retention";
export type Progress = "por_empezar" | "en_curso" | "en_revision" | "hecho";
export type Priority = "urgente" | "importante" | "normal";
export type Complexity = "S" | "M" | "L" | "XL";

export const PHASES: Phase[] = ["ventas", "onboarding", "retention"];

export const PHASE_LABEL: Record<Phase, string> = {
  ventas: "Ventas",
  onboarding: "Onboarding",
  retention: "Retention",
};

export const PROGRESS_LABEL: Record<Progress, string> = {
  por_empezar: "Por empezar",
  en_curso: "En curso",
  en_revision: "En revisión",
  hecho: "Hecho",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgente: "Urgente",
  importante: "Importante",
  normal: "Normal",
};

export const COMPLEXITY_LABEL: Record<Complexity, string> = {
  S: "Sencilla",
  M: "Media",
  L: "Grande",
  XL: "Proyecto",
};

export interface Profile {
  id: string;
  slack_user_id: string | null;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface Task {
  id: string;
  title: string;
  note: string | null;
  phase: Phase;
  progress: Progress;
  priority: Priority;
  complexity: Complexity | null;
  requested_by: string | null;
  block_id: string | null;
  position: number;
  archived: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: string;
  name: string;
  color: string;
  description: string | null;
  position: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface QueueEntry {
  id: string;
  task_id: string;
  position: number;
  added_by: string | null;
  created_at: string;
  completed_at: string | null;
  archived_at: string | null;
}

export interface Activity {
  id: string;
  task_id: string | null;
  actor_id: string | null;
  action:
    | "create"
    | "update"
    | "move_phase"
    | "reorder"
    | "delete"
    | "queue_add"
    | "queue_remove"
    | "queue_complete"
    | "queue_archive"
    | "queue_restore";
  changes: Record<string, { from: unknown; to: unknown }> | null;
  created_at: string;
  actor?: Profile | null;
}
