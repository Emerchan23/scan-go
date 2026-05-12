import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { applyStoredTheme, logout, setTheme, useStore } from "@/lib/festa-store";
import { LogOut, Moon, Sun } from "lucide-react";

const items = [
  { to: "/", label: "Início" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/cliente", label: "Cliente" },
  { to: "/barraca", label: "Barraca" },
  { to: "/caixa", label: "Caixa" },
  { to: "/admin", label: "Admin" },
  { to: "/usuarios", label: "Usuários", perm: "users.manage" as const },
  { to: "/folder", label: "Folders" },
];

export function SiteHeader() {
  const loc = useLocation();
  const nav = useNavigate();
  const s = useStore();
  const me = s.staff.find((x) => x.id === s.sessionStaffId) ?? null;
  const myRole = me ? s.roles.find((r) => r.id === me.roleId) : null;
  const myPerms = myRole?.permissions ?? [];
  const canSee = (p?: string) => !p || myPerms.includes("admin.full") || myPerms.includes(p as any);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg shadow-pop">F</span>
          <span className="font-display text-xl tracking-wide">FestaCash</span>
        </Link>
        <nav className="hidden gap-1 md:flex">
          {items.filter((it) => canSee(it.perm)).map((it) => {
            const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {me ? (
            <>
              <div className="hidden text-right text-xs leading-tight sm:block">
                <div className="font-semibold">{me.name}</div>
                <div className="text-muted-foreground">{myRole?.name}</div>
              </div>
              <button
                onClick={() => { logout(); nav({ to: "/login" }); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold"
                title="Sair"
              ><LogOut className="h-3.5 w-3.5" /> Sair</button>
            </>
          ) : (
            <Link to="/login" className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
