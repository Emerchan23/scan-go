import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import { archiveEvent, buildSalesCSV, buildStockCSV, closeAllSales, closeTopUps, connectSplit, createEvent, decideRefundRequest, disconnectSplit, reactivateEvent, removeBarraca, removeProduct, reopenSales, reset, restockProduct, setClientStockVisibility, setPolicy, stockStatus, switchEvent, toggleBarracaProduct, upsertBarraca, upsertProduct, useStore, type Barraca, type Product, type ProductKind, type StockVisibility } from "@/lib/festa-store";
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
            <button onClick={() => {
              const csv = buildSalesCSV() + "\n\n" + buildStockCSV();
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url;
              a.download = `festacash-${new Date().toISOString().slice(0,10)}.csv`; a.click();
              URL.revokeObjectURL(url);
            }} className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">Exportar relatório</button>
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
          <SplitCard />
          <PolicyCard />
        </div>
        <PolicyExplainer />

        <EventManager />

        <SalesControlCard />
        <StockManager />

        <RefundsApprovalSection />

        <BarracasManager />

        {/* Folders / QR para imprimir */}
        <a
          href="/folder"
          className="mt-6 flex items-center justify-between gap-4 rounded-3xl border-2 border-foreground bg-gradient-to-br from-accent/60 to-card p-6 shadow-pop transition active:scale-[0.99]"
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Material físico</div>
            <h3 className="mt-1 font-serif text-2xl">Folders e QR Codes para imprimir</h3>
            <p className="text-sm text-muted-foreground">Cartazes A4, totens de mesa, adesivos e cupons. O cliente aponta a câmera e já compra crédito.</p>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-foreground text-2xl text-background">🖨️</span>
        </a>

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

/* --------------------------- Split Mercado Pago --------------------------- */

function SplitCard() {
  const s = useStore();
  const sp = s.split;
  const fee = s.platformFee ?? 0.02;
  const consumed = s.sales.reduce((a, x) => a + x.price, 0);
  const totalSold = s.user.balance + consumed;
  const yourCut = Math.round((totalSold * (1 - fee)) * 100) / 100;
  const platformCut = Math.round((totalSold * fee) * 100) / 100;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ holder: "", document: "", email: "" });

  const connected = sp.status === "connected";

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Sua conta de recebimento</h2>
          <p className="text-sm text-muted-foreground">A FestaCash não custodia dinheiro. O valor cai direto na conta Mercado Pago abaixo.</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${connected ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
          {connected ? "Conectada" : "Pendente"}
        </span>
      </div>

      {connected ? (
        <div className="mt-4 rounded-2xl border-2 border-foreground bg-gradient-to-br from-[oklch(0.62_0.21_35)] to-[oklch(0.45_0.18_25)] p-5 text-background shadow-pop">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest opacity-80">Mercado Pago</span>
            <span className="text-[11px] font-semibold opacity-80">ID {sp.mpUserId}</span>
          </div>
          <div className="mt-4 font-display text-2xl">{sp.holder}</div>
          <div className="mt-1 font-mono text-sm tracking-wider opacity-90">{sp.document}</div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">Email</div>
              <div className="text-xs">{sp.email}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Conectada em</div>
              <div className="text-xs">{sp.connectedAt ? new Date(sp.connectedAt).toLocaleDateString("pt-BR") : "—"}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-warning/50 bg-warning/5 p-5 text-center">
          <div className="text-3xl">🔒</div>
          <div className="mt-2 font-serif text-lg">Conecte sua conta para começar a vender</div>
          <p className="text-xs text-muted-foreground">Sem conta conectada, os clientes não conseguem comprar créditos.</p>
        </div>
      )}

      {/* Ledger */}
      <div className="mt-4 rounded-2xl bg-secondary p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repasses do dia</div>
        <div className="mt-2 grid gap-2 text-sm">
          <div className="flex justify-between"><span>Bruto vendido</span><span className="font-display">R$ {totalSold.toLocaleString("pt-BR")}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Taxa FestaCash ({(fee * 100).toFixed(1)}%)</span><span>− R$ {platformCut.toLocaleString("pt-BR")}</span></div>
          <div className="border-t border-border pt-2 flex justify-between font-semibold"><span>Vai pra você</span><span className="font-display text-success">R$ {yourCut.toLocaleString("pt-BR")}</span></div>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">Cada transação é repassada na hora pelo Mercado Pago. Você acompanha tudo no extrato MP.</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => { setForm({ holder: sp.holder, document: sp.document, email: sp.email }); setOpen(true); }}
          className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
        >
          {connected ? "Trocar conta" : "Conectar Mercado Pago"}
        </button>
        {connected && (
          <button
            onClick={() => { if (confirm("Desconectar conta? Vendas ficarão pausadas.")) disconnectSplit(); }}
            className="rounded-full border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive"
          >
            Desconectar
          </button>
        )}
        <a
          href="https://www.mercadopago.com.br/developers/pt/docs/split-payments"
          target="_blank" rel="noreferrer"
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold"
        >
          Como funciona o split ↗
        </a>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
            <h3 className="font-serif text-2xl">Conectar Mercado Pago</h3>
            <p className="text-xs text-muted-foreground">Em produção isto abre o OAuth do MP. Aqui é só simulação.</p>
            <div className="mt-4 grid gap-3">
              <Field label="Titular / Razão social">
                <input value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} className="input" placeholder="Ex.: Escola Sagrado Coração Ltda" />
              </Field>
              <Field label="CNPJ ou CPF">
                <input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="input" placeholder="00.000.000/0001-00" />
              </Field>
              <Field label="Email da conta MP">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="financeiro@org.com.br" />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>
              <button
                disabled={!form.holder.trim() || !form.email.trim()}
                onClick={() => { connectSplit(form); setOpen(false); }}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-50"
              >
                Conectar
              </button>
            </div>
            <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid var(--border);background:var(--background);padding:0.6rem 0.85rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Barracas ------------------------------ */

function BarracasManager() {
  const s = useStore();
  const [editing, setEditing] = useState<Barraca | null>(null);

  const blank = (): Barraca => ({
    id: "bar_" + Math.random().toString(36).slice(2, 8),
    name: "",
    emoji: "🎪",
    attendant: "",
    productIds: [],
  });

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Barracas do evento</h2>
          <p className="text-sm text-muted-foreground">
            Defina o que cada barraca pode vender. O atendente só verá os
            produtos liberados pra ele no PDV.
          </p>
        </div>
        <button
          onClick={() => setEditing(blank())}
          className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
        >
          + Nova barraca
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {s.barracas.map((b) => (
          <article key={b.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-2xl">{b.emoji}</span>
                <div className="min-w-0">
                  <div className="font-serif text-lg leading-tight truncate">{b.name || "(sem nome)"}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {b.attendant ? `Atendente: ${b.attendant}` : "Sem atendente"} · {b.productIds.length} {b.productIds.length === 1 ? "item" : "itens"}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => setEditing(b)} className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold">Editar</button>
                <button onClick={() => { if (confirm(`Remover barraca "${b.name}"?`)) removeBarraca(b.id); }} className="rounded-full border border-destructive/40 px-3 py-1 text-[11px] font-semibold text-destructive">Remover</button>
              </div>
            </div>

            {b.productIds.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {b.productIds.map((pid) => {
                  const p = s.products.find((x) => x.id === pid);
                  if (!p) return null;
                  return (
                    <li key={pid} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">
                      {p.emoji} {p.name} · R${p.price}
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        ))}
      </div>

      {editing && (
        <BarracaDialog
          barraca={editing}
          products={s.products}
          onClose={() => setEditing(null)}
          onSave={(b) => { upsertBarraca(b); setEditing(null); }}
        />
      )}
    </section>
  );
}

function BarracaDialog({
  barraca,
  products,
  onClose,
  onSave,
}: {
  barraca: Barraca;
  products: Product[];
  onClose: () => void;
  onSave: (b: Barraca) => void;
}) {
  const [b, setB] = useState<Barraca>(barraca);
  const upd = <K extends keyof Barraca>(k: K, v: Barraca[K]) => setB((p) => ({ ...p, [k]: v }));
  const toggle = (pid: string) => {
    const has = b.productIds.includes(pid);
    upd("productIds", has ? b.productIds.filter((x) => x !== pid) : [...b.productIds, pid]);
  };

  // Live preview também atualiza store, pra refletir no PDV em tempo real:
  const persistToggle = (pid: string, on: boolean) => {
    toggle(pid);
    if (b.id) toggleBarracaProduct(b.id, pid, on);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl">Barraca</h3>
          <button onClick={onClose} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Fechar</button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Field label="Emoji">
            <input value={b.emoji} onChange={(e) => upd("emoji", e.target.value)} maxLength={4} className="input text-center text-2xl" />
          </Field>
          <Field label="Nome" full>
            <input value={b.name} onChange={(e) => upd("name", e.target.value)} className="input" placeholder="Ex.: Pastelaria" />
          </Field>
          <Field label="Atendente" full>
            <input value={b.attendant ?? ""} onChange={(e) => upd("attendant", e.target.value)} className="input" placeholder="Ex.: Dona Lu" />
          </Field>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Produtos liberados ({b.productIds.length}/{products.length})
            </div>
            <button
              onClick={() => upd("productIds", b.productIds.length === products.length ? [] : products.map((p) => p.id))}
              className="text-[11px] font-semibold text-primary"
            >
              {b.productIds.length === products.length ? "Limpar" : "Marcar todos"}
            </button>
          </div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {products.map((p) => {
              const checked = b.productIds.includes(p.id);
              return (
                <li key={p.id}>
                  <label className={`flex items-center gap-3 rounded-xl border p-2.5 cursor-pointer transition ${checked ? "border-foreground bg-accent/40" : "border-border bg-background"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => persistToggle(p.id, e.target.checked)}
                      className="h-4 w-4 accent-foreground"
                    />
                    <span className="text-xl">{p.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{p.barraca} · R${p.price}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>
          <button
            disabled={!b.name.trim()}
            onClick={() => onSave(b)}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-50"
          >
            Salvar barraca
          </button>
        </div>

        <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid var(--border);background:var(--background);padding:0.6rem 0.85rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
      </div>
    </div>
  );
}

function RefundsApprovalSection() {
  const s = useStore();
  const me = s.staff.find((x) => x.id === s.sessionStaffId);
  const myPerms = s.roles.find((r) => r.id === me?.roleId)?.permissions ?? [];
  const canApprove = myPerms.includes("admin.full") || myPerms.includes("refund.approve");
  const pending = s.refundRequests.filter((r) => r.status === "pending");
  const history = s.refundRequests.filter((r) => r.status !== "pending").slice(0, 8);
  const [note, setNote] = useState<Record<string, string>>({});

  return (
    <section className="mt-8 rounded-3xl border-2 border-warning/40 bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl">Solicitações de reembolso</h2>
          <p className="text-sm text-muted-foreground">Aprovações abertas pelo Caixa. Aprovar devolve o saldo na hora.</p>
        </div>
        <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">{pending.length} pendente(s)</span>
      </div>

      {!canApprove && (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
          Você está visualizando — só perfis com <code>refund.approve</code> podem decidir.
        </div>
      )}

      {pending.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {pending.map((r) => {
            const sale = s.sales.find((x) => x.id === r.saleId);
            return (
              <li key={r.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-serif text-lg">R$ {r.amount} · {sale?.product ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      Venda <code className="font-mono">{r.saleId.slice(-6).toUpperCase()}</code>
                      {r.walletCode && <> · Ficha <code className="font-mono">{r.walletCode}</code></>}
                      · Solicitado por <b>{r.requestedBy}</b> {new Date(r.requestedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="mt-2 rounded-xl bg-secondary p-2.5 text-sm"><b>Motivo:</b> {r.reason}</div>
                  </div>
                </div>
                {canApprove && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <input
                      placeholder="Nota da decisão (opcional)"
                      value={note[r.id] ?? ""}
                      onChange={(e) => setNote((p) => ({ ...p, [r.id]: e.target.value }))}
                      className="flex-1 min-w-[180px] rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    />
                    <button
                      onClick={() => { try { decideRefundRequest(r.id, true, me!.name, note[r.id]); } catch (e: any) { alert(e.message); } }}
                      className="rounded-full bg-success px-4 py-2 text-xs font-semibold text-success-foreground"
                    >Aprovar e estornar</button>
                    <button
                      onClick={() => { try { decideRefundRequest(r.id, false, me!.name, note[r.id]); } catch (e: any) { alert(e.message); } }}
                      className="rounded-full border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive"
                    >Negar</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {history.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold">Histórico recente ({history.length})</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {history.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                <span>
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.status === "approved" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                    {r.status === "approved" ? "aprovado" : "negado"}
                  </span>
                  R$ {r.amount} · {r.requestedBy} → {r.decidedBy}
                </span>
                <span className="text-muted-foreground">{r.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/* ----------------------- Encerramento de vendas ----------------------- */

function SalesControlCard() {
  const s = useStore();
  const ss = s.salesStatus;
  const [closeAllOpen, setCloseAllOpen] = useState(false);
  const [walletsActive, setWalletsActive] = useState(true);

  const stage =
    ss.charges === "closed" ? "fechado-tudo" :
    ss.topUps === "closed" ? "so-recargas" :
    "aberto";

  return (
    <section className="mt-8 rounded-3xl border-2 border-foreground bg-card p-5 shadow-pop">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Encerramento de vendas</h2>
          <p className="text-sm text-muted-foreground">Controle em 2 estágios. Primeiro fecha as recargas (cliente gasta o que tem), depois encerra as cobranças nas barracas.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
          stage === "aberto" ? "bg-success/15 text-success" :
          stage === "so-recargas" ? "bg-warning/15 text-warning" :
          "bg-destructive/15 text-destructive"
        }`}>
          {stage === "aberto" ? "● Vendas abertas" : stage === "so-recargas" ? "⏸ Recargas fechadas" : "■ Vendas encerradas"}
        </span>
      </div>

      {/* Stepper */}
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Stage active={stage === "aberto"} done={stage !== "aberto"} num="1" title="Tudo aberto" hint="Cliente recarrega, caixa emite ficha, barracas cobram." />
        <Stage active={stage === "so-recargas"} done={stage === "fechado-tudo"} num="2" title="Recargas fechadas" hint="Cliente não recarrega mais. Caixa não emite novas fichas. Barracas seguem cobrando o saldo restante." />
        <Stage active={stage === "fechado-tudo"} num="3" title="Cobranças fechadas" hint={ss.walletsActiveAfterClose ? "Fichas físicas continuam valendo." : "Tudo bloqueado, inclusive fichas físicas."} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {stage === "aberto" && (
          <>
            <button onClick={() => { if (confirm("Fechar recargas? Cliente não compra mais crédito e o caixa não emite novas fichas. As barracas continuam cobrando.")) closeTopUps(); }}
              className="rounded-full bg-warning px-5 py-2.5 text-sm font-semibold text-background shadow-pop">Fechar recargas (etapa 1)</button>
            <button onClick={() => setCloseAllOpen(true)}
              className="rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-pop">Encerrar tudo agora</button>
          </>
        )}
        {stage === "so-recargas" && (
          <>
            <button onClick={() => setCloseAllOpen(true)}
              className="rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-pop">Fechar cobranças (etapa 2)</button>
            <button onClick={() => reopenSales()} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">Reabrir vendas</button>
          </>
        )}
        {stage === "fechado-tudo" && (
          <button onClick={() => { if (confirm("Reabrir todas as vendas?")) reopenSales(); }} className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">Reabrir vendas</button>
        )}
      </div>

      {ss.topUpsClosedAt && (
        <p className="mt-3 text-[11px] text-muted-foreground">Recargas fechadas em {new Date(ss.topUpsClosedAt).toLocaleString("pt-BR")}{ss.closedAt && ` · cobranças em ${new Date(ss.closedAt).toLocaleString("pt-BR")}`}.</p>
      )}

      {closeAllOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setCloseAllOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
            <h3 className="font-serif text-2xl">Encerrar cobranças</h3>
            <p className="mt-1 text-sm text-muted-foreground">As barracas vão parar de cobrar imediatamente.</p>

            <div className="mt-5 space-y-2">
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 ${walletsActive ? "border-foreground bg-accent/40" : "border-border bg-background"}`}>
                <input type="radio" checked={walletsActive} onChange={() => setWalletsActive(true)} className="mt-1" />
                <div>
                  <div className="font-serif text-base">Manter fichas físicas ativas</div>
                  <div className="text-[11px] text-muted-foreground">Quem já tem ficha de papel na mão consegue gastar até zerar. Recomendado.</div>
                </div>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 ${!walletsActive ? "border-destructive bg-destructive/5" : "border-border bg-background"}`}>
                <input type="radio" checked={!walletsActive} onChange={() => setWalletsActive(false)} className="mt-1" />
                <div>
                  <div className="font-serif text-base">Bloquear tudo, inclusive fichas</div>
                  <div className="text-[11px] text-muted-foreground">Ninguém compra nada. Saldo de fichas vira reembolso conforme política.</div>
                </div>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setCloseAllOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>
              <button onClick={() => { closeAllSales(walletsActive); setCloseAllOpen(false); }} className="rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-destructive-foreground shadow-pop">Confirmar encerramento</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Stage({ active, done, num, title, hint }: { active?: boolean; done?: boolean; num: string; title: string; hint: string }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${active ? "border-foreground bg-accent/40" : done ? "border-success/40 bg-success/5" : "border-border bg-background opacity-70"}`}>
      <div className="flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${active ? "bg-foreground text-background" : done ? "bg-success text-background" : "bg-secondary"}`}>{done ? "✓" : num}</span>
        <span className="font-serif text-base">{title}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

/* ----------------------------- Estoque ------------------------------ */

function StockManager() {
  const s = useStore();
  const me = s.staff.find((x) => x.id === s.sessionStaffId);
  const tracked = s.products.filter((p) => typeof p.stock === "number");
  const low = tracked.filter((p) => stockStatus(p) === "low");
  const out = tracked.filter((p) => stockStatus(p) === "out");
  const [restockId, setRestockId] = useState<string | null>(null);
  const [qty, setQty] = useState(20);
  const [note, setNote] = useState("");

  const target = restockId ? s.products.find((p) => p.id === restockId) : null;

  const visibilityOptions: { v: StockVisibility; label: string; hint: string }[] = [
    { v: "off", label: "Cliente não vê", hint: "Descobre só ao tentar pedir" },
    { v: "esgotado", label: "Mostrar esgotado", hint: "Item zerado aparece riscado" },
    { v: "acabando", label: "Mostrar tudo", hint: "Esgotado + 'últimas unidades'" },
  ];

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Estoque das barracas</h2>
          <p className="text-sm text-muted-foreground">Cada produto desconta automático a cada venda. Você é avisado quando o estoque encosta no limite de alerta.</p>
        </div>
        <div className="flex gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-destructive/15 px-3 py-1 text-destructive">{out.length} esgotado(s)</span>
          <span className="rounded-full bg-warning/15 px-3 py-1 text-warning">{low.length} acabando</span>
        </div>
      </div>

      {/* Alertas em destaque */}
      {(out.length + low.length) > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[...out, ...low].slice(0, 6).map((p) => {
            const st = stockStatus(p);
            return (
              <div key={p.id} className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${st === "out" ? "border-destructive bg-destructive/5" : "border-warning bg-warning/5"}`}>
                <span className="text-2xl">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-serif text-sm">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.barraca} · {p.stock ?? 0} un · alerta ≤{p.stockAlert ?? 10}</div>
                </div>
                <button onClick={() => { setRestockId(p.id); setQty(20); setNote(""); }} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${st === "out" ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background"}`}>Repor</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Visibilidade pro cliente */}
      <div className="mt-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">O que o cliente vê no catálogo</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {visibilityOptions.map((o) => {
            const active = s.clientStockVisibility === o.v;
            return (
              <button key={o.v} onClick={() => setClientStockVisibility(o.v)} className={`rounded-2xl border-2 p-3 text-left ${active ? "border-foreground bg-accent/40" : "border-border bg-background"}`}>
                <div className="font-serif text-sm">{o.label}</div>
                <div className="text-[11px] text-muted-foreground">{o.hint}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela */}
      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-semibold">Ver todos os produtos rastreados ({tracked.length})</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Item</th><th>Barraca</th><th className="text-right">Estoque</th><th className="text-right">Alerta</th><th></th></tr>
            </thead>
            <tbody>
              {tracked.map((p) => {
                const st = stockStatus(p);
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2.5">{p.emoji} {p.name}</td>
                    <td className="text-muted-foreground">{p.barraca}</td>
                    <td className={`text-right font-display ${st === "out" ? "text-destructive" : st === "low" ? "text-warning" : ""}`}>{p.stock}</td>
                    <td className="text-right text-muted-foreground">≤{p.stockAlert ?? 10}</td>
                    <td className="text-right"><button onClick={() => { setRestockId(p.id); setQty(20); setNote(""); }} className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold">Repor</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      {/* Histórico de reposições */}
      {s.stockMoves.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold">Histórico de reposições ({s.stockMoves.length})</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {s.stockMoves.slice(0, 12).map((m) => {
              const p = s.products.find((x) => x.id === m.productId);
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                  <span><b>+{m.qty}</b> {p?.emoji} {p?.name ?? "—"}</span>
                  <span className="text-muted-foreground">{m.by} · {new Date(m.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{m.note ? ` · ${m.note}` : ""}</span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {target && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setRestockId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
            <h3 className="font-serif text-2xl">Repor {target.emoji} {target.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Estoque atual: <b>{target.stock}</b> · alerta ≤ {target.stockAlert ?? 10}</p>

            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quantidade a adicionar</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 0))} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 font-display text-2xl text-center" />

            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observação (opcional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: chegou caixa nova" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setRestockId(null)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>
              <button
                onClick={() => { try { restockProduct({ productId: target.id, qty, by: me?.name ?? "Admin", note }); setRestockId(null); } catch (e: any) { alert(e.message); } }}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-pop"
              >+ {qty} unidades</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
