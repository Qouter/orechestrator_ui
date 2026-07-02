# Design

> Sistema visual de Orchestrator UI (tablero GTM). Registro: **product**. Formato inspirado en la spec DESIGN.md. Todo el color en **OKLCH**.

## Scene & Theme

**Frase de escena:** un comercial y el responsable de ventas de HeyDiga, al escritorio en una oficina con luz de día, revisando y reordenando tareas del equipo entre llamada y llamada — modo trabajo, sesiones cortas y frecuentes a lo largo del día.

→ **Tema claro.** Uso diurno, prolongado y repetido en oficina; el claro cansa menos a esa luz y encaja con las referencias (Notion, Height). El dark-mode se descarta como default; podría existir como opción futura, no ahora.

**Estrategia de color: Restrained.** Superficie casi blanca neutra + un color de acento por rol. La **calidez** vive en el acento y la tipografía, **no** en el fondo (nada de cream/sand). El color hue lo llevan las **tres fases** de la pipeline, donde el color **significa** (etapa), no decora.

## Color (OKLCH)

Neutrales (superficie y texto):
- `--bg: oklch(0.994 0 0)` — casi blanco puro, sin tinte.
- `--surface: oklch(1 0 0)` — blanco de las tarjetas (resalta un pelo sobre bg).
- `--panel: oklch(0.975 0.003 60)` — neutro de las columnas (segunda capa, separa de la tarjeta).
- `--line: oklch(0.905 0.004 60)` — bordes.
- `--ink: oklch(0.24 0.008 50)` — texto principal (contraste ~15:1 sobre blanco). Warm near-black: aquí vive la calidez.
- `--ink-muted: oklch(0.46 0.010 50)` — texto secundario (≥4.5:1 sobre blanco).
- `--ink-faint: oklch(0.60 0.008 50)` — metadatos, solo sobre blanco y a ≥14px/bold.

Acción / marca (Restrained: primario near-black estilo Notion/Height; el hue lo llevan las fases):
- `--primary: oklch(0.24 0.008 50)` — botón primario near-black, texto blanco.
- `--focus: oklch(0.58 0.085 185)` — anillo de foco teal (semilla de marca), calmado.
- `--selected: color-mix(...)` — tinte del acento de fase al 10–14%.

Fases (semánticas — el color = etapa de la pipeline; recorrido cálido→frío):
- `--ventas: oklch(0.63 0.16 33)` — coral cálido (arranque del funnel).
- `--onboarding: oklch(0.58 0.085 185)` — teal (la semilla; "asentarse").
- `--retention: oklch(0.52 0.12 295)` — índigo/violeta (largo plazo, profundidad).
Uso: punto/heading de la columna + tinte de fondo de columna ≤4% chroma. **Nunca como franja lateral.**

Complejidad (badge — peso visual creciente S→XL, el color = esfuerzo):
- `S: oklch(0.62 0.09 150)` verde · `M: oklch(0.60 0.11 240)` azul · `L: oklch(0.68 0.14 65)` ámbar · `XL: oklch(0.57 0.17 25)` rojo.

Prioridad: `urgente: oklch(0.57 0.17 25)` rojo · `importante: oklch(0.70 0.13 70)` ámbar · `normal`: sin chip (neutro).

Progreso: `por_empezar` neutro · `en_curso: var(--onboarding)` teal · `en_revision: oklch(0.55 0.11 285)` · `hecho: oklch(0.62 0.09 150)` verde.

Estados semánticos estandarizados: default · hover (superficie +2% oscura) · focus (anillo `--focus` 2px) · active · disabled (opacidad 0.5, sin color saturado) · selected (tinte de fase).

## Typography

Una sola familia humanista y cálida: **Hanken Grotesk** (vía `next/font`), fallback `system-ui`. Nada de emparejar dos sans; peso hace el contraste. `tabular-nums` para contadores. Sin display/mono aparte.
- Escala fija en rem, ratio ~1.2: `--t-xs:0.75rem · --t-sm:0.8125rem · --t-base:0.875rem · --t-md:0.9375rem · --t-lg:1.0625rem · --t-xl:1.375rem · --t-2xl:1.75rem`.
- H1 de página modesto (~1.75rem), no clamp gigante. `text-wrap: balance` en títulos, `pretty` en notas largas. Line-length de nota ≤72ch.
- Pesos: 400 body, 500 labels, 600 títulos/acciones.

## Spacing & Layout

- Escala base 4px: 4·8·12·16·24·32·48. Ritmo variado, no uniforme.
- **Board**: `flex` horizontal de 3 columnas (Ventas·Onboarding·Retention). Las columnas **no son cards** — son columnas con cabecera y fondo `--panel`. Las **tareas sí** son cards (afordancia de arrastre). Sin cards anidadas.
- Cola "Orden de implementación": panel lateral (aside) sticky.
- Responsive: <900px las columnas pasan a scroll horizontal o stack; estructural, no tipografía fluida.
- z-index semántico: `--z-dropdown:10 · --z-sticky:20 · --z-drawer-backdrop:30 · --z-drawer:40 · --z-toast:50 · --z-tooltip:60`.

## Components

- Radios: card 12px · input/botón 10px · pill/badge 999px. (Nunca 24/32px.)
- Tarjeta de tarea: fondo `--surface`, **borde 1px `--line` O sombra suave ≤8px, no ambos**. Título (500), nota truncada 2 líneas, fila de badges (Complejidad prominente + Progreso + Prioridad), handle de drag visible en hover/foco. Sin franja lateral de acento.
- Badge de Complejidad: pill sólida con letra S/M/L/XL en 600 y color propio; peso/tamaño creciente S→XL para que "se vea claro".
- Botones: primario near-black; secundario borde 1px; ghost. Todos con default/hover/focus/active/disabled.
- Drawer de tarea: `<dialog>`/panel fijo (no absolute dentro de overflow). Form + historial de actividad (avatar+nombre+fecha).
- Estados vacíos que enseñan ("Arrastra una tarea aquí…"), skeletons en carga (no spinners centrales).

## Motion

- 150–250ms, ease-out exponencial. Solo comunica estado (drag, entrada de card, cambio de fase, toast). Sin coreografías de carga.
- dnd-kit: transición de transform al reordenar/soltar; entrada de card nueva con fade+rise corto.
- `@media (prefers-reduced-motion: reduce)`: crossfade/instantáneo en todo.

## Anti-slop guardrails (de PRODUCT.md)

Sin: franjas de acento laterales, gradient-text, glassmorphism decorativo, cards idénticas en grid, eyebrows en mayúsculas, hero-métrica, fondos de rejilla/rayas, over-rounding, borde+sombra grande juntos. No parecer SaaS-IA, ni Jira, ni Trello de juguete.
