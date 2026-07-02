"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { queueRestore } from "@/app/actions/tasks";

export function HistoryRestore({ entryId }: { entryId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      className="btn btn-ghost hist-restore"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await queueRestore(entryId);
          router.refresh();
        })
      }
    >
      {pending ? "Restaurando…" : "Restaurar"}
    </button>
  );
}
