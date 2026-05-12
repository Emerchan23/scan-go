import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import { connectSplit, disconnectSplit, removeProduct, reset, setPolicy, upsertProduct, useStore, type Product, type ProductKind } from "@/lib/festa-store";
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
          const connected = s.split.status === "connected";
          return (
            <div className="mt-6 rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-serif text-2xl">Faturamento da festa</h2>
                  <p className="text-sm text-muted-foreground">Cada compra de crédito é dividida automaticamente via Mercado Pago. A FestaCash <span className="font-semibold">nunca toca no seu dinheiro</span> — ele cai direto na sua conta.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connected ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                  {connected ? "✓ Split ativo" : "⚠ Conectar conta"}
                </span>
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
                  <div className="text-xs font-semibold uppercase tracking-wider text-success">Cai na sua conta MP</div>
                  <div className="font-display text-3xl mt-1 text-success">R$ {yourCut.toLocaleString("pt-BR")}</div>
                  <div className="text-xs text-muted-foreground mt-1">{connected ? `${s.split.holder} · ${s.split.document}` : "Conecte sua conta abaixo"}</div>
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
          <PolicyCard />
        </div>
        <PolicyExplainer />

        {/* Catálogo / produtos */}
        <CatalogManager />
      </main>
    </div>
  );
}

function CatalogManager() {
  const s = useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const blank = (): Product => ({
    id: "p_" + Math.random().toString(36).slice(2, 8),
    name: "",
    price: 10,
    emoji: "🎪",
    barraca: "Geral",
    kind: "comida",
  });

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl">Catálogo do evento</h2>
          <p className="text-sm text-muted-foreground">Comidas, bebidas, doces e brinquedos. As fotos aparecem no <span className="font-semibold">/catalogo</span> e na barraca.</p>
        </div>
        <button
          onClick={() => { setEditing(blank()); setOpen(true); }}
          className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
        >
          + Novo item
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {s.products.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-2xl border border-border bg-background p-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-paper">
              {p.image ? (
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-3xl">{p.emoji}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-serif text-base">{p.name}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.barraca} · {p.kind}{p.durationMin ? ` · ${p.durationMin}min` : ""}</div>
                </div>
                <div className="font-display text-primary">R${p.price}</div>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => { setEditing(p); setOpen(true); }} className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold">Editar</button>
                <button onClick={() => { if (confirm(`Remover ${p.name}?`)) removeProduct(p.id); }} className="rounded-full border border-destructive/40 px-3 py-1 text-[11px] font-semibold text-destructive">Remover</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && editing && (
        <ProductDialog
          product={editing}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={(p) => { upsertProduct(p); setOpen(false); setEditing(null); }}
        />
      )}
    </section>
  );
}

function ProductDialog({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (p: Product) => void }) {
  const [p, setP] = useState<Product>(product);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const upd = <K extends keyof Product>(k: K, v: Product[K]) => setP((prev) => ({ ...prev, [k]: v }));

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => upd("image", reader.result as string);
    reader.readAsDataURL(file);
  };

  const isTimed = p.kind === "brinquedo" || p.kind === "ingresso";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl">Item do catálogo</h3>
          <button onClick={onClose} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Fechar</button>
        </div>

        {/* Imagem */}
        <div className="mt-5 flex gap-4">
          <div className="h-28 w-28 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-paper">
            {p.image ? (
              <img src={p.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-4xl">{p.emoji || "📷"}</div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
              {p.image ? "Trocar foto" : "Enviar foto"}
            </button>
            {p.image && (
              <button onClick={() => upd("image", undefined)} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Remover foto</button>
            )}
            <p className="text-[11px] text-muted-foreground">JPG/PNG até ~2MB. Aparece no catálogo público.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Nome">
            <input value={p.name} onChange={(e) => upd("name", e.target.value)} className="input" placeholder="Ex.: Cama elástica" />
          </Field>
          <Field label="Preço (R$)">
            <input type="number" value={p.price} onChange={(e) => upd("price", Number(e.target.value))} className="input" />
          </Field>
          <Field label="Barraca">
            <input value={p.barraca} onChange={(e) => upd("barraca", e.target.value)} className="input" placeholder="Ex.: Brinquedos" />
          </Field>
          <Field label="Emoji">
            <input value={p.emoji} onChange={(e) => upd("emoji", e.target.value)} className="input" maxLength={4} />
          </Field>
          <Field label="Tipo">
            <select value={p.kind} onChange={(e) => upd("kind", e.target.value as ProductKind)} className="input">
              <option value="comida">Comida</option>
              <option value="bebida">Bebida</option>
              <option value="doce">Doce</option>
              <option value="brinquedo">Brinquedo</option>
              <option value="ingresso">Ingresso</option>
            </select>
          </Field>
          {isTimed && (
            <Field label="Tempo de uso (min)">
              <input type="number" value={p.durationMin ?? 0} onChange={(e) => upd("durationMin", Number(e.target.value) || undefined)} className="input" placeholder="Ex.: 10" />
            </Field>
          )}
          <Field label="Estoque (opcional)" full>
            <input type="number" value={p.stock ?? ""} onChange={(e) => upd("stock", e.target.value === "" ? undefined : Number(e.target.value))} className="input" placeholder="—" />
          </Field>
          <Field label="Descrição" full>
            <textarea value={p.description ?? ""} onChange={(e) => upd("description", e.target.value)} rows={2} className="input resize-none" placeholder="Ex.: 10 minutos de pulo livre na cama elástica gigante." />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>
          <button
            disabled={!p.name.trim()}
            onClick={() => onSave(p)}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-50"
          >
            Salvar item
          </button>
        </div>

        <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid var(--border);background:var(--background);padding:0.6rem 0.85rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
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

/* ---------------------------- Política de saldo ---------------------------- */

function toLocalInput(ts: number) {
  const d = new Date(ts);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function PolicyCard() {
  const s = useStore();
  const p = s.policy;
  const modes: { k: typeof p.mode; label: string; hint: string; tone: string }[] = [
    { k: "expire", label: "Expira no fim", hint: "Saldo não consumido fica com a organização", tone: "border-warning/40" },
    { k: "refund", label: "Reembolsável", hint: "Cliente pode pedir devolução por X dias", tone: "border-primary/40" },
    { k: "carry",  label: "Próximo evento", hint: "Saldo continua valendo nos próximos eventos", tone: "border-success/40" },
  ];
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <h2 className="font-serif text-2xl">Política do saldo restante</h2>
      <p className="text-sm text-muted-foreground">O que acontece com o crédito não consumido. O cliente vê isso no app dele.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {modes.map((m) => {
          const active = p.mode === m.k;
          return (
            <button
              key={m.k}
              onClick={() => setPolicy({ mode: m.k })}
              className={`rounded-2xl border-2 p-3 text-left transition active:scale-[0.99] ${active ? `bg-accent/40 ${m.tone} border-foreground` : "border-border bg-background"}`}
            >
              <div className="font-serif text-base">{m.label}</div>
              <div className="text-[11px] text-muted-foreground">{m.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fim do evento</span>
          <input
            type="datetime-local"
            value={toLocalInput(p.endsAt)}
            onChange={(e) => setPolicy({ endsAt: new Date(e.target.value).getTime() })}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        {p.mode === "refund" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Janela de reembolso (dias)</span>
            <input
              type="number"
              min={1}
              max={60}
              value={p.refundDays}
              onChange={(e) => setPolicy({ refundDays: Math.max(1, Number(e.target.value) || 1) })}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        )}
      </div>
    </div>
  );
}

function PolicyExplainer() {
  const s = useStore();
  const p = s.policy;
  const ends = new Date(p.endsAt);
  const refundEnd = new Date(p.endsAt + p.refundDays * 86_400_000);

  const text =
    p.mode === "expire"
      ? `Os clientes verão um aviso: "Seu crédito expira ao fim do evento (${ends.toLocaleString("pt-BR")})". Saldo não consumido fica retido para a organização.`
      : p.mode === "carry"
      ? `Os clientes verão: "Saldo nunca expira — vale pros próximos eventos da ${s.event.org}".`
      : `Os clientes verão um botão "Pedir reembolso de R$ X" disponível até ${refundEnd.toLocaleString("pt-BR")} (${p.refundDays} dias após o fim). Você aprova manualmente cada pedido.`;

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-foreground bg-accent/30 p-4 text-sm shadow-pop">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background">📣</div>
      <div>
        <div className="font-semibold">Como o cliente vai ver no app</div>
        <p className="mt-1 text-foreground/80">{text}</p>
      </div>
    </div>
  );
}
