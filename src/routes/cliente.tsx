import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Bell, ChevronRight, Clock, History, Home, Info, Plus, QrCode as QrIcon, Search, Send, ShoppingBag } from "lucide-react";

import { addCredits, convertBalanceToWallet, getMyClientWallets, requestRefund, stockStatus, transfer, useStore, type Product, type ProductKind, type Wallet } from "@/lib/festa-store";
import { InstallPrompt } from "@/components/install-prompt";
import { NotificationBell } from "@/components/notification-bell";
import { Receipt as WalletReceipt, PrintStyles } from "@/routes/caixa";
import { WifiOff, Download as DownloadIcon } from "lucide-react";

export const Route = createFileRoute("/cliente")({
  head: () => ({
    meta: [
      { title: "FestaCash — Sua carteira do evento" },
      { name: "description", content: "Compre créditos, veja o catálogo da festa, mostre seu QR Code e acompanhe seu saldo." },
    ],
  }),
  component: ClientApp,
});

type Tab = "home" | "catalogo" | "comprar" | "qr" | "historico";

function ClientApp() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("home");
  const [toast, setToast] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="min-h-[100svh] bg-background">
      <div
        className="relative mx-auto flex min-h-[100svh] w-full max-w-md flex-col bg-background"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 pt-2 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg shadow-pop">F</span>
            <div className="leading-tight">
              <div className="font-display text-base">FestaCash</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.event.org}</div>
            </div>
          </div>
          <NotificationBell audience="client" who={s.user.name || "anon"} />
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="mx-5 rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto pb-28">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="px-5"
            >
              {tab === "home" && <HomeView onTab={setTab} onTransfer={() => setTransferOpen(true)} onToast={setToast} />}
              {tab === "catalogo" && <CatalogView onTab={setTab} />}
              {tab === "qr" && <QrView />}
              {tab === "comprar" && <BuyView onDone={(m) => { setToast(m); setTab("home"); }} />}
              {tab === "historico" && <HistoryView onToast={setToast} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Transfer bottom sheet */}
        <AnimatePresence>
          {transferOpen && (
            <TransferSheet onClose={() => setTransferOpen(false)} onDone={(m) => { setToast(m); setTransferOpen(false); }} />
          )}
        </AnimatePresence>

        {/* Bottom tab bar */}
        <BottomBar tab={tab} onTab={setTab} />
      </div>
      <InstallPrompt />
    </div>
  );
}

/* ------------------------------ Home view ----------------------------- */

function HomeView({ onTab, onTransfer, onToast }: { onTab: (t: Tab) => void; onTransfer: () => void; onToast: (m: string) => void }) {
  const s = useStore();
  const recent = s.sales.filter((x) => x.user === s.user.name).slice(0, 3);

  return (
    <div>
      <WalletCard />

      <SalesStatusBanner />
      <PolicyBanner onAction={onToast} />

      {/* Quick actions */}
      <div className="mt-5 grid grid-cols-4 gap-2">
        <QuickAction icon={<Plus className="h-5 w-5" />} label="Comprar" onClick={() => onTab("comprar")} />
        <QuickAction icon={<QrIcon className="h-5 w-5" />} label="Meu QR" onClick={() => onTab("qr")} />
        <QuickAction icon={<Send className="h-5 w-5" />} label="Enviar" onClick={onTransfer} />
        <QuickAction icon={<History className="h-5 w-5" />} label="Extrato" onClick={() => onTab("historico")} />
      </div>

      <button
        onClick={() => onTab("catalogo")}
        className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-accent to-secondary p-4 text-left active:scale-[0.99] transition"
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-foreground text-background font-display text-2xl">🎪</div>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-base leading-tight">O que tem na festa?</div>
          <div className="text-xs text-muted-foreground">Veja preços antes de comprar créditos</div>
        </div>
        <ChevronRight className="h-5 w-5 text-foreground/50" />
      </button>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-serif text-lg">Atividade recente</h2>
        <button onClick={() => onTab("historico")} className="text-xs font-semibold text-primary">Ver tudo</button>
      </div>
      <div className="mt-2 rounded-2xl border border-border bg-card">
        {recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sem movimentações ainda. 🍢</div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-lg">🧾</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-sm">{h.product}</div>
                  <div className="text-[11px] text-muted-foreground">{h.barraca} · {fmtTime(h.at)}</div>
                </div>
                <div className="font-display text-primary">- R${h.price}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Policy banner -------------------------- */

function usePolicyStatus() {
  const s = useStore();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);
  const ended = now >= s.policy.endsAt;
  const msToEnd = s.policy.endsAt - now;
  const refundDeadline = s.policy.endsAt + s.policy.refundDays * 86_400_000;
  const msToRefund = refundDeadline - now;
  return { policy: s.policy, balance: s.user.balance, ended, msToEnd, msToRefund, refundDeadline };
}

function PolicyBanner({ onAction }: { onAction: (m: string) => void }) {
  const { policy, balance, ended, msToEnd, msToRefund } = usePolicyStatus();

  if (policy.mode === "carry") {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-secondary p-3.5 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
        <div>
          <div className="font-semibold">Saldo nunca expira</div>
          <div className="text-xs text-muted-foreground">Sobrou? Continua valendo nos próximos eventos da organização.</div>
        </div>
      </div>
    );
  }

  if (policy.mode === "expire" && !ended) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-warning/40 bg-warning/10 p-3.5 text-sm">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0">
          <div className="font-semibold text-warning">Seu crédito expira ao fim do evento</div>
          <div className="text-xs text-foreground/70">Termina em <span className="font-display">{fmtCountdown(msToEnd)}</span> · gaste pra não perder.</div>
        </div>
      </div>
    );
  }

  if (policy.mode === "expire" && ended) {
    return balance > 0 ? (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-3.5 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <div className="font-semibold text-destructive">Evento encerrado</div>
          <div className="text-xs text-foreground/70">O crédito de R$ {balance} expirou conforme a política do organizador.</div>
        </div>
      </div>
    ) : null;
  }

  // refund mode
  if (!ended) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="font-semibold">Sobrou crédito? Você pode pedir reembolso</div>
          <div className="text-xs text-muted-foreground">Após o fim da festa, você tem <span className="font-semibold text-foreground">{policy.refundDays} dias</span> pra organização devolver.</div>
        </div>
      </div>
    );
  }

  if (msToRefund > 0 && balance > 0) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 text-sm">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="font-semibold">Você ainda tem R$ {balance} pra reembolsar</div>
            <div className="text-xs text-muted-foreground">Prazo de <span className="font-display">{fmtCountdown(msToRefund)}</span> pra pedir devolução.</div>
          </div>
        </div>
        <button
          onClick={() => {
            try { const a = requestRefund(); onAction(`Reembolso de R$ ${a} solicitado.`); }
            catch (e: any) { onAction(e.message); }
          }}
          className="mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition"
        >
          Pedir reembolso de R$ {balance}
        </button>
      </div>
    );
  }

  if (msToRefund <= 0 && balance > 0) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-3.5 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <div className="font-semibold text-destructive">Prazo de reembolso encerrado</div>
          <div className="text-xs text-foreground/70">O crédito não consumido foi retido pela organização.</div>
        </div>
      </div>
    );
  }

  return null;
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return "encerrado";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

/* ----------------------------- Catalog tab ---------------------------- */

const KIND_LABEL: Record<ProductKind, string> = {
  comida: "Comida", bebida: "Bebida", doce: "Doce", brinquedo: "Brinquedo", ingresso: "Ingresso",
};

function CatalogView({ onTab }: { onTab: (t: Tab) => void }) {
  const s = useStore();
  const [kind, setKind] = useState<"todos" | ProductKind>("todos");
  const [barracaId, setBarracaId] = useState<"todas" | string>("todas");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const allowedIds = barracaId === "todas"
      ? null
      : new Set(s.barracas.find((b) => b.id === barracaId)?.productIds ?? []);
    return s.products.filter((p) => {
      if (kind !== "todos" && p.kind !== kind) return false;
      if (allowedIds && !allowedIds.has(p.id)) return false;
      if (term && !`${p.name} ${p.barraca}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [s.products, s.barracas, kind, barracaId, q]);

  const filters: ("todos" | ProductKind)[] = ["todos", "comida", "bebida", "doce", "brinquedo", "ingresso"];

  const avg = Math.round(s.products.reduce((a, p) => a + p.price, 0) / Math.max(1, s.products.length));
  const sugestao = Math.max(50, Math.ceil((avg * 5) / 10) * 10);

  return (
    <div className="pt-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl">Catálogo da festa</h1>
          <p className="text-sm text-muted-foreground">Veja preços antes de comprar.</p>
        </div>
        <button
          onClick={() => onTab("comprar")}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-pop active:scale-95 transition"
        >
          Comprar R${sugestao}
        </button>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-2xl bg-secondary p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Sugestão pra 1 pessoa: <span className="font-semibold text-foreground">~R$ {sugestao}</span> (cobre 4–5 itens). Dá pra recarregar a hora que quiser.</span>
      </div>

      <div className="mt-3 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar item..."
          className="w-full rounded-full border border-border bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="-mx-5 mt-3 overflow-x-auto px-5">
        <div className="flex gap-2 pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setKind(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                kind === f ? "bg-foreground text-background" : "bg-secondary text-foreground/70"
              }`}
            >
              {f === "todos" ? "Todos" : KIND_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-5 mt-2 overflow-x-auto px-5">
        <div className="flex gap-2 pb-1">
          <button
            onClick={() => setBarracaId("todas")}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              barracaId === "todas" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground/70"
            }`}
          >🎪 Todas barracas</button>
          {s.barracas.map((b) => (
            <button
              key={b.id}
              onClick={() => setBarracaId(b.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                barracaId === b.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground/70"
              }`}
            >{b.emoji} {b.name}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {list.map((p) => <CatalogCard key={p.id} p={p} />)}
      </div>
      {list.length === 0 && <div className="mt-10 text-center text-sm text-muted-foreground">Nenhum item encontrado.</div>}
    </div>
  );
}

function CatalogCard({ p }: { p: Product }) {
  const s = useStore();
  const vis = s.clientStockVisibility;
  const st = stockStatus(p);
  const showOut = vis !== "off" && st === "out";
  const showLow = vis === "acabando" && st === "low";

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-card shadow-soft ${showOut ? "opacity-60" : ""}`}>
      <div className="relative aspect-[4/3] w-full bg-paper">
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy" className={`h-full w-full object-cover ${showOut ? "grayscale" : ""}`} />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-secondary to-accent/40 text-5xl">{p.emoji}</div>
        )}
        {p.durationMin ? (
          <span className="absolute right-2 top-2 rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-semibold text-background">⏱ {p.durationMin}min</span>
        ) : null}
        {showOut && (
          <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">Esgotado</span>
        )}
        {showLow && (
          <span className="absolute left-2 top-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-background">Últimas {p.stock}</span>
        )}
      </div>
      <div className="p-3">
        <div className={`font-serif text-sm leading-tight line-clamp-1 ${showOut ? "line-through" : ""}`}>{p.name}</div>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground line-clamp-1">{p.barraca}</span>
          <span className="font-display text-primary text-base">R${p.price}</span>
        </div>
      </div>
    </div>
  );
}

function SalesStatusBanner() {
  const s = useStore();
  const ss = s.salesStatus;
  if (ss.topUps === "open" && ss.charges === "open") return null;
  if (ss.charges === "closed") {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-3.5 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <div className="font-semibold text-destructive">Vendas encerradas pelo organizador</div>
          <div className="text-xs text-foreground/70">As barracas não estão mais cobrando{ss.walletsActiveAfterClose ? " do saldo digital — fichas físicas ainda valem." : "."}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-warning/40 bg-warning/10 p-3.5 text-sm">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div>
        <div className="font-semibold text-warning">Recargas encerradas</div>
        <div className="text-xs text-foreground/70">Você ainda pode gastar o saldo nas barracas, mas não dá pra adicionar mais crédito.</div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl bg-card border border-border py-3 active:scale-95 transition shadow-soft"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">{icon}</span>
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

/* ----------------------------- Wallet card ---------------------------- */

function WalletCard() {
  const s = useStore();
  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="relative overflow-hidden rounded-3xl border-2 border-foreground bg-gradient-to-br from-primary via-[oklch(0.55_0.2_30)] to-[oklch(0.42_0.18_25)] p-5 text-primary-foreground shadow-pop"
    >
      {/* Shine */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-black/20 blur-2xl" />

      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest opacity-80">{s.event.name}</div>
          <div className="mt-0.5 text-xs opacity-90">Olá, {s.user.name}</div>
        </div>
        <span className="rounded-full bg-background/20 px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur">#{s.user.id.slice(-4)}</span>
      </div>

      <div className="mt-6">
        <div className="text-[10px] uppercase tracking-widest opacity-80">Saldo disponível</div>
        <div className="font-display text-5xl tracking-tight mt-1 tabular-nums">
          R$ <motion.span key={s.user.balance} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block">{s.user.balance}</motion.span>
          <span className="text-2xl opacity-70">,00</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-[11px] opacity-80">
        <span>{s.event.org}</span>
        <span className="tabular-nums">**** {s.user.id.slice(-4)}</span>
      </div>
    </motion.div>
  );
}

/* -------------------------------- QR view ----------------------------- */

function QrView() {
  const s = useStore();
  const [tick, setTick] = useState(60);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => (t <= 1 ? 60 : t - 1)), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="pt-2">
      <h1 className="font-serif text-2xl">Mostre na barraca</h1>
      <p className="text-sm text-muted-foreground">O atendente escaneia este código pra debitar.</p>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mt-5 rounded-3xl border-2 border-foreground bg-paper p-6 shadow-pop"
      >
        <div className="grid place-items-center">
          <div className="rounded-2xl bg-background p-4">
            <QRCodeSVG value={`festacash://user/${s.user.id}?t=${tick}`} size={220} bgColor="transparent" fgColor="oklch(0.22 0.06 35)" />
          </div>
          <div className="mt-4 font-display text-base tracking-widest">#{s.user.id.toUpperCase()}</div>
          <div className="mt-1 text-xs text-muted-foreground">renova em <span className="font-semibold text-foreground tabular-nums">{tick}s</span></div>
        </div>
      </motion.div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { k: "Saldo", v: `R$${s.user.balance}` },
          { k: "Compras", v: s.sales.filter((x) => x.user === s.user.name).length },
          { k: "Evento", v: "ativo" },
        ].map((x) => (
          <div key={x.k} className="rounded-xl bg-secondary py-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{x.k}</div>
            <div className="font-display text-base">{x.v}</div>
          </div>
        ))}
      </div>

      <OfflineWalletCard />
    </div>
  );
}

/* ----------------------- Carteira offline (cliente) -------------------- */

function OfflineWalletCard() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [passphrase, setPassphrase] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [issued, setIssued] = useState<Wallet | null>(null);

  const max = s.user.balance;

  const generate = () => {
    setErr(null);
    try {
      const w = convertBalanceToWallet({ amount, passphrase: passphrase || undefined });
      setIssued(w);
    } catch (e: any) { setErr(e?.message ?? "Erro"); }
  };

  const reset = () => { setIssued(null); setAmount(0); setPassphrase(""); setErr(null); setOpen(false); };

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setOpen(true)}
        disabled={max <= 0}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-foreground/40 bg-card p-4 text-left shadow-soft active:scale-[0.99] disabled:opacity-50"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-foreground text-background"><WifiOff className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-base leading-tight">Salvar carteira offline</div>
          <div className="text-[11px] text-muted-foreground">Gere uma ficha em PDF com QR Code pra usar na festa mesmo sem internet.</div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 sm:place-items-center"
            onClick={reset}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl border-2 border-foreground bg-card p-6 shadow-pop sm:rounded-3xl"
            >
              {!issued ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><WifiOff className="h-6 w-6" /></span>
                    <div>
                      <h3 className="font-serif text-2xl leading-tight">Gerar ficha offline</h3>
                      <p className="text-xs text-muted-foreground">Você converte parte do saldo digital em uma ficha com QR — vale como dinheiro nas barracas, sem precisar de internet.</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-secondary p-3 text-sm">
                    Saldo disponível: <span className="font-display text-lg text-primary">R$ {max}</span>
                  </div>

                  <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor a converter</label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {[10, 25, 50, max].filter((v, i, a) => v > 0 && v <= max && a.indexOf(v) === i).map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmount(v)}
                        className={`rounded-xl border-2 py-2.5 font-display text-base ${amount === v ? "border-foreground bg-accent" : "border-border bg-background"}`}
                      >R${v}</button>
                    ))}
                  </div>
                  <input
                    type="number" min={1} max={max}
                    value={amount || ""}
                    onChange={(e) => setAmount(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
                    placeholder="0"
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-display text-2xl"
                  />

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Palavra-chave (opcional)</span>
                    <span className="text-[10px] text-muted-foreground">🔒 anti-foto</span>
                  </div>
                  <input
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value.slice(0, 16))}
                    placeholder="Ex.: PIPOCA, FORRO, 1234..."
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm uppercase tracking-wider"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                    Se você for emprestar a ficha, combine essa palavra com a pessoa. A barraca pede antes de cobrar — sem ela, foto do QR não vale.
                  </p>

                  {err && <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}

                  <div className="mt-6 flex gap-2">
                    <button onClick={reset} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold">Cancelar</button>
                    <button
                      onClick={generate}
                      disabled={amount <= 0 || amount > max}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-50"
                    >
                      <DownloadIcon className="h-4 w-4" /> Gerar ficha de R$ {amount}
                    </button>
                  </div>
                </>
              ) : (
                <WalletReceipt
                  wallet={issued}
                  event={s.event}
                  operator={`Cliente: ${s.user.name}`}
                  method="saldo digital"
                  onClose={reset}
                  onPrint={() => { if (typeof window !== "undefined") window.print(); }}
                />
              )}
              <PrintStyles />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------- Buy view ---------------------------- */

function BuyView({ onDone }: { onDone: (m: string) => void }) {
  const s = useStore();
  const [name, setName] = useState(s.user.name === "Visitante" ? "" : s.user.name);
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState<"pix" | "credito" | "mp">("pix");
  const [loading, setLoading] = useState(false);

  const buy = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    addCredits(amount, name.trim());
    setLoading(false);
    onDone(`R$ ${amount},00 adicionados. Bom arraiá!`);
  };

  return (
    <div className="pt-2">
      <h1 className="font-serif text-2xl">Comprar créditos</h1>
      <p className="text-sm text-muted-foreground">Cai direto na conta da {s.event.org}.</p>

      <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Seu nome</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Como você quer ser chamado(a)"
        className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {[20, 50, 100, 150, 200, 300].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={`rounded-xl border-2 py-3 font-display text-lg active:scale-95 transition ${
              amount === v ? "border-foreground bg-accent" : "border-border bg-background"
            }`}
          >
            R${v}
          </button>
        ))}
      </div>

      <div className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pagamento</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {([
          { k: "pix", l: "Pix", e: "⚡" },
          { k: "credito", l: "Crédito", e: "💳" },
          { k: "mp", l: "Mercado Pago", e: "💙" },
        ] as const).map((m) => (
          <button
            key={m.k}
            onClick={() => setMethod(m.k)}
            className={`rounded-xl border py-3 text-xs font-semibold active:scale-95 transition ${
              method === m.k ? "border-foreground bg-foreground text-background" : "border-border bg-secondary"
            }`}
          >
            <div className="text-base">{m.e}</div>
            <div>{m.l}</div>
          </button>
        ))}
      </div>

      {/* Para onde vai o dinheiro — confiança */}
      <div className="mt-6 rounded-2xl border-2 border-foreground bg-card p-4 shadow-pop">
        <div className="flex items-center gap-2">
          <span className="text-base">🔒</span>
          <div className="font-serif text-sm">Para onde vai o seu dinheiro</div>
        </div>
        {(() => {
          const fee = s.platformFee ?? 0.02;
          const platform = Math.round(amount * fee * 100) / 100;
          const org = Math.round((amount - platform) * 100) / 100;
          return (
            <div className="mt-3 space-y-2 text-xs">
              <Row label={`${s.event.org}`} sub={s.split.status === "connected" ? `MP · ${s.split.holder}` : "conta não conectada"} value={`R$ ${org.toFixed(2)}`} strong />
              <Row label="FestaCash (taxa do app)" sub={`${(fee * 100).toFixed(1)}% sobre o valor`} value={`R$ ${platform.toFixed(2)}`} />
              <div className="rounded-xl bg-secondary p-2 text-[11px] text-muted-foreground">
                ✓ Split feito direto pelo Mercado Pago. A FestaCash <span className="font-semibold">não recebe</span> nem segura o valor da {s.event.org}.
              </div>
            </div>
          );
        })()}
      </div>

      <button
        disabled={!name.trim() || loading || s.split.status !== "connected" || s.salesStatus.topUps === "closed"}
        onClick={buy}
        className="mt-4 w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-pop active:scale-[0.98] transition disabled:opacity-50"
      >
        {loading ? "Processando..." : s.salesStatus.topUps === "closed" ? "Recargas encerradas" : s.split.status !== "connected" ? "Organizador não conectou conta" : `Pagar R$ ${amount},00`}
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Pagamento seguro · split automático Mercado Pago</p>
    </div>
  );
}

function Row({ label, sub, value, strong }: { label: string; sub?: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className={`truncate ${strong ? "font-semibold" : ""}`}>{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
      <div className={`shrink-0 font-display ${strong ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

/* ----------------------------- Transfer sheet ------------------------- */

function TransferSheet({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const [amount, setAmount] = useState(10);

  const send = () => {
    try { transfer(amount); onDone(`R$ ${amount},00 enviados.`); }
    catch (e: any) { onDone(e.message); }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 z-30 bg-foreground/40"
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl border-t-2 border-foreground bg-card p-5 shadow-pop"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-foreground/20" />
        <h3 className="mt-3 font-serif text-xl">Enviar para um amigo</h3>
        <p className="text-sm text-muted-foreground">Aproxime os celulares e escaneie o QR.</p>

        <div className="mt-4 grid place-items-center rounded-2xl border-2 border-dashed border-border bg-paper py-8 text-center">
          <div className="font-display text-4xl">📷</div>
          <div className="mt-1 text-xs text-muted-foreground">Toque para abrir a câmera</div>
        </div>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold">Cancelar</button>
          <button onClick={send} className="flex-1 rounded-full bg-foreground py-3 font-semibold text-background active:scale-[0.98] transition">
            Enviar R$ {amount}
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ------------------------------ History ------------------------------- */

function HistoryView({ onToast }: { onToast: (m: string) => void }) {
  const s = useStore();
  const list = s.sales.filter((x) => x.user === s.user.name);
  const total = list.reduce((a, x) => a + x.price, 0);

  return (
    <div className="pt-2">
      <h1 className="font-serif text-2xl">Extrato</h1>
      <p className="text-sm text-muted-foreground">Tudo que você comprou e consumiu na festa.</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-secondary p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo atual</div>
          <div className="font-display text-2xl text-primary">R$ {s.user.balance}</div>
        </div>
        <div className="rounded-2xl bg-secondary p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Consumido</div>
          <div className="font-display text-2xl">R$ {total}</div>
        </div>
      </div>

      <PolicyBanner onAction={onToast} />

      {list.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
          <div className="font-display text-4xl">🎈</div>
          <p className="mt-2 text-sm text-muted-foreground">Nada aqui ainda. Vai lá!</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {list.map((h) => (
            <li key={h.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-2xl">🧾</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{h.product}</div>
                <div className="text-[11px] text-muted-foreground">{h.barraca} · {fmtTime(h.at)}</div>
              </div>
              <div className="font-display text-primary">- R${h.price}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------- Bottom bar ----------------------------- */

function BottomBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Início", icon: <Home className="h-5 w-5" /> },
    { id: "catalogo", label: "Catálogo", icon: <ShoppingBag className="h-5 w-5" /> },
    { id: "comprar", label: "Comprar", icon: <Plus className="h-6 w-6" /> },
    { id: "qr", label: "QR", icon: <QrIcon className="h-5 w-5" /> },
    { id: "historico", label: "Extrato", icon: <History className="h-5 w-5" /> },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => {
          const active = tab === it.id;
          const isCenter = it.id === "comprar";
          return (
            <button
              key={it.id}
              onClick={() => onTab(it.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 active:scale-95 transition"
            >
              {isCenter ? (
                <span className={`-mt-6 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-pop ring-4 ring-background ${active ? "scale-105" : ""}`}>
                  {it.icon}
                </span>
              ) : (
                <span className={`transition ${active ? "text-primary" : "text-foreground/50"}`}>{it.icon}</span>
              )}
              {!isCenter && <span className={`text-[10px] font-semibold ${active ? "text-primary" : "text-foreground/50"}`}>{it.label}</span>}
              {active && !isCenter && (
                <motion.span layoutId="tab-dot" className="absolute -top-0 h-1 w-6 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

