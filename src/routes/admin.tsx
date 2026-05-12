import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import { reset, useStore } from "@/lib/festa-store";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — FestaCash" },
      { name: "description", content: "Painel administrativo do organizador: vendas em tempo real, barracas, produtos e relatórios." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const s = useStore();

  const totalConsumed = s.sales.reduce((acc, x) => acc + x.price, 0);
  const totalSold = s.user.balance + totalConsumed; // mocked: créditos vendidos
  const byBarraca = Object.entries(
    s.sales.reduce<Record<string, number>>((acc, sale) => {
      acc[sale.barraca] = (acc[sale.barraca] || 0) + sale.price;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const byProduct = Object.entries(
    s.sales.reduce<Record<string, number>>((acc, sale) => {
      acc[sale.product] = (acc[sale.product] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 6);

  const colors = ["oklch(0.62 0.21 35)", "oklch(0.82 0.18 88)", "oklch(0.55 0.16 145)", "oklch(0.45 0.18 25)", "oklch(0.7 0.13 60)"];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Bunting />

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Painel do organizador</div>
            <h1 className="font-serif text-4xl">{s.event.name}</h1>
            <p className="text-sm text-muted-foreground">{s.event.org} · {s.event.date}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold">Resetar demo</button>
            <button className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">Exportar relatório</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Créditos vendidos" value={`R$ ${totalSold}`} hint="hoje" tone="primary" />
          <Kpi label="Consumido" value={`R$ ${totalConsumed}`} hint={`${s.sales.length} vendas`} />
          <Kpi label="Saldo em circulação" value={`R$ ${s.user.balance}`} hint="ainda não gasto" />
          <Kpi label="Ticket médio" value={`R$ ${s.sales.length ? Math.round(totalConsumed / s.sales.length) : 0}`} />
        </div>

        {/* Faturamento — split Mercado Pago */}
        {(() => {
          const fee = s.platformFee ?? 0.02;
          const platformCut = Math.round(totalSold * fee * 100) / 100;
          const yourCut = Math.round((totalSold - platformCut) * 100) / 100;
          return (
            <div className="mt-6 rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-serif text-2xl">Faturamento da festa</h2>
                  <p className="text-sm text-muted-foreground">Cada compra de crédito é dividida automaticamente via Mercado Pago. Você não precisa fazer nada.</p>
                </div>
                <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">✓ Split ativo</span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-secondary p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bruto vendido</div>
                  <div className="font-display text-3xl mt-1">R$ {totalSold.toLocaleString("pt-BR")}</div>
                </div>
                <div className="rounded-2xl bg-muted p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa FestaCash ({(fee * 100).toFixed(1)}%)</div>
                  <div className="font-display text-3xl mt-1">− R$ {platformCut.toLocaleString("pt-BR")}</div>
                </div>
                <div className="rounded-2xl bg-success/15 p-5 ring-2 ring-success/30">
                  <div className="text-xs font-semibold uppercase tracking-wider text-success">Vai pra sua conta</div>
                  <div className="font-display text-3xl mt-1 text-success">R$ {yourCut.toLocaleString("pt-BR")}</div>
                  <div className="text-xs text-muted-foreground mt-1">Mercado Pago · CNPJ ****/0001-23</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Charts */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-serif text-2xl">Vendas por barraca</h2>
            <div className="mt-4 h-72">
              {byBarraca.length === 0 ? (
                <Empty msg="Sem vendas ainda. Abra /barraca e cobre alguns produtos." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byBarraca}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.86 0.04 70)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {byBarraca.map((_, i) => (<Cell key={i} fill={colors[i % colors.length]} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-serif text-2xl">Top produtos</h2>
            <div className="mt-4 h-72">
              {byProduct.length === 0 ? (
                <Empty msg="Em breve, os campeões da festa." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byProduct} dataKey="qty" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                      {byProduct.map((_, i) => (<Cell key={i} fill={colors[i % colors.length]} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {byProduct.map((p, i) => (
                <li key={p.name} className="flex justify-between">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: colors[i % colors.length] }} /> {p.name}</span>
                  <span className="font-semibold">{p.qty}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sales feed */}
        <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Vendas em tempo real</h2>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-success" /> ao vivo</span>
          </div>
          {s.sales.length === 0 ? (
            <Empty msg="Nenhuma venda ainda." />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2">Hora</th><th>Cliente</th><th>Barraca</th><th>Produto</th><th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {s.sales.map((sale) => (
                    <tr key={sale.id} className="border-t border-border">
                      <td className="py-2.5">{new Date(sale.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>{sale.user}</td>
                      <td>{sale.barraca}</td>
                      <td>{sale.product}</td>
                      <td className="text-right font-display text-primary">R${sale.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-serif text-2xl">Pagamentos</h2>
            <p className="text-sm text-muted-foreground">O dinheiro cai direto na sua conta. A FestaCash não custodia valores.</p>
            <div className="mt-4 space-y-2">
              {[["Mercado Pago", "conectado"], ["Pix", "conectado"], ["Stripe", "configurar"]].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm">
                  <span className="font-semibold">{k}</span>
                  <span className={`text-xs font-semibold ${v === "conectado" ? "text-success" : "text-muted-foreground"}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-serif text-2xl">Saldo restante ao fim do evento</h2>
            <p className="text-sm text-muted-foreground">Defina o que acontece com o crédito não usado.</p>
            <div className="mt-4 space-y-2 text-sm">
              {["Expira ao fim do evento", "Permitir transferência entre clientes", "Permitir doação para causa do evento", "Reembolso manual pelo organizador"].map((opt, i) => (
                <label key={opt} className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
                  <input type="checkbox" defaultChecked={i < 3} className="h-4 w-4 accent-[oklch(0.62_0.21_35)]" />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "primary" }) {
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-soft ${tone === "primary" ? "border-foreground bg-accent" : "border-border bg-card"}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="grid h-full place-items-center text-sm text-muted-foreground">{msg}</div>;
}
