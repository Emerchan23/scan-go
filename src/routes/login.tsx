import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import { login, useStore } from "@/lib/festa-store";
import { LogIn, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — FestaCash" },
      { name: "description", content: "Acesso da equipe do evento: Admin, Caixa e Barraca." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const s = useStore();
  const nav = useNavigate();
  const [staffId, setStaffId] = useState<string>(s.staff[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    setErr(null);
    try {
      const u = login(staffId, pin);
      const role = s.roles.find((r) => r.id === u.roleId);
      const goto =
        role?.permissions.includes("admin.full") ? "/admin"
        : role?.permissions.includes("caixa.issue") ? "/caixa"
        : "/barraca";
      nav({ to: goto });
    } catch (e: any) { setErr(e?.message ?? "Erro"); }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Bunting />
      <main className="mx-auto grid max-w-md gap-6 px-5 py-10">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-pop">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-3 font-serif text-3xl">Entrar na operação</h1>
          <p className="text-sm text-muted-foreground">Selecione seu perfil e digite o PIN de 4 dígitos.</p>
        </div>

        <section className="rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Usuário</label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"
          >
            {s.staff.filter((u) => u.active).map((u) => {
              const r = s.roles.find((x) => x.id === u.roleId);
              return <option key={u.id} value={u.id}>{u.name} — {r?.name ?? "?"}</option>;
            })}
          </select>

          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PIN</label>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-center font-display text-3xl tracking-[0.5em]"
          />

          {err && <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}

          <button
            onClick={submit}
            disabled={pin.length !== 4}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-pop disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" /> Entrar
          </button>

          <details className="mt-4 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-xs">
            <summary className="cursor-pointer font-semibold">PINs de demonstração</summary>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {s.staff.map((u) => (
                <li key={u.id} className="flex justify-between font-mono">
                  <span>{u.name}</span><span>{u.pin}</span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      </main>
    </div>
  );
}
