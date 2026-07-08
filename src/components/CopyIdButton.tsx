"use client";

import { useRef, useState } from "react";
import { toast } from "./Toaster";
import type { Task } from "@/lib/types";

/** Copia el ID de la tarea: el de Linear (GTM-XXX) si está enlazada, si no el UUID. */
export function CopyIdButton({ task }: { task: Task }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = task.linear_id ?? task.id;

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
        toast("ID copiado", { description: id, variant: "success" });
      })
      .catch(() => toast("No se pudo copiar el ID", { variant: "error" }));
  }

  return (
    <button
      className={`icon-btn copy-id ${copied ? "copied" : ""}`}
      onClick={copy}
      title={copied ? "Copiado" : `Copiar ID (${id})`}
      aria-label="Copiar ID de la tarea"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5v-2A1.5 1.5 0 0 0 9 2H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 10h1.5" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-6.5" />
    </svg>
  );
}
