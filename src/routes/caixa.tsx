import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Banknote, Printer, ScanLine, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import { issueWallet, useStore, type Wallet } from "@/lib/festa-store";

export const Route = createFileRoute("/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa — FestaCash" },
      { name: "description", content: "Bilheteria da festa: receba dinheiro/Pix e emita uma fichinha com QR Code de crédito pra usar nas barracas." },
    ],
  }),
  component: CaixaPage,
});

const PRESETS = [10, 20, 30, 50, 75, 100];

function CaixaPage() {
  const s = useStore();
  const [holder, setHolder] = useState("");
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState<"dinheiro" | "pix" | "credito">("dinheiro");
  const [passphrase, setPassphrase] = useState("");
  const [issued, setIssued] = useState<Wallet | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const operator = "Bilheteria";

  const todays = useMemo(
    () =>
      s.wallets
        .filter((w) => Date.now() - w.issuedAt < 24 * 60 * 60 * 1000)
        .slice(0, 8),
    [s.wallets],
  );
  const totalToday = todays.reduce((a, w) => a + (w.balance + w.consumed), 0);

  const issue = () => {
    setIssueError(null);
    try {
      const w = issueWallet({
        holder: holder || undefined,
        amount,
        issuedBy: operator,
        passphrase: passphrase || undefined,
      });
      setIssued(w);
    } catch (e: any) {
      setIssueError(e?.message ?? "Erro ao emitir ficha");
    }
  };

  const printNow = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <SiteHeader />
        <Bunting />
      </div>

      <main className="mx-auto max-w-5xl px-5 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="print:hidden">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Bilheteria</div>
          <h1 className="font-serif text-4xl">Caixa do evento</h1>
          <p className="text-sm text-muted-foreground">
            Para quem chegou sem app, sem internet ou prefere pagar em dinheiro.
            Receba o valor, gere a fichinha com QR Code e imprima — o cliente
            apresenta na barraca e o atendente debita.
          </p>
        </div>

        {/* Telão da ficha emitida */}
        {issued && (
          <Receipt
            wallet={issued}
            event={s.event}
            operator={operator}
            method={method}
            onClose={() => { setIssued(null); setHolder(""); setAmount(50); setPassphrase(""); setIssueError(null); }}
            onPrint={printNow}
          />
        )}

        {!issued && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            {/* Form */}
            <section className="rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Banknote className="h-6 w-6" /></span>
                <div>
                  <h2 className="font-serif text-2xl leading-tight">Nova ficha</h2>
                  <p className="text-xs text-muted-foreground">Cliente paga aqui · ficha vale como saldo nas barracas</p>
                </div>
              </div>

              <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome (opcional)</label>
              <input
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                placeholder="Pulseira anônima ou nome do(a) cliente"
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {PRESETS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className={`rounded-xl border-2 py-3 font-display text-lg transition active:scale-95 ${
                      amount === v ? "border-foreground bg-accent" : "border-border bg-background"
                    }`}
                  >
                    R${v}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-display text-xl outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Forma de pagamento</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([
                  { k: "dinheiro", l: "Dinheiro", e: "💵" },
                  { k: "pix",      l: "Pix",      e: "⚡" },
                  { k: "credito",  l: "Cartão",   e: "💳" },
                ] as const).map((m) => (
                  <button
                    key={m.k}
                    onClick={() => setMethod(m.k)}
                    className={`rounded-xl border py-3 text-xs font-semibold transition active:scale-95 ${
                      method === m.k ? "border-foreground bg-foreground text-background" : "border-border bg-secondary"
                    }`}
                  >
                    <div className="text-base">{m.e}</div>
                    <div>{m.l}</div>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Palavra-chave (opcional)</div>
                <span className="text-[10px] text-muted-foreground">🔒 anti-foto</span>
              </div>
              <input
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value.slice(0, 16))}
                placeholder="Ex.: PIPOCA, 1234, FORRO..."
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Combine algo simples com o cliente <span className="font-semibold">de boca</span>. A barraca vai pedir antes de debitar — se alguém fotografar o QR, sem a palavra não usa.
              </p>

              {issueError && (
                <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{issueError}</div>
              )}

              <button
                onClick={issue}
                disabled={amount <= 0}
                className="mt-6 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground shadow-pop active:scale-[0.99] transition disabled:opacity-50"
              >
                Emitir ficha de R$ {amount}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                A ficha é uma carteira offline com QR Code próprio. Pode imprimir e entregar ao cliente.
              </p>
            </section>

            {/* Resumo + últimas fichas */}
            <aside className="space-y-4">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendido neste turno</div>
                <div className="mt-1 font-display text-3xl">R$ {totalToday.toLocaleString("pt-BR")}</div>
                <div className="mt-1 text-xs text-muted-foreground">{todays.length} ficha{todays.length === 1 ? "" : "s"} emitida{todays.length === 1 ? "" : "s"} hoje</div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg">Últimas fichas</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><ScanLine className="h-3.5 w-3.5" /> validadas nas barracas</span>
                </div>
                {todays.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Nenhuma ficha emitida ainda.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {todays.map((w) => (
                      <li key={w.code} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <div className="font-mono text-xs tracking-wider">{w.code}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {w.holder ?? "anônima"} · {new Date(w.issuedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-primary">R${w.balance}</div>
                          <div className="text-[10px] text-muted-foreground">de R${w.balance + w.consumed}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      <PrintStyles />
    </div>
  );
}

/* ------------------------------ Receipt ------------------------------- */

function Receipt({
  wallet,
  event,
  operator,
  method,
  onClose,
  onPrint,
}: {
  wallet: Wallet;
  event: { name: string; org: string; date: string };
  operator: string;
  method: string;
  onClose: () => void;
  onPrint: () => void;
}) {
  const qrValue = `festacash://wallet/${wallet.code}`;

  return (
    <>
      {/* Toolbar (não imprime) */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Ficha emitida</div>
          <div className="font-serif text-2xl">R$ {wallet.balance + wallet.consumed} liberados</div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold">
            <X className="h-4 w-4" /> Nova ficha
          </button>
          <button onClick={onPrint} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background shadow-pop">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* Ticket — duas vias (cliente + canhoto) */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 print:mt-0 print:grid-cols-2 print:gap-0">
        <Ticket variant="cliente" wallet={wallet} event={event} operator={operator} method={method} qrValue={qrValue} />
        <Ticket variant="canhoto" wallet={wallet} event={event} operator={operator} method={method} qrValue={qrValue} />
      </div>
    </>
  );
}

function Ticket({
  variant,
  wallet,
  event,
  operator,
  method,
  qrValue,
}: {
  variant: "cliente" | "canhoto";
  wallet: Wallet;
  event: { name: string; org: string; date: string };
  operator: string;
  method: string;
  qrValue: string;
}) {
  const total = wallet.balance + wallet.consumed;
  return (
    <article className="ticket relative overflow-hidden rounded-3xl border-2 border-dashed border-foreground bg-card p-5 print:rounded-none print:border print:border-dashed print:m-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{variant === "cliente" ? "Via do cliente" : "Canhoto · controle"}</div>
          <div className="font-serif text-lg leading-tight">{event.name}</div>
          <div className="text-[11px] text-muted-foreground">{event.org} · {event.date}</div>
        </div>
        <div className="rounded-xl bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">FestaCash</div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="rounded-2xl border border-border bg-background p-2">
          <QRCodeSVG value={qrValue} size={120} bgColor="transparent" fgColor="oklch(0.22 0.06 35)" level="H" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saldo</div>
          <div className="font-display text-3xl text-primary leading-none">R$ {total}</div>
          <div className="mt-2 font-mono text-xs tracking-[0.2em]">{wallet.code}</div>
          {wallet.holder && <div className="mt-1 text-[11px] text-muted-foreground truncate">{wallet.holder}</div>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1 text-[10px]">
        <Info k="Forma" v={method} />
        <Info k="Caixa" v={operator} />
        <Info k="Emitida" v={new Date(wallet.issuedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} />
      </div>

      {wallet.passphrase && variant === "canhoto" && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-foreground/40 bg-warning/10 px-3 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Palavra-chave (controle interno)</div>
          <div className="font-mono text-base tracking-[0.25em] text-foreground">{wallet.passphrase}</div>
        </div>
      )}

      {variant === "cliente" ? (
        <p className="mt-4 rounded-xl bg-secondary p-2.5 text-[10px] leading-snug text-muted-foreground">
          📱 Mostre este QR Code na barraca. O atendente escaneia e debita o valor do item. Guarde até o fim do evento.
          {wallet.passphrase && (
            <> <span className="font-semibold text-foreground">🔒 Esta ficha tem palavra-chave</span> — combine de boca com quem comprou. A barraca vai pedir antes de cobrar.</>
          )}
        </p>
      ) : (
        <p className="mt-4 rounded-xl bg-secondary p-2.5 text-[10px] leading-snug text-muted-foreground">
          ✂️ Destaque e arquive — comprovante de venda no caixa.
        </p>
      )}

      {/* Cortes */}
      <span className="pointer-events-none absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
      <span className="pointer-events-none absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
    </article>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-secondary px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="truncate font-semibold capitalize">{v}</div>
    </div>
  );
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4; margin: 12mm; }
        body { background: white !important; }
      }
    `}</style>
  );
}
