"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createBlock,
  deleteBlock,
  updateBlock,
} from "@/app/actions/blocks";
import type { Block } from "@/lib/types";

const COLORS = [
  "#5b8cff", "#25d366", "#ff9f43", "#c084fc", "#f472b6",
  "#2dd4bf", "#a78bfa", "#38bdf8", "#e879f9", "#94a3b8",
];

type Mode = { kind: "new" } | { kind: "edit"; block: Block };

export function BlockEditor({
  mode,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: Mode;
  onClose: () => void;
  onSaved: (b: Block) => void;
  onDeleted: (id: string) => void;
}) {
  const editing = mode.kind === "edit" ? mode.block : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState(editing?.color ?? COLORS[0]);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [pending, start] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    if (!name.trim()) return;
    start(async () => {
      const saved = editing
        ? await updateBlock(editing.id, { name, color, description })
        : await createBlock({ name, color, description });
      onSaved(saved);
    });
  }

  function remove() {
    if (!editing) return;
    if (!confirm("¿Borrar este bloque? Sus tareas quedarán sin bloque.")) return;
    start(async () => {
      await deleteBlock(editing.id);
      onDeleted(editing.id);
    });
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label={editing ? "Editar bloque" : "Nuevo bloque"}>
        <div className="drawer-head">
          <h2>{editing ? "Editar bloque" : "Nuevo bloque"}</h2>
          <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="Cerrar">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>

        <div className="drawer-body">
          <div className="field">
            <label htmlFor="b-name">Nombre</label>
            <input
              id="b-name"
              className="input"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="CRM core, Billing / Stripe…"
            />
          </div>

          <div className="field">
            <label>Color</label>
            <div className="swatches">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch ${c === color ? "on" : ""}`}
                  style={{ background: c }}
                  aria-label={c}
                  aria-pressed={c === color}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="b-desc">Descripción</label>
            <textarea
              id="b-desc"
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qué agrupa este bloque"
            />
          </div>
        </div>

        <div className="drawer-actions">
          <button className="btn btn-primary" onClick={save} disabled={pending || !name.trim()}>
            {pending ? "Guardando…" : editing ? "Guardar" : "Crear bloque"}
          </button>
          <button className="btn btn-secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          {editing && (
            <button
              className="btn btn-ghost"
              style={{ marginLeft: "auto", color: "var(--prio-urgente)" }}
              onClick={remove}
              disabled={pending}
            >
              Borrar
            </button>
          )}
        </div>
      </div>
    </>
  );
}
