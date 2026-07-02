# Orchestrator UI — Tablero GTM

Tablero de tareas del equipo GTM de HeyDiga, agrupadas por **fase de pipeline**
(Ventas · Onboarding · Retention) en tres columnas horizontales, con
complejidad/prioridad/progreso por tarea, una **cola de orden de implementación**
cross-fase, login con **Slack** e **historial de cambios** (quién cambió qué).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 ·
Supabase (Postgres + Auth) · dnd-kit. Diseño con el skill **impeccable**
(ver `PRODUCT.md` y `DESIGN.md`).

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. SQL Editor → pega y ejecuta `supabase/migrations/0001_init.sql`
   (enums, tablas `profiles`/`tasks`/`impl_queue`/`task_activity`, RLS, triggers).
3. Settings → API: copia `Project URL`, `anon key` y `service_role key`.

### 2. Slack (login)
1. Crea una Slack app (api.slack.com/apps) con **Sign in with Slack** (OIDC).
   Scopes: `openid`, `email`, `profile`. Redirect URL:
   `https://TU-PROJECT.supabase.co/auth/v1/callback`.
2. En Supabase → Authentication → Providers → **Slack (OIDC)**: pega el
   Client ID / Secret de la Slack app y habilítalo.
3. Authentication → URL Configuration: añade tus Redirect URLs
   (`http://localhost:3000/**` y la de Vercel).

> El acceso está restringido a correos `@heydiga.com` (en el callback y en las
> políticas RLS). El trigger `handle_new_user` vuelca nombre/email/avatar de
> Slack a `profiles`.

### 3. Entorno
Copia `.env.example` a `.env.local` y rellena:
```
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…      # solo servidor
```

### 4. Seed inicial (opcional)
Vuelca las tareas curadas de `../.claude/roadmap.yaml`:
```bash
npx tsx scripts/seed.ts
```
(Se insertan en fase `ventas`; recolócalas arrastrando.)

### 5. Desarrollo
```bash
npm install
npm run dev        # http://localhost:3000
```

## Despliegue (Vercel)
1. Importa el repo en Vercel (root: `orchestrator_ui`).
2. Env vars: las tres de `.env.local`.
3. Añade el dominio de Vercel a los Redirect URLs de Slack y Supabase.

## Modelo de datos
- **tasks**: título, nota, `phase`, `progress`, `priority`, `complexity` (S/M/L/XL),
  `requested_by`, `position` (orden), `created_by`/`updated_by`.
- **impl_queue**: cola de implementación (una fila por tarea encolada, `position`).
- **task_activity**: auditoría inmutable (actor + acción + diff) por cada cambio.
- **profiles**: espejo de `auth.users` con datos de Slack.

## Diseño
`PRODUCT.md` (estrategia) y `DESIGN.md` (sistema visual) los mantiene el flujo de
[impeccable](https://impeccable.style). El hook de detección corre en cada edición
de UI; `npx impeccable detect src` como gate. `legacy/roadmap.html` es la versión
estática anterior (referencia).
