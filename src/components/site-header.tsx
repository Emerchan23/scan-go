import { Link, useLocation } from "@tanstack/react-router";

const items = [
  { to: "/", label: "Início" },
  { to: "/cliente", label: "Cliente" },
  { to: "/barraca", label: "Barraca" },
  { to: "/admin", label: "Admin" },
];

export function SiteHeader() {
  const loc = useLocation();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg shadow-pop">F</span>
          <span className="font-display text-xl tracking-wide">FestaCash</span>
        </Link>
        <nav className="hidden gap-1 md:flex">
          {items.map((it) => {
            const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
        <Link to="/cliente" className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90">
          Comprar créditos
        </Link>
      </div>
    </header>
  );
}
