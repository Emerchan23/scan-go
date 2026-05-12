import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import { chargeProduct, useStore } from "@/lib/festa-store";

export const Route = createFileRoute("/barraca")({
  head: () => ({
    meta: [
      { title: "Barraca — FestaCash" },
      { name: "description", content: "PDV da barraca: escaneie o QR Code do cliente e debite o produto em segundos." },
    ],
  }),
  component: BarracaPage,
});

function BarracaPage() {
  const s = useStore();
  const [scanned, setScanned] = useState(false);
  const [last, setLast] = useState<{ product: string; price: number; balance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("Todos");

  const barracas = ["Todos", ...Array.from(new Set(s.products.map((p) => p.barraca)))];
  const list = s.products.filter((p) => filter === "Todos" || p.barraca === filter);

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(() => setLast(null), 4000);
    return () => clearTimeout(t);
  }, [last]);

  const charge = (id: string) => {
    setError(null);
    if (!scanned) {
      setError("Escaneie o QR do cliente primeiro");
      return;
    }
    try {
      const r = chargeProduct(id);
      setLast({ product: r.product.name, price: r.product.price, balance: r.balance });
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Bunting />

      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl">PDV da barraca</h1>
            <p className="text-sm text-muted-foreground">Pastelaria · Atendente: João</p>
          </div>
          <button
            onClick={() => { setScanned(false); setLast(null); setError(null); }}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold"
          >
            Nova venda
          </button>
        </div>

        {/* Scanner area */}
        {!scanned ? (
          <button
            onClick={() => setScanned(true)}
            className="grid w-full place-items-center rounded-3xl border-2 border-dashed border-foreground bg-paper py-16 text-center transition hover:bg-accent/30"
          >
            <div className="font-display text-6xl">📷</div>
            <div className="mt-3 font-serif text-2xl">Toque para escanear</div>
            <div className="text-sm text-muted-foreground">Aponte para o QR do cliente</div>
          </button>
        ) : (
          <div className="rounded-3xl border-2 border-foreground bg-card p-5 shadow-pop">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Cliente identificado</div>
                <div className="font-serif text-2xl">{s.user.name === "Visitante" ? "Convidado #1932" : s.user.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Saldo</div>
                <div className="font-display text-3xl text-primary">R$ {s.user.balance}</div>
              </div>
            </div>
          </div>
        )}

        {error && <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {last && (
          <div className="mt-4 rounded-2xl border border-success/40 bg-success/10 p-4">
            <div className="font-display text-success">✓ Aprovado</div>
            <div className="mt-1 text-sm">{last.product} · <strong>R${last.price}</strong> debitado · saldo restante R${last.balance}</div>
          </div>
        )}

        {/* Filter */}
        <div className="mt-8 flex flex-wrap gap-2">
          {barracas.map((b) => (
            <button
              key={b}
              onClick={() => setFilter(b)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                filter === b ? "bg-foreground text-background" : "bg-secondary text-foreground/70"
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => charge(p.id)}
              disabled={!scanned}
              className="group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-soft transition hover:border-foreground hover:shadow-pop disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="relative aspect-[4/3] w-full bg-paper">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-5xl">{p.emoji}</div>
                )}
                {p.durationMin ? (
                  <span className="absolute right-2 top-2 rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-semibold text-background">⏱ {p.durationMin}min</span>
                ) : null}
              </div>
              <div className="p-3">
                <div className="font-serif text-base leading-tight">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">{p.barraca}</div>
                <div className="mt-1 font-display text-primary">R${p.price}</div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
