import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Battery, Bell, ChevronRight, History, Home, Plus, QrCode as QrIcon, Send, Settings, Signal, Wifi } from "lucide-react";

import { addCredits, transfer, useStore } from "@/lib/festa-store";

export const Route = createFileRoute("/cliente")({
  head: () => ({
    meta: [
      { title: "FestaCash — Sua carteira do evento" },
      { name: "description", content: "Compre créditos, mostre seu QR Code e transfira saldo para amigos." },
    ],
  }),
  component: ClientApp,
});

type Tab = "home" | "qr" | "comprar" | "transferir" | "historico";

function ClientApp() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("home");
  const [now, setNow] = useState(() => new Date());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="min-h-[100svh] bg-foreground/5">
      {/* Phone-like app shell */}
      <div className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col bg-background shadow-pop md:my-6 md:min-h-[860px] md:rounded-[44px] md:overflow-hidden md:ring-8 md:ring-foreground/90">
        <StatusBar now={now} />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 pt-2 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg shadow-pop">F</span>
            <div className="leading-tight">
              <div className="font-display text-base">FestaCash</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.event.org}</div>
            </div>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground/80 active:scale-95 transition">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notificações</span>
          </button>
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
              {tab === "home" && <HomeView onTab={setTab} />}
              {tab === "qr" && <QrView />}
              {tab === "comprar" && <BuyView onDone={(m) => { setToast(m); setTab("home"); }} />}
              {tab === "transferir" && <TransferView onDone={setToast} />}
              {tab === "historico" && <HistoryView />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom tab bar */}
        <BottomBar tab={tab} onTab={setTab} />
      </div>
    </div>
  );
}

/* ----------------------------- Status bar ----------------------------- */

function StatusBar({ now }: { now: Date }) {
  const t = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold text-foreground/80">
      <span className="tabular-nums">{t}</span>
      <div className="flex items-center gap-1.5">
        <Signal className="h-3.5 w-3.5" />
        <Wifi className="h-3.5 w-3.5" />
        <Battery className="h-4 w-4" />
      </div>
    </div>
  );
}

/* ------------------------------ Home view ----------------------------- */

function HomeView({ onTab }: { onTab: (t: Tab) => void }) {
  const s = useStore();
  const recent = s.sales.filter((x) => x.user === s.user.name).slice(0, 3);

  return (
    <div>
      <WalletCard />

      {/* Quick actions */}
      <div className="mt-5 grid grid-cols-4 gap-2">
        <QuickAction icon={<Plus className="h-5 w-5" />} label="Comprar" onClick={() => onTab("comprar")} />
        <QuickAction icon={<QrIcon className="h-5 w-5" />} label="Meu QR" onClick={() => onTab("qr")} />
        <QuickAction icon={<Send className="h-5 w-5" />} label="Enviar" onClick={() => onTab("transferir")} />
        <QuickAction icon={<History className="h-5 w-5" />} label="Histórico" onClick={() => onTab("historico")} />
      </div>

      {/* Promo card */}
      <Link
        to="/catalogo"
        className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-accent to-secondary p-4 active:scale-[0.99] transition"
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-foreground text-background font-display text-2xl">🎪</div>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-base leading-tight">Veja o catálogo da festa</div>
          <div className="text-xs text-muted-foreground">Comidas, bebidas e brinquedos</div>
        </div>
        <ChevronRight className="h-5 w-5 text-foreground/50" />
      </Link>

      {/* Recent */}
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
    </div>
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

      <button
        disabled={!name.trim() || loading}
        onClick={buy}
        className="mt-6 w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-pop active:scale-[0.98] transition disabled:opacity-50"
      >
        {loading ? "Processando..." : `Pagar R$ ${amount},00`}
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Pagamento seguro · split automático</p>
    </div>
  );
}

/* ----------------------------- Transfer view -------------------------- */

function TransferView({ onDone }: { onDone: (m: string) => void }) {
  const [amount, setAmount] = useState(10);

  const send = () => {
    try {
      transfer(amount);
      onDone(`R$ ${amount},00 enviados.`);
    } catch (e: any) {
      onDone(e.message);
    }
  };

  return (
    <div className="pt-2">
      <h1 className="font-serif text-2xl">Enviar para um amigo</h1>
      <p className="text-sm text-muted-foreground">Aproxime os celulares e escaneie o QR.</p>

      <div className="mt-5 grid place-items-center rounded-3xl border-2 border-dashed border-border bg-paper py-12 text-center">
        <div className="font-display text-5xl">📷</div>
        <div className="mt-2 text-sm text-muted-foreground">Toque para abrir a câmera</div>
      </div>

      <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</label>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <button onClick={send} className="mt-5 w-full rounded-full bg-foreground py-3.5 font-semibold text-background active:scale-[0.98] transition">
        Enviar R$ {amount},00
      </button>
    </div>
  );
}

/* ------------------------------ History ------------------------------- */

function HistoryView() {
  const s = useStore();
  const list = s.sales.filter((x) => x.user === s.user.name);

  return (
    <div className="pt-2">
      <h1 className="font-serif text-2xl">Histórico</h1>
      <p className="text-sm text-muted-foreground">Tudo que você consumiu na festa.</p>

      {list.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
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
    { id: "qr", label: "QR", icon: <QrIcon className="h-5 w-5" /> },
    { id: "comprar", label: "Comprar", icon: <Plus className="h-6 w-6" /> },
    { id: "transferir", label: "Enviar", icon: <Send className="h-5 w-5" /> },
    { id: "historico", label: "Extrato", icon: <Settings className="h-5 w-5" /> },
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

