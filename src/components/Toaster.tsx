"use client";

import { useEffect, useState } from "react";

export type ToastVariant = "default" | "success" | "error";

export interface ToastOptions {
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
  leaving?: boolean;
}

let counter = 0;
let listener: ((t: ToastItem) => void) | null = null;

/** API global estilo sonner: llamable desde cualquier componente cliente. */
export function toast(title: string, opts: ToastOptions = {}) {
  listener?.({
    id: ++counter,
    title,
    description: opts.description,
    variant: opts.variant ?? "default",
    duration: opts.duration ?? (opts.variant === "error" ? 5000 : 3200),
  });
}

const MAX_VISIBLE = 4;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  function dismiss(id: number) {
    setItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    setTimeout(
      () => setItems((prev) => prev.filter((t) => t.id !== id)),
      200,
    );
  }

  useEffect(() => {
    listener = (t) => {
      setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), t]);
      setTimeout(() => dismiss(t.id), t.duration);
    };
    return () => {
      listener = null;
    };
  }, []);

  return (
    <div className="toaster" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.variant} ${t.leaving ? "leaving" : ""}`}
          role="status"
        >
          {t.variant !== "default" && (
            <span className="toast-icon">
              {t.variant === "success" ? <SuccessIcon /> : <ErrorIcon />}
            </span>
          )}
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.description && <div className="toast-desc">{t.description}</div>}
          </div>
          <button
            className="toast-close"
            onClick={() => dismiss(t.id)}
            aria-label="Cerrar notificación"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function SuccessIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M5.5 8.2l1.8 1.8 3.2-3.6" />
    </svg>
  );
}
function ErrorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.8v3.8M8 11.2h.01" />
    </svg>
  );
}
