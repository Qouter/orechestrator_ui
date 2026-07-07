"use client";

import { useTransition } from "react";
import { syncFromLinear } from "@/app/actions/linear";

export function SyncButton() {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-ghost"
      disabled={pending}
      title="Sincronizar estado desde Linear"
      onClick={() =>
        start(async () => {
          try {
            await syncFromLinear();
            window.location.reload();
          } catch {
            /* noop: probablemente falta LINEAR_API_KEY */
          }
        })
      }
    >
      {pending ? "Sincronizando…" : "Sync"}
    </button>
  );
}
