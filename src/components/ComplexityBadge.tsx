import type { Complexity } from "@/lib/types";

const LEVEL: Record<Complexity, number> = { S: 1, M: 2, L: 3, XL: 4 };

/** Badge de complejidad: letra + barras crecientes (S→XL). Peso visual = esfuerzo. */
export function ComplexityBadge({ value }: { value: Complexity }) {
  const level = LEVEL[value];
  return (
    <span
      className={`cx cx-${value.toLowerCase()}`}
      title={`Complejidad ${value}`}
    >
      <span className="cx-bars" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <i
            key={i}
            className={i < level ? "on" : ""}
            style={{ height: `${40 + i * 20}%` }}
          />
        ))}
      </span>
      {value}
    </span>
  );
}
