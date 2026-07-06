import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { Profile } from "@/lib/types";

export function Header({
  profile,
  active,
}: {
  profile: Profile | null;
  active: "board" | "blocks";
}) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="dots" aria-hidden="true">
          <span style={{ background: "var(--ventas)" }} />
          <span style={{ background: "var(--onboarding)" }} />
          <span style={{ background: "var(--retention)" }} />
        </span>
        Orchestrator
      </div>
      <nav className="topnav">
        <Link className={active === "board" ? "on" : ""} href="/">
          Tablero
        </Link>
        <Link className={active === "blocks" ? "on" : ""} href="/bloques">
          Bloques
        </Link>
      </nav>
      <div className="topbar-spacer" />
      <div className="user">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="user-avatar" src={profile.avatar_url} alt="" />
        ) : (
          <span className="user-avatar" />
        )}
        <span className="user-name">
          {profile?.name ?? profile?.email ?? "—"}
        </span>
        <form action={signOut}>
          <button className="btn btn-ghost" type="submit">
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
