import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { setPlatformFee, useStore } from "@/lib/festa-store";

export const Route = createFileRoute("/owner")({
  head: () => ({
    meta: [
      { title: "Owner — FestaCash" },
      { name: "description", content: "Painel do dono do SaaS: clientes (escolas/igrejas), receita recorrente, planos e saúde da plataforma." },
    ],
  }),
  component: OwnerPage,
});

type Tenant = {
  id: string;
  name: string;
  type: "Escola" | "Igreja" | "Prefeitura" | "Empresa";
  city: string;
  plan: "Trial" | "Festa" | "Pro" | "Enterprise";
  mrr: number;
  events: number;
  gmv: number; // R$ processado por eles
  status: "Ativo" | "Trial" | "Inadimplente" | "Cancelado";
  since: string;
};

const TENANTS: Tenant[] = [
  { id: "t1", name: "Escola Sagrado Coração", type: "Escola", city: "Recife · PE", plan: "Pro", mrr: 199, events: 4, gmv: 84500, status: "Ativo", since: "Mar/24" },
  { id: "t2", name: "Paróquia São José", type: "Igreja", city: "Olinda · PE", plan: "Festa", mrr: 89, events: 2, gmv: 27300, status: "Ativo", since: "Mai/24" },
  { id: "t3", name: "Colégio Dom Bosco", type: "Escola", city: "Salvador · BA", plan: "Pro", mrr: 199, events: 3, gmv: 62100, status: "Ativo", since: "Fev/25" },
  { id: "t4", name: "Quermesse N.S. Aparecida", type: "Igreja", city: "São Paulo · SP", plan: "Festa", mrr: 89, events: 1, gmv: 18400, status: "Ativo", since: "Abr/25" },
  { id: "t5", name: "Prefeitura de Caruaru", type: "Prefeitura", city: "Caruaru · PE", plan: "Enterprise", mrr: 1490, events: 8, gmv: 412000, status: "Ativo", since: "Jan/24" },
  { id: "t6", name: "Escola Vila Nova", type: "Escola", city: "Curitiba · PR", plan: "Trial", mrr: 0, events: 1, gmv: 4200, status: "Trial", since: "Mai/26" },
  { id: "t7", name: "Festa do Peão Barretos", type: "Empresa", city: "Barretos · SP", plan: "Enterprise", mrr: 1490, events: 1, gmv: 980000, status: "Ativo", since: "Jun/24" },
  { id: "t8", name: "Centro Esp. Luz e Caridade", type: "Igreja", city: "BH · MG", plan: "Festa", mrr: 89, events: 1, gmv: 11800, status: "Inadimplente", since: "Set/24" },
  { id: "t9", name: "Escola Estrela do Sul", type: "Escola", city: "Fortaleza · CE", plan: "Festa", mrr: 89, events: 2, gmv: 22100, status: "Ativo", since: "Out/24" },
  { id: "t10", name: "Arraiá da Praça", type: "Empresa", city: "Natal · RN", plan: "Pro", mrr: 199, events: 2, gmv: 38900, status: "Cancelado", since: "Nov/24" },
];

const MRR_TREND = [
  { m: "Dez", mrr: 980 }, { m: "Jan", mrr: 1340 }, { m: "Fev", mrr: 1820 },
  { m: "Mar", mrr: 2210 }, { m: "Abr", mrr: 2780 }, { m: "Mai", mrr: 3812 },
];

const ACTIVITY = [
  { t: "agora há 2min", who: "Festa do Peão Barretos", msg: "processou R$ 12.480 em vendas" },
  { t: "há 18min", who: "Escola Vila Nova", msg: "iniciou trial — 1º evento criado" },
  { t: "há 1h", who: "Prefeitura de Caruaru", msg: "fez upgrade Pro → Enterprise" },
  { t: "há 3h", who: "Centro Esp. Luz e Caridade", msg: "fatura em atraso (3 dias)" },
  { t: "há 6h", who: "Paróquia São José", msg: "configurou Mercado Pago" },
];

function OwnerPage() {
  const [planFilter, setPlanFilter] = useState<string>("Todos");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  const totals = TENANTS.reduce(
    (acc, t) => ({
      mrr: acc.mrr + (t.status === "Ativo" ? t.mrr : 0),
      gmv: acc.gmv + t.gmv,
      events: acc.events + t.events,
      active: acc.active + (t.status === "Ativo" ? 1 : 0),
    }),
    { mrr: 0, gmv: 0, events: 0, active: 0 },
  );

  const take = 0.015; // 1,5% do GMV vai pra plataforma (mock)
  const platformFee = Math.round(totals.gmv * take);
  const arr = totals.mrr * 12;

  const filtered = TENANTS.filter((t) => (planFilter === "Todos" || t.plan === planFilter) && (statusFilter === "Todos" || t.status === statusFilter));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Bunting />

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <span className="grid h-5 w-5 place-items-center rounded bg-foreground text-background text-[10px] font-bold">FC</span>
              Painel do dono · plataforma
            </div>
            <h1 className="mt-1 font-serif text-4xl">Olá, Lucas 👋</h1>
            <p className="text-sm text-muted-foreground">Visão geral de todas as escolas, igrejas e eventos usando o FestaCash.</p>
          </div>
          <div className="flex gap-2">
            <select className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold">
              <option>Últimos 30 dias</option><option>Este mês</option><option>Este ano</option>
            </select>
            <button className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">+ Convidar cliente</button>
          </div>
        </div>

        {/* North-star KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="MRR" value={`R$ ${totals.mrr.toLocaleString("pt-BR")}`} delta="+18,4%" tone="primary" hint={`ARR: R$ ${arr.toLocaleString("pt-BR")}`} />
          <Kpi label="Clientes ativos" value={String(totals.active)} delta="+2" hint={`${TENANTS.length} no total`} />
          <Kpi label="GMV processado" value={`R$ ${(totals.gmv / 1000).toFixed(0)}k`} delta="+34%" hint="dinheiro que passou pelos eventos" />
          <Kpi label="Receita da plataforma" value={`R$ ${platformFee.toLocaleString("pt-BR")}`} delta="+22%" hint={`taxa de ${(take * 100).toFixed(1)}% sobre GMV`} />
        </div>

        {/* Charts row */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Crescimento de MRR</h2>
              <span className="text-xs text-success font-semibold">↑ 4× em 6 meses</span>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MRR_TREND} margin={{ left: -10, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.21 35)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="oklch(0.62 0.21 35)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.86 0.04 70)" />
                  <XAxis dataKey="m" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="mrr" stroke="oklch(0.62 0.21 35)" strokeWidth={3} fill="url(#mrrFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-serif text-2xl">Indicadores SaaS</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                ["Churn (mensal)", "1,8%", "success"],
                ["Trial → pago", "62%", "success"],
                ["LTV médio", "R$ 4.380", null],
                ["CAC estimado", "R$ 320", null],
                ["NPS", "72", "success"],
                ["Inadimplência", "R$ 89", "warn"],
              ].map(([k, v, tone]) => (
                <li key={k as string} className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
                  <span className="text-muted-foreground">{k}</span>
                  <span className={`font-display ${tone === "success" ? "text-success" : tone === "warn" ? "text-destructive" : ""}`}>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tenants table */}
        <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-serif text-2xl">Clientes da plataforma</h2>
            <div className="flex flex-wrap gap-2">
              <FilterChips label="Plano" value={planFilter} setValue={setPlanFilter} options={["Todos", "Trial", "Festa", "Pro", "Enterprise"]} />
              <FilterChips label="Status" value={statusFilter} setValue={setStatusFilter} options={["Todos", "Ativo", "Trial", "Inadimplente", "Cancelado"]} />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2">Cliente</th>
                  <th>Tipo</th>
                  <th>Plano</th>
                  <th>Eventos</th>
                  <th className="text-right">GMV</th>
                  <th className="text-right">MRR</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-border align-middle">
                    <td className="py-3">
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.city} · cliente desde {t.since}</div>
                    </td>
                    <td>{t.type}</td>
                    <td><PlanBadge plan={t.plan} /></td>
                    <td>{t.events}</td>
                    <td className="text-right">R$ {t.gmv.toLocaleString("pt-BR")}</td>
                    <td className="text-right font-display text-primary">R${t.mrr}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-right">
                      <button className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary">abrir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monetização & Split */}
        <SplitSection tenants={TENANTS} />

        {/* Bottom row: plans + activity + system health */}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-serif text-2xl">Planos</h2>
            <ul className="mt-4 space-y-3">
              {[
                { name: "Trial", price: "Grátis · 14 dias", note: "1 evento, até 100 clientes" },
                { name: "Festa", price: "R$ 89/mês", note: "1 evento ativo, ilimitado" },
                { name: "Pro", price: "R$ 199/mês", note: "Eventos ilimitados, multi-barraca" },
                { name: "Enterprise", price: "R$ 1.490/mês", note: "Suporte dedicado, white-label" },
              ].map((p) => (
                <li key={p.name} className="rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display">{p.name}</span>
                    <span className="text-sm font-semibold">{p.price}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.note}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-serif text-2xl">Atividade recente</h2>
            <ul className="mt-4 space-y-3">
              {ACTIVITY.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="text-sm">
                    <div><strong>{a.who}</strong> {a.msg}</div>
                    <div className="text-xs text-muted-foreground">{a.t}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-serif text-2xl">Saúde da plataforma</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                ["API uptime (30d)", "99,98%", "success"],
                ["Latência média", "182 ms", "success"],
                ["QR scans / min", "412", null],
                ["Webhooks Mercado Pago", "ok", "success"],
                ["Fila de e-mails", "0 atrasados", "success"],
                ["Erros últimas 24h", "3", "warn"],
              ].map(([k, v, tone]) => (
                <li key={k as string} className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
                  <span className="text-muted-foreground">{k}</span>
                  <span className={`font-semibold ${tone === "success" ? "text-success" : tone === "warn" ? "text-destructive" : ""}`}>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

function Kpi({ label, value, delta, hint, tone }: { label: string; value: string; delta?: string; hint?: string; tone?: "primary" }) {
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-soft ${tone === "primary" ? "border-foreground bg-accent" : "border-border bg-card"}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-3xl">{value}</span>
        {delta && <span className="text-xs font-semibold text-success">{delta}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function FilterChips({ label, value, setValue, options }: { label: string; value: string; setValue: (s: string) => void; options: string[] }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
      <span className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => setValue(o)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${value === o ? "bg-foreground text-background" : "text-foreground/70"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function PlanBadge({ plan }: { plan: Tenant["plan"] }) {
  const map: Record<Tenant["plan"], string> = {
    Trial: "bg-secondary text-foreground/70",
    Festa: "bg-corn/40 text-foreground",
    Pro: "bg-primary text-primary-foreground",
    Enterprise: "bg-foreground text-background",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[plan]}`}>{plan}</span>;
}

function StatusBadge({ status }: { status: Tenant["status"] }) {
  const map: Record<Tenant["status"], string> = {
    Ativo: "bg-success/15 text-success",
    Trial: "bg-accent/40 text-foreground",
    Inadimplente: "bg-destructive/15 text-destructive",
    Cancelado: "bg-muted text-muted-foreground line-through",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[status]}`}>{status}</span>;
}
