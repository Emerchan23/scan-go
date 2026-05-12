import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, Minus, Plus, ScanLine, Search, Trash2, Undo2, X } from "lucide-react";
import { InstallPrompt } from "@/components/install-prompt";
import { cancelSale, chargeProduct, stockStatus, useStore, verifyWalletAccess, type Barraca, type Product, type Wallet } from "@/lib/festa-store";

const BARRACA_KEY = "festacash:current-barraca";

export const Route = createFileRoute("/barraca")({
  head: () => ({
    meta: [
      { title: "PDV — FestaCash" },
      { name: "description", content: "PDV da barraca: escaneie o QR Code do cliente, monte o pedido e cobre em segundos." },
    ],
  }),
  component: BarracaApp,
});

type CartItem = { product: Product; qty: number };

function BarracaApp() {
  const s = useStore();
  const [currentId, setCurrentId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(BARRACA_KEY);
  });

  const current = useMemo<Barraca | null>(
    () => s.barracas.find((b) => b.id === currentId) ?? null,
    [s.barracas, currentId],
  );

  const pickBarraca = (id: string) => {
    setCurrentId(id);
    if (typeof window !== "undefined") localStorage.setItem(BARRACA_KEY, id);
  };
  const switchBarraca = () => {
    setCurrentId(null);
    if (typeof window !== "undefined") localStorage.removeItem(BARRACA_KEY);
  };

  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [success, setSuccess] = useState<{ total: number; balance: number; items: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Quando preenchida, o pedido é debitado da fichinha (offline). */
  const [ficha, setFicha] = useState<{ wallet: Wallet; passphrase: string } | null>(null);
  const [showFichaModal, setShowFichaModal] = useState(false);

  // Produtos liberados pra esta barraca (N:N).
  const allowed = useMemo(() => {
    if (!current) return [] as Product[];
    return s.products.filter((p) => current.productIds.includes(p.id));
  }, [s.products, current]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allowed.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [allowed, q]);

  const total = cart.reduce((a, c) => a + c.product.price * c.qty, 0);
  const totalQty = cart.reduce((a, c) => a + c.qty, 0);




  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 2500);
    return () => clearTimeout(t);
  }, [error]);

  const startScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 1400);
  };

  const reset = () => {
    setScanned(false);
    setCart([]);
    setSuccess(null);
    setError(null);
    setFicha(null);
  };

  const add = (p: Product) => {
    if (!scanned && !ficha) {
      setError("Escaneie o QR do cliente ou valide a fichinha primeiro");
      return;
    }
    if (s.salesStatus.charges === "closed" && (!ficha || !s.salesStatus.walletsActiveAfterClose)) {
      setError("Vendas encerradas pelo organizador");
      return;
    }
    if (typeof p.stock === "number" && p.stock <= 0) {
      setError(`${p.name} esgotou`);
      return;
    }
    setCart((c) => {
      const i = c.findIndex((x) => x.product.id === p.id);
      if (i >= 0) {
        const n = [...c];
        n[i] = { ...n[i], qty: n[i].qty + 1 };
        return n;
      }
      return [...c, { product: p, qty: 1 }];
    });
  };

  const dec = (id: string) =>
    setCart((c) => c.flatMap((x) => (x.product.id === id ? (x.qty <= 1 ? [] : [{ ...x, qty: x.qty - 1 }]) : [x])));

  const remove = (id: string) => setCart((c) => c.filter((x) => x.product.id !== id));

  const checkout = () => {
    if (cart.length === 0) return;
    const balance = ficha ? ficha.wallet.balance : s.user.balance;
    if (balance < total) {
      setError(`Saldo insuficiente. ${ficha ? "Ficha" : "Cliente"} tem R$ ${balance}`);
      return;
    }
    let lastBalance = balance;
    try {
      for (const item of cart) {
        for (let i = 0; i < item.qty; i++) {
          const r = chargeProduct(item.product.id, ficha?.wallet.code, ficha?.passphrase);
          lastBalance = r.balance;
        }
      }
      setSuccess({ total, balance: lastBalance, items: totalQty });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const validateFicha = (code: string, passphrase: string) => {
    try {
      const w = verifyWalletAccess(code, passphrase);
      setFicha({ wallet: w, passphrase: passphrase.trim().toUpperCase() });
      setScanned(true);
      setShowFichaModal(false);
      setError(null);
    } catch (e: any) {
      throw e;
    }
  };

  // Tela inicial: escolher qual barraca eu sou.
  if (!current) {
    return (
      <div className="min-h-[100svh] bg-background">
        <div
          className="relative mx-auto flex min-h-[100svh] w-full max-w-md flex-col bg-background"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <header className="px-5 pt-4 pb-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">PDV · {s.event.name}</div>
            <h1 className="font-serif text-2xl">Em qual barraca você está?</h1>
            <p className="text-sm text-muted-foreground">Vamos liberar só os itens que essa barraca vende.</p>
          </header>
          <ul className="flex-1 space-y-2 overflow-y-auto px-5 pt-4 pb-10">
            {s.barracas.length === 0 && (
              <li className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhuma barraca cadastrada.<br />Peça pro organizador criar no painel Admin.
              </li>
            )}
            {s.barracas.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => pickBarraca(b.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft active:scale-[0.99] active:border-foreground transition"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-2xl">{b.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-lg leading-tight">{b.name}</span>
                    <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                      {b.attendant ? `Atendente: ${b.attendant} · ` : ""}{b.productIds.length} {b.productIds.length === 1 ? "item" : "itens"}
                    </span>
                  </span>
                  <span className="text-foreground/40">›</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <InstallPrompt appName="FestaCash PDV" />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-background">
      <div
        className="relative mx-auto flex min-h-[100svh] w-full max-w-md flex-col bg-background"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >

        {/* Top bar */}
        <header className="flex items-center justify-between px-5 pt-2 pb-3">
          <button onClick={reset} className="grid h-10 w-10 place-items-center rounded-full bg-secondary active:scale-95 transition">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={switchBarraca} className="text-center leading-tight active:scale-95 transition">
            <div className="font-display text-base">{current.emoji} PDV · {current.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {current.attendant ? `Atendente: ${current.attendant}` : "Toque pra trocar"} · trocar
            </div>
          </button>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-success/15 text-success text-xs font-bold">●</span>
        </header>

        {/* Customer strip */}
        <div className="px-5">
          <AnimatePresence mode="wait">
            {!scanned ? (
              <motion.div
                key="scan-cta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <button
                  onClick={startScan}
                  className="relative grid w-full place-items-center overflow-hidden rounded-3xl border-2 border-foreground bg-foreground text-background py-10 active:scale-[0.99] transition"
                >
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-background/10 backdrop-blur">
                    <ScanLine className="h-8 w-8" />
                  </div>
                  <div className="mt-3 font-serif text-xl">Escanear cliente</div>
                  <div className="text-xs opacity-70">QR do app · sem palavra-chave</div>
                  {scanning && (
                    <motion.div
                      initial={{ y: -120 }}
                      animate={{ y: 120 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="pointer-events-none absolute left-0 right-0 h-1 bg-primary shadow-[0_0_20px_oklch(0.62_0.21_35)]"
                    />
                  )}
                </button>
                <button
                  onClick={() => setShowFichaModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground/40 bg-card py-3 text-sm font-semibold active:scale-[0.99] transition"
                >
                  🎟️ Cobrar fichinha do caixa <span className="text-muted-foreground font-normal">(offline)</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="customer"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`flex items-center justify-between rounded-2xl border-2 ${ficha ? "border-warning bg-warning/5" : "border-foreground bg-card"} p-4 shadow-pop`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-display text-xl">
                    {ficha ? "🎟️" : (s.user.name === "Visitante" ? "C" : s.user.name)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{ficha ? "Fichinha · offline" : "Cliente"}</div>
                    <div className="font-serif text-lg leading-tight">
                      {ficha ? (ficha.wallet.holder ?? "Anônima") : (s.user.name === "Visitante" ? "Convidado" : s.user.name)}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {ficha ? ficha.wallet.code : `#${s.user.id.slice(-4)}`}
                      {ficha && <span className="ml-1 text-success">· 🔒 validada</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo</div>
                  <div className="font-display text-2xl text-primary tabular-nums">R${ficha ? ficha.wallet.balance : s.user.balance}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search */}
        <div className="px-5 mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Buscar em ${current.name}...`}
              className="w-full rounded-full border border-border bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {allowed.length === 0 && (
            <div className="mt-3 rounded-2xl border-2 border-dashed border-warning/40 bg-warning/5 p-4 text-xs text-foreground/70">
              Esta barraca ainda não tem produtos liberados. Peça pro organizador atribuir itens em <span className="font-semibold">Admin → Barracas</span>.
            </div>
          )}
          {s.salesStatus.charges === "closed" && (
            <div className="mt-3 rounded-2xl border-2 border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              <b>Vendas encerradas.</b> {s.salesStatus.walletsActiveAfterClose ? "Só fichas físicas continuam debitando." : "Bloqueado para qualquer pagamento."}
            </div>
          )}
          {s.salesStatus.charges === "open" && s.salesStatus.topUps === "closed" && (
            <div className="mt-3 rounded-2xl border border-warning/40 bg-warning/5 p-3 text-xs text-foreground/70">
              ⏸ Recargas encerradas — clientes só podem gastar saldo já comprado.
            </div>
          )}
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-40">
          <div className="grid grid-cols-2 gap-3">
            {list.map((p) => {
              const inCart = cart.find((c) => c.product.id === p.id);
              const st = stockStatus(p);
              const out = st === "out";
              return (
                <motion.button
                  key={p.id}
                  whileTap={out ? undefined : { scale: 0.96 }}
                  onClick={() => add(p)}
                  disabled={out}
                  className={`group relative overflow-hidden rounded-2xl border border-border bg-card text-left shadow-soft active:border-foreground ${out ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="relative aspect-[4/3] w-full bg-paper">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className={`h-full w-full object-cover ${out ? "grayscale" : ""}`} />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-5xl">{p.emoji}</div>
                    )}
                    {p.durationMin ? (
                      <span className="absolute right-2 top-2 rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-semibold text-background">⏱ {p.durationMin}min</span>
                    ) : null}
                    {inCart && (
                      <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-pop">
                        {inCart.qty}
                      </span>
                    )}
                    {out && (
                      <span className="absolute inset-x-2 bottom-2 rounded-full bg-destructive px-2 py-0.5 text-center text-[10px] font-bold text-destructive-foreground">Esgotado</span>
                    )}
                    {st === "low" && !out && (
                      <span className="absolute right-2 bottom-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-background">Restam {p.stock}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className={`font-serif text-sm leading-tight line-clamp-1 ${out ? "line-through" : ""}`}>{p.name}</div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{p.barraca}</span>
                      <span className="font-display text-primary text-sm">R${p.price}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Error toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="absolute bottom-28 left-5 right-5 z-30 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-pop"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cart sheet */}
        <CartSheet
          cart={cart}
          total={total}
          totalQty={totalQty}
          balance={ficha ? ficha.wallet.balance : s.user.balance}
          enabled={(scanned || !!ficha) && cart.length > 0}
          onDec={dec}
          onInc={(id) => {
            const p = s.products.find((x) => x.id === id);
            if (p) add(p);
          }}
          onRemove={remove}
          onCheckout={checkout}
        />

        {/* Success modal */}
        <AnimatePresence>
          {success && (
            <SuccessSheet success={success} onClose={reset} />
          )}
        </AnimatePresence>

        {/* Modal: validar fichinha (offline) */}
        <AnimatePresence>
          {showFichaModal && (
            <FichaModal
              onClose={() => setShowFichaModal(false)}
              onValidate={validateFicha}
            />
          )}
        </AnimatePresence>
      </div>
      <InstallPrompt appName="FestaCash PDV" />
    </div>
  );
}

/* ----------------------------- Cart sheet ----------------------------- */

function CartSheet({
  cart, total, totalQty, balance, enabled, onDec, onInc, onRemove, onCheckout,
}: {
  cart: CartItem[]; total: number; totalQty: number; balance: number; enabled: boolean;
  onDec: (id: string) => void; onInc: (id: string) => void; onRemove: (id: string) => void; onCheckout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const insufficient = enabled && total > balance;

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 z-30 bg-foreground/40"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute inset-x-0 bottom-0 z-40 max-h-[78%] rounded-t-3xl border-t-2 border-foreground bg-card p-5 shadow-pop"
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-foreground/20" />
              <div className="mt-3 flex items-center justify-between">
                <h3 className="font-serif text-xl">Pedido ({totalQty} {totalQty === 1 ? "item" : "itens"})</h3>
                <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-secondary"><X className="h-4 w-4" /></button>
              </div>

              <ul className="mt-4 max-h-[40vh] divide-y divide-border overflow-y-auto">
                {cart.map((c) => (
                  <li key={c.product.id} className="flex items-center gap-3 py-3">
                    <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-secondary text-2xl">
                      {c.product.image ? <img src={c.product.image} alt="" className="h-full w-full object-cover" /> : c.product.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-sm">{c.product.name}</div>
                      <div className="text-[11px] text-muted-foreground">R${c.product.price} cada</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onDec(c.product.id)} className="grid h-7 w-7 place-items-center rounded-full bg-secondary"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-5 text-center font-display text-sm tabular-nums">{c.qty}</span>
                      <button onClick={() => onInc(c.product.id)} className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-background"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button onClick={() => onRemove(c.product.id)} className="ml-1 grid h-8 w-8 place-items-center rounded-full text-muted-foreground active:bg-secondary"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>

              <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                <Row k="Subtotal" v={`R$ ${total}`} />
                <Row k="Saldo do cliente" v={`R$ ${balance}`} muted />
                <Row k="Após cobrar" v={`R$ ${Math.max(0, balance - total)}`} bold />
              </div>

              <button
                disabled={!enabled || insufficient}
                onClick={onCheckout}
                className="mt-4 w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-pop active:scale-[0.98] transition disabled:opacity-50"
              >
                {insufficient ? "Saldo insuficiente" : `Cobrar R$ ${total}`}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sticky cart bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <button
          disabled={!enabled}
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-full bg-foreground px-5 py-3.5 text-background active:scale-[0.99] transition disabled:opacity-40"
        >
          <span className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold tabular-nums">
              {totalQty}
            </span>
            <span className="font-semibold">Ver pedido</span>
          </span>
          <span className="font-display text-lg tabular-nums">R$ {total}</span>
        </button>
      </div>
    </>
  );
}

function Row({ k, v, muted, bold }: { k: string; v: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""} ${bold ? "font-display text-base" : ""}`}>
      <span>{k}</span><span className="tabular-nums">{v}</span>
    </div>
  );
}

/* ----------------------------- Success sheet -------------------------- */

function SuccessSheet({ success, onClose }: { success: { total: number; balance: number; items: number }; onClose: () => void }) {
  const closeRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    closeRef.current = setTimeout(onClose, 3500);
    return () => { if (closeRef.current) clearTimeout(closeRef.current); };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 grid place-items-center bg-foreground/60 p-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-pop"
      >
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 220 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success text-background"
        >
          <Check className="h-10 w-10" strokeWidth={3} />
        </motion.div>
        <h2 className="mt-4 font-serif text-2xl">Aprovado</h2>
        <p className="text-sm text-muted-foreground">{success.items} {success.items === 1 ? "item" : "itens"} debitados</p>

        <div className="mt-5 rounded-2xl bg-secondary p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cobrado</div>
          <div className="font-display text-4xl text-primary tabular-nums">R$ {success.total}</div>
          <div className="mt-1 text-xs text-muted-foreground">Saldo restante do cliente: <span className="font-semibold text-foreground">R$ {success.balance}</span></div>
        </div>

        <button onClick={onClose} className="mt-5 w-full rounded-full bg-foreground py-3 font-semibold text-background active:scale-[0.98] transition">
          Nova venda
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ----------------------------- Ficha modal ---------------------------- */

function FichaModal({
  onClose,
  onValidate,
}: {
  onClose: () => void;
  onValidate: (code: string, passphrase: string) => void;
}) {
  const [code, setCode] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    setErr(null);
    if (!code.trim()) { setErr("Informe o código da ficha"); return; }
    try {
      onValidate(code, pass);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao validar ficha");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 grid place-items-end sm:place-items-center bg-foreground/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-pop"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Fichinha do caixa</div>
            <h3 className="font-serif text-xl">Validar antes de cobrar</h3>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Código da ficha</label>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="F-XXXXXX"
          className="mt-1 w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-foreground"
        />

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Palavra-chave do cliente
        </label>
        <input
          value={pass}
          onChange={(e) => setPass(e.target.value.toUpperCase().slice(0, 16))}
          placeholder="Pergunte ao cliente"
          className="mt-1 w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-center font-mono text-lg tracking-[0.25em] outline-none focus:border-foreground"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Deixe em branco se a ficha foi emitida sem palavra-chave.
        </p>

        {err && (
          <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>
        )}

        <button
          onClick={submit}
          className="mt-5 w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-pop active:scale-[0.98] transition"
        >
          Validar ficha
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Se a palavra-chave não bater, a ficha não cobra. Proteção contra cópia/foto do QR.
        </p>
      </motion.div>
    </motion.div>
  );
}
