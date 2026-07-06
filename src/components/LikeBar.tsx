"use client";

import type { Profile } from "@/lib/types";

/** Barra de "like" a nivel de sección: corazón + contador + miniaturas de quién dio
 *  like (nombres al pasar por encima). Usada en la cola y en la vista de bloques. */
export function LikeBar({
  likers,
  likedByMe,
  onToggle,
  label = "esto",
}: {
  likers: Profile[];
  likedByMe: boolean;
  onToggle: () => void;
  label?: string;
}) {
  const names = likers.map((p) => p.name ?? p.email ?? "—").join(", ");
  return (
    <div className="like-bar">
      <button
        className={`like-btn ${likedByMe ? "on" : ""}`}
        onClick={onToggle}
        aria-pressed={likedByMe}
        aria-label={likedByMe ? "Quitar tu like" : `Dar like a ${label}`}
      >
        <HeartIcon filled={likedByMe} />
        {likers.length > 0 && (
          <span className="like-count">{likers.length}</span>
        )}
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
