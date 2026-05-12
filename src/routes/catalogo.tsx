import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import { useStore, type Product, type ProductKind } from "@/lib/festa-store";

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo — FestaCash" },
      { name: "description", content: "Veja tudo que está sendo vendido no evento: comidas, bebidas, doces e brinquedos com fotos e tempo de uso." },
    ],
  }),
  component: CatalogoPage,
});

const KIND_LABEL: Record<ProductKind, string> = {
  comida: "Comida",
  bebida: "Bebida",
  doce: "Doce",
  brinquedo: "Brinquedo",
  ingresso: "Ingresso",
};

const KIND_TONE: Record<ProductKind, string> = {
  comida: "bg-[oklch(0.92_0.08_60)] text-[oklch(0.35_0.12_50)]",
  bebida: "bg-[oklch(0.9_0.07_220)] text-[oklch(0.35_0.12_240)]",
  doce: "bg-[oklch(0.92_0.08_350)] text-[oklch(0.4_0.14_350)]",
  brinquedo: "bg-[oklch(0.9_0.1_145)] text-[oklch(0.35_0.14_145)]",
  ingresso: "bg-[oklch(0.92_0.1_280)] text-[oklch(0.4_0.16_280)]",
};

function CatalogoPage() {
  const s = useStore();
  const [kind, setKind] = useState<"todos" | ProductKind>("todos");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return s.products.filter((p) => {
      if (kind !== "todos" && p.kind !== kind) return false;
      if (term && !`${p.name} ${p.barraca} ${p.description ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [s.products, kind, q]);

  const filters: ("todos" | ProductKind)[] = ["todos", "comida", "bebida", "doce", "brinquedo", "ingresso"];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Bunting />

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Catálogo do evento</div>
            <h1 className="font-serif text-4xl">{s.event.name}</h1>
            <p className="text-sm text-muted-foreground">Comidas, bebidas, doces e brinquedos. Compre seus créditos e venha aproveitar.</p>
          </div>
          <Link to="/cliente" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-pop">
            Comprar créditos
          </Link>
        </div>

        {/* Search + filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar item..."
            className="w-full sm:max-w-xs rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setKind(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                  kind === f ? "bg-foreground text-background" : "bg-secondary text-foreground/70 hover:bg-accent"
                }`}
              >
                {f === "todos" ? "Todos" : KIND_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {list.length === 0 ? (
          <div className="mt-12 grid place-items-center rounded-3xl border-2 border-dashed border-border p-16 text-center">
            <div className="font-display text-5xl">🔎</div>
            <p className="mt-3 text-sm text-muted-foreground">Nenhum item encontrado.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((p) => (
              <Card key={p.id} p={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ p }: { p: Product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper">
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-secondary to-accent/40 font-display text-7xl">
            {p.emoji}
          </div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${KIND_TONE[p.kind]}`}>
          {KIND_LABEL[p.kind]}
        </span>
        {p.durationMin ? (
          <span className="absolute right-3 top-3 rounded-full bg-foreground/90 px-2.5 py-0.5 text-[10px] font-semibold text-background">
            ⏱ {p.durationMin} min
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{p.barraca}</div>
        <h3 className="mt-0.5 font-serif text-lg leading-tight">{p.name}</h3>
        {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Vale</div>
            <div className="font-display text-2xl text-primary leading-none">R${p.price}</div>
          </div>
          {typeof p.stock === "number" && (
            <div className="text-[11px] text-muted-foreground">{p.stock} disp.</div>
          )}
        </div>
      </div>
    </article>
  );
}
