import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import {
  hasPermission,
  removeRole,
  removeStaff,
  upsertRole,
  upsertStaff,
  useStore,
  type Permission,
  type Role,
  type Staff,
} from "@/lib/festa-store";
import { ShieldAlert, Trash2, UserPlus, KeyRound } from "lucide-react";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e perfis — FestaCash" },
      { name: "description", content: "Cadastre equipe e crie perfis customizáveis com permissões granulares." },
    ],
  }),
  component: UsuariosPage,
});

const PERM_GROUPS: { label: string; perms: { p: Permission; label: string; hint?: string }[] }[] = [
  {
    label: "Administração",
    perms: [
      { p: "admin.full", label: "Acesso total (super admin)", hint: "Ignora todas as outras checagens" },
      { p: "users.manage", label: "Gerenciar usuários e perfis" },
      { p: "split.manage", label: "Configurar conta de split" },
      { p: "policy.manage", label: "Política de saldo / reembolso" },
    ],
  },
  {
    label: "Catálogo & Barracas",
    perms: [
      { p: "catalog.manage", label: "Gerenciar catálogo de produtos" },
      { p: "barracas.manage", label: "Gerenciar barracas" },
    ],
  },
  {
    label: "Caixa / Bilheteria",
    perms: [
      { p: "caixa.issue", label: "Emitir fichas (carteira offline)" },
      { p: "caixa.search_orders", label: "Buscar pedidos / vendas" },
    ],
  },
  {
    label: "Reembolsos",
    perms: [
      { p: "refund.execute", label: "Executar estorno direto", hint: "Devolve saldo na hora" },
      { p: "refund.request", label: "Abrir solicitação para o Admin", hint: "Vai pra fila de aprovação" },
      { p: "refund.approve", label: "Aprovar/negar solicitações" },
    ],
  },
  {
    label: "PDV de Barraca",
    perms: [{ p: "barraca.charge", label: "Operar barraca (cobrar produtos)" }],
  },
];

function UsuariosPage() {
  const s = useStore();
  const allowed = hasPermission("users.manage");

  if (!allowed) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-md px-5 py-16 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-warning" />
          <h1 className="mt-3 font-serif text-2xl">Acesso restrito</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta área é só para perfis com permissão <code>users.manage</code>.
          </p>
          <Link to="/login" className="mt-5 inline-flex rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background">Entrar como Admin</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Bunting />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Configuração</div>
          <h1 className="font-serif text-4xl">Usuários e perfis</h1>
          <p className="text-sm text-muted-foreground">
            Crie perfis customizáveis combinando permissões e atribua às pessoas da equipe.
          </p>
        </div>

        <RolesSection />
        <StaffSection />
      </main>
    </div>
  );
}

/* --------------------------------- Roles -------------------------------- */

function RolesSection() {
  const s = useStore();
  const [editing, setEditing] = useState<Role | null>(null);

  const blank = (): Role => ({
    id: "role_" + Math.random().toString(36).slice(2, 8),
    name: "",
    description: "",
    permissions: [],
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl">Perfis</h2>
          <p className="text-sm text-muted-foreground">Combine permissões — ex.: "Caixa Sênior" pode estornar direto, "Caixa" só solicita.</p>
        </div>
        <button
          onClick={() => setEditing(blank())}
          className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
        >
          + Novo perfil
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {s.roles.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg">{r.name}</span>
                  {r.builtIn && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">padrão</span>}
                </div>
                {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(r)} className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold">Editar</button>
                {!r.builtIn && (
                  <button
                    onClick={() => { try { removeRole(r.id); } catch (e: any) { alert(e.message); } }}
                    className="rounded-full border border-destructive/40 px-2 py-1 text-destructive"
                    title="Remover"
                  ><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {r.permissions.length === 0
                ? <span className="text-[11px] text-muted-foreground">Sem permissões</span>
                : r.permissions.map((p) => (
                    <span key={p} className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px]">{p}</span>
                  ))}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <RoleDialog
          role={editing}
          onClose={() => setEditing(null)}
          onSave={(r) => { upsertRole(r); setEditing(null); }}
        />
      )}
    </section>
  );
}

function RoleDialog({ role, onClose, onSave }: { role: Role; onClose: () => void; onSave: (r: Role) => void }) {
  const [r, setR] = useState<Role>(role);
  const toggle = (p: Permission, on: boolean) => {
    setR((prev) => ({
      ...prev,
      permissions: on ? Array.from(new Set([...prev.permissions, p])) : prev.permissions.filter((x) => x !== p),
    }));
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl">{role.name ? `Editar ${role.name}` : "Novo perfil"}</h3>
          <button onClick={onClose} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Fechar</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome</span>
            <input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</span>
            <input value={r.description ?? ""} onChange={(e) => setR({ ...r, description: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="mt-5 space-y-4">
          {PERM_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</div>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {g.perms.map((perm) => {
                  const on = r.permissions.includes(perm.p);
                  return (
                    <label key={perm.p} className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs cursor-pointer ${on ? "border-foreground bg-accent/40" : "border-border bg-background"}`}>
                      <input type="checkbox" checked={on} onChange={(e) => toggle(perm.p, e.target.checked)} className="mt-0.5" />
                      <div>
                        <div className="font-semibold">{perm.label}</div>
                        {perm.hint && <div className="text-[10px] text-muted-foreground">{perm.hint}</div>}
                        <div className="font-mono text-[10px] text-muted-foreground">{perm.p}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">Cancelar</button>
          <button
            onClick={() => { if (!r.name.trim()) return alert("Nome obrigatório"); onSave(r); }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-pop"
          >Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Staff -------------------------------- */

function StaffSection() {
  const s = useStore();
  const [editing, setEditing] = useState<Staff | null>(null);

  const blank = (): Staff => ({
    id: "staff_" + Math.random().toString(36).slice(2, 8),
    name: "",
    pin: "",
    roleId: s.roles[0]?.id ?? "",
    active: true,
    createdAt: Date.now(),
  });

  const roleName = useMemo(() => Object.fromEntries(s.roles.map((r) => [r.id, r.name])), [s.roles]);

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl">Equipe</h2>
          <p className="text-sm text-muted-foreground">Cada pessoa entra com PIN próprio. Desative para bloquear acesso sem perder histórico.</p>
        </div>
        <button onClick={() => setEditing(blank())} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
          <UserPlus className="h-4 w-4" /> Novo usuário
        </button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="py-2">Nome</th><th>Perfil</th><th>PIN</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {s.staff.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="py-2.5 font-semibold">{u.name}</td>
                <td>{roleName[u.roleId] ?? <span className="text-destructive">perfil removido</span>}</td>
                <td className="font-mono">••••</td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${u.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {u.active ? "ativo" : "bloqueado"}
                  </span>
                </td>
                <td className="text-right">
                  <button onClick={() => setEditing(u)} className="mr-1 rounded-full border border-border px-3 py-1 text-[11px] font-semibold">Editar</button>
                  <button onClick={() => { if (confirm(`Remover ${u.name}?`)) removeStaff(u.id); }} className="rounded-full border border-destructive/40 px-2 py-1 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <StaffDialog
          staff={editing}
          onClose={() => setEditing(null)}
          onSave={(u) => { try { upsertStaff(u); setEditing(null); } catch (e: any) { alert(e.message); } }}
        />
      )}
    </section>
  );
}

function StaffDialog({ staff, onClose, onSave }: { staff: Staff; onClose: () => void; onSave: (u: Staff) => void }) {
  const s = useStore();
  const [u, setU] = useState<Staff>(staff);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
        <h3 className="font-serif text-2xl">{staff.name ? "Editar usuário" : "Novo usuário"}</h3>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome</span>
            <input value={u.name} onChange={(e) => setU({ ...u, name: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Perfil</span>
            <select value={u.roleId} onChange={(e) => setU({ ...u, roleId: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              {s.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PIN (4 dígitos)</span>
            <div className="mt-1 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <input value={u.pin} onChange={(e) => setU({ ...u, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-center font-mono text-lg tracking-[0.4em]" />
            </div>
          </label>
          <label className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm">
            <input type="checkbox" checked={u.active} onChange={(e) => setU({ ...u, active: e.target.checked })} />
            Usuário ativo (pode fazer login)
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={() => onSave(u)} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-pop">Salvar</button>
        </div>
      </div>
    </div>
  );
}
