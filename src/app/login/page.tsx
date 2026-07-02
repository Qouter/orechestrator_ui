import { SlackButton } from "@/components/SlackButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const msg =
    error === "domain"
      ? "Necesitas un correo @heydiga.com para entrar."
      : error === "auth"
        ? "No se pudo iniciar sesión. Inténtalo otra vez."
        : null;

  return (
    <main className="login">
      <div className="login-col">
        <div className="login-dots" aria-hidden="true">
          <span style={{ background: "var(--ventas)" }} />
          <span style={{ background: "var(--onboarding)" }} />
          <span style={{ background: "var(--retention)" }} />
        </div>
        <div className="login-brand">Orchestrator</div>
        <h1 className="login-title">El tablero GTM del equipo</h1>
        <p className="login-sub">
          Tareas por fase de la pipeline —Ventas, Onboarding y Retention— con
          complejidad, prioridad y constancia de cada cambio.
        </p>
        <SlackButton />
        {msg && (
          <p className="login-error" role="alert">
            {msg}
          </p>
        )}
        <p className="login-foot">Acceso solo para el equipo de HeyDiga.</p>
      </div>
    </main>
  );
}
