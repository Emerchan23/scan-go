import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Banknote, Download, FileDown, Printer, ScanLine, Search, ShieldAlert, Undo2, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import { closeShift, createRefundRequest, executeRefund, getOpenShift, issueWallet, openShift, searchSales, useStore, type CashShift, type Sale, type Wallet } from "@/lib/festa-store";

export const Route = createFileRoute("/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa — FestaCash" },
      { name: "description", content: "Bilheteria da festa: receba dinheiro/Pix e emita uma fichinha com QR Code de crédito pra usar nas barracas." },
      { name: "theme-color", content: "#a76b00" },
      { name: "apple-mobile-web-app-title", content: "Caixa" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "manifest", href: "/caixa.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon.svg" },
    ],
  }),
  component: CaixaPage,
});

const PRESETS = [10, 20, 30, 50, 75, 100];

function CaixaPage() {
  const s = useStore();
  const me = s.staff.find((x) => x.id === s.sessionStaffId);
  const myPerms = s.roles.find((r) => r.id === me?.roleId)?.permissions ?? [];
  const has = (p: string) => myPerms.includes("admin.full") || (myPerms as string[]).includes(p);
  const canIssue = has("caixa.issue");
  const canSearch = has("caixa.search_orders");
  const [tab, setTab] = useState<"emitir" | "pedidos">("emitir");
  const [holder, setHolder] = useState("");
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState<"dinheiro" | "pix" | "credito">("dinheiro");
  const [passphrase, setPassphrase] = useState("");
  const [issued, setIssued] = useState<Wallet | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const operator = me?.name ?? "Bilheteria";

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

          {!me && (
            <div className="mt-3 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-xs">
              Você não está logado. <Link to="/login" className="font-semibold underline">Entrar</Link> com seu PIN para registrar quem operou cada ficha/estorno.
            </div>
          )}

          {(canIssue || canSearch) && (
            <div className="mt-5 inline-flex rounded-full border border-border bg-secondary p-1">
              {canIssue && (
                <button onClick={() => setTab("emitir")} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "emitir" ? "bg-foreground text-background" : "text-foreground/70"}`}>
                  Emitir ficha
                </button>
              )}
              {canSearch && (
                <button onClick={() => setTab("pedidos")} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "pedidos" ? "bg-foreground text-background" : "text-foreground/70"}`}>
                  Pedidos / Reembolso
                </button>
              )}
            </div>
          )}

          {me && canIssue && <ShiftPanel staffId={me.id} staffName={me.name} />}
        </div>

        {tab === "pedidos" && canSearch && (
          <OrdersPanel operator={operator} canExecute={has("refund.execute")} canRequest={has("refund.request")} />
        )}

        {tab === "emitir" && !canIssue && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            <ShieldAlert className="mx-auto h-8 w-8 text-warning" />
            <p className="mt-2">Seu perfil não tem permissão para emitir fichas.</p>
          </div>
        )}

        {/* Telão da ficha emitida */}
        {tab === "emitir" && canIssue && issued && (
          <Receipt
            wallet={issued}
            event={s.event}
            operator={operator}
            method={method}
            onClose={() => { setIssued(null); setHolder(""); setAmount(50); setPassphrase(""); setIssueError(null); }}
            onPrint={printNow}
          />
        )}

        {tab === "emitir" && canIssue && !issued && (
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

export function Receipt({
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
  const qrCanvasRef = useRef<HTMLDivElement | null>(null);
  const [phone, setPhone] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState<null | "pdf" | "share">(null);

  const buildPdf = async (): Promise<{ doc: jsPDF; blob: Blob; filename: string }> => {
    const doc = new jsPDF({ unit: "mm", format: "a6", orientation: "portrait" });
    const W = doc.internal.pageSize.getWidth();
    const total = wallet.balance + wallet.consumed;

    // Borda
    doc.setDrawColor(40);
    doc.setLineDashPattern([1.5, 1.2], 0);
    doc.roundedRect(4, 4, W - 8, doc.internal.pageSize.getHeight() - 8, 4, 4);
    doc.setLineDashPattern([], 0);

    // Cabeçalho
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(event.name, W / 2, 14, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(`${event.org} · ${event.date}`, W / 2, 19, { align: "center" });

    doc.setFontSize(7);
    doc.text("FestaCash · Ficha digital", W / 2, 24, { align: "center" });

    // QR
    const canvas = qrCanvasRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      const qrSize = 50;
      doc.addImage(dataUrl, "PNG", (W - qrSize) / 2, 28, qrSize, qrSize);
    }

    // Saldo
    doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.text(`R$ ${total}`, W / 2, 88, { align: "center" });
    doc.setFont("courier", "normal"); doc.setFontSize(11);
    doc.text(wallet.code, W / 2, 95, { align: "center" });

    if (wallet.holder) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(wallet.holder, W / 2, 101, { align: "center" });
    }

    // Rodapé instruções
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    const tip = wallet.passphrase
      ? "Mostre este QR na barraca. Tem palavra-chave — combine de boca."
      : "Mostre este QR na barraca para pagar seus pedidos.";
    const lines = doc.splitTextToSize(tip, W - 16);
    doc.text(lines, W / 2, 110, { align: "center" });

    doc.setFontSize(6);
    doc.text(`Emitida ${new Date(wallet.issuedAt).toLocaleString("pt-BR")} · ${method}`, W / 2, 130, { align: "center" });

    const blob = doc.output("blob");
    return { doc, blob, filename: `ficha-${wallet.code}.pdf` };
  };

  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      const { doc, filename } = await buildPdf();
      doc.save(filename);
    } finally { setBusy(null); }
  };

  const shareWhatsApp = async () => {
    setBusy("share");
    try {
      const { blob, filename } = await buildPdf();
      const file = new File([blob], filename, { type: "application/pdf" });
      const text = `Sua ficha do ${event.name}\nCódigo: ${wallet.code}\nSaldo: R$ ${wallet.balance + wallet.consumed}${wallet.passphrase ? "\n🔒 Tem palavra-chave (combinada no caixa)." : ""}`;

      // Tenta Web Share API (mobile) com arquivo
      const navAny = navigator as any;
      if (navAny.canShare?.({ files: [file] })) {
        try {
          await navAny.share({ files: [file], text, title: "Ficha FestaCash" });
          return;
        } catch { /* user cancelled / fallback */ }
      }
      // Fallback: baixa o PDF e abre WhatsApp Web/App com texto
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      const cleanPhone = phone.replace(/\D/g, "");
      const wa = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text + "\n\n(Anexe a ficha que acabou de baixar)")}` 
        : `https://wa.me/?text=${encodeURIComponent(text + "\n\n(Anexe a ficha que acabou de baixar)")}`;
      window.open(wa, "_blank", "noopener,noreferrer");
    } finally { setBusy(null); setShareOpen(false); }
  };

  return (
    <>
      {/* QR oculto pra extrair PNG no PDF */}
      <div ref={qrCanvasRef} style={{ position: "absolute", left: -9999, top: -9999 }}>
        <QRCodeCanvas value={qrValue} size={512} level="H" includeMargin />
      </div>

      {/* Toolbar (não imprime) */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Ficha emitida</div>
          <div className="font-serif text-2xl">R$ {wallet.balance + wallet.consumed} liberados</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold">
            <X className="h-4 w-4" /> Nova ficha
          </button>
          <button
            onClick={downloadPdf}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-card px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" /> {busy === "pdf" ? "Gerando..." : "Baixar PDF"}
          </button>
          <button
            onClick={() => setShareOpen(true)}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-full bg-success px-4 py-2 text-sm font-semibold text-success-foreground shadow-pop disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M19.05 4.91A9.82 9.82 0 0 0 12 2a9.9 9.9 0 0 0-8.41 15.04L2 22l5.13-1.52A9.92 9.92 0 0 0 12 22a9.96 9.96 0 0 0 7.05-17.09zM12 20.27a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.05.9.81-2.97-.2-.31A8.27 8.27 0 1 1 12 20.27zm4.55-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.16.25-.64.81-.79.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43-.14-.01-.31-.01-.47-.01-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03 0 1.2.87 2.36.99 2.52.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.39.51.58.18 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.3z"/></svg>
            Enviar WhatsApp
          </button>
          <button onClick={onPrint} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-pop">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      {shareOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setShareOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
            <h3 className="font-serif text-2xl">Enviar pelo WhatsApp</h3>
            <p className="mt-1 text-xs text-muted-foreground">No celular, abre direto o WhatsApp com a ficha em PDF anexada. No computador, baixa o PDF e abre a conversa pra você anexar.</p>
            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Telefone do cliente (opcional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="55 11 9XXXX-XXXX"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">Inclua o DDI (55 = Brasil). Em branco, abre seleção de contato.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShareOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm">Cancelar</button>
              <button
                onClick={shareWhatsApp}
                disabled={busy === "share"}
                className="inline-flex items-center gap-1.5 rounded-full bg-success px-5 py-2 text-sm font-semibold text-success-foreground shadow-pop disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> {busy === "share" ? "Preparando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

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

export function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4; margin: 12mm; }
        body { background: white !important; }
      }
    `}</style>
  );
}

/* ----------------------------- OrdersPanel ----------------------------- */

function OrdersPanel({ operator, canExecute, canRequest }: { operator: string; canExecute: boolean; canRequest: boolean }) {
  const s = useStore();
  const [q, setQ] = useState("");
  const results = useMemo(() => (q.trim() ? searchSales(q) : s.sales.slice(0, 12)), [q, s.sales]);
  const [target, setTarget] = useState<Sale | null>(null);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Search className="h-6 w-6" /></span>
          <div>
            <h2 className="font-serif text-2xl leading-tight">Buscar pedido</h2>
            <p className="text-xs text-muted-foreground">Por código da ficha, ID da venda, cliente ou produto.</p>
          </div>
        </div>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="F-7K9XA2, espetinho, Maria, s_abc123..."
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm uppercase tracking-wider"
        />
        <ul className="mt-4 divide-y divide-border">
          {results.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nenhuma venda encontrada.</li>}
          {results.map((sale) => {
            const refunded = sale.refunded ?? 0;
            const remaining = sale.price - refunded;
            return (
              <li key={sale.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-serif text-base">{sale.product}</div>
                  <div className="text-[11px] text-muted-foreground">
                    <code className="font-mono">{sale.id.slice(-6).toUpperCase()}</code> · {sale.barraca} · {sale.user}
                    {sale.walletCode && <> · ficha <code className="font-mono">{sale.walletCode}</code></>}
                    {" · "}{new Date(sale.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-primary">R${sale.price}</div>
                  {refunded > 0 && <div className="text-[10px] text-warning">−R${refunded} estornado</div>}
                  {remaining > 0 ? (
                    <button onClick={() => setTarget(sale)} className="mt-1 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-semibold">
                      <Undo2 className="h-3 w-3" /> Reembolsar
                    </button>
                  ) : (
                    <div className="mt-1 text-[10px] text-muted-foreground">totalmente estornado</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Como funciona</div>
          <ul className="mt-2 space-y-2 text-sm">
            <li>1. Busque a venda pelo código que o cliente trouxer.</li>
            <li>2. Confirme o produto e o valor com o cliente.</li>
            <li>3. Escolha estornar direto ou abrir solicitação pro Admin — depende do seu perfil.</li>
            <li>4. Motivo é obrigatório e fica em log de auditoria.</li>
          </ul>
        </div>
        {!canExecute && !canRequest && (
          <div className="rounded-3xl border border-warning/40 bg-warning/10 p-4 text-xs">
            Seu perfil pode buscar pedidos, mas não pode estornar nem solicitar reembolsos.
          </div>
        )}
      </aside>

      {target && (
        <RefundDialog
          sale={target}
          operator={operator}
          canExecute={canExecute}
          canRequest={canRequest}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

function RefundDialog({ sale, operator, canExecute, canRequest, onClose }: { sale: Sale; operator: string; canExecute: boolean; canRequest: boolean; onClose: () => void }) {
  const max = sale.price - (sale.refunded ?? 0);
  const [amount, setAmount] = useState(max);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = (mode: "execute" | "request") => {
    setErr(null);
    try {
      if (mode === "execute") {
        executeRefund({ saleId: sale.id, amount, reason, by: operator });
        setDone(`Estornado R$ ${amount} para o cliente.`);
      } else {
        createRefundRequest({ saleId: sale.id, amount, reason, requestedBy: operator });
        setDone(`Solicitação enviada ao Admin (R$ ${amount}).`);
      }
    } catch (e: any) { setErr(e?.message ?? "Erro"); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl">Reembolso</h3>
          <button onClick={onClose} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Fechar</button>
        </div>

        {done ? (
          <div className="mt-5">
            <div className="rounded-2xl border border-success/40 bg-success/10 p-4 text-sm text-success">{done}</div>
            <button onClick={onClose} className="mt-4 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground">OK</button>
          </div>
        ) : (
          <>
            <div className="mt-3 rounded-2xl bg-secondary p-3 text-sm">
              <div className="font-serif text-base">{sale.product}</div>
              <div className="text-[11px] text-muted-foreground">
                R${sale.price} · {sale.barraca}
                {sale.walletCode && <> · ficha <code className="font-mono">{sale.walletCode}</code></>}
              </div>
            </div>

            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor a reembolsar (máx R${max})</label>
            <input
              type="number" min={1} max={max}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Math.min(max, Number(e.target.value) || 0)))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-display text-xl"
            />
            <div className="mt-2 flex gap-2">
              <button onClick={() => setAmount(max)} className="flex-1 rounded-full border border-border py-1.5 text-xs">Total</button>
              <button onClick={() => setAmount(Math.max(1, Math.round(max / 2)))} className="flex-1 rounded-full border border-border py-1.5 text-xs">Metade</button>
            </div>

            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Motivo (obrigatório)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ex.: produto entregue errado, cliente desistiu, item estragado..."
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />

            {err && <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}

            <div className="mt-5 grid gap-2">
              {canExecute && (
                <button
                  onClick={() => submit("execute")}
                  className="rounded-full bg-success py-3 font-semibold text-success-foreground shadow-pop"
                >Estornar agora (R$ {amount})</button>
              )}
              {canRequest && (
                <button
                  onClick={() => submit("request")}
                  className="rounded-full border-2 border-foreground bg-card py-3 font-semibold"
                >Solicitar aprovação do Admin</button>
              )}
              {!canExecute && !canRequest && (
                <div className="rounded-xl bg-secondary p-3 text-center text-xs text-muted-foreground">Seu perfil não tem permissão de reembolso.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Shift Panel ----------------------------- */

function ShiftPanel({ staffId, staffName }: { staffId: string; staffName: string }) {
  const s = useStore();
  void s.shifts.length;
  const open = getOpenShift(staffId);
  const myShifts = s.shifts.filter((x) => x.staffId === staffId).slice(0, 6);
  const [closeOpen, setCloseOpen] = useState(false);

  // Live snapshot for open shift
  const issuedNow = open
    ? s.wallets.filter((w) => w.issuedBy === staffName && w.issuedAt >= open.openedAt)
    : [];
  const totalSystem = issuedNow.reduce((a, w) => a + w.balance + w.consumed, 0);

  return (
    <div className="mt-5 rounded-2xl border-2 border-foreground bg-accent/40 p-4 shadow-pop">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Turno do caixa</div>
          {open ? (
            <div className="font-serif text-lg leading-tight">
              Aberto desde {new Date(open.openedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          ) : (
            <div className="font-serif text-lg leading-tight">Nenhum turno aberto</div>
          )}
          {open && (
            <div className="text-xs text-muted-foreground">
              {issuedNow.length} ficha{issuedNow.length === 1 ? "" : "s"} · sistema R$ {totalSystem}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {!open ? (
            <button
              onClick={() => openShift(staffId, staffName)}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-pop"
            >Abrir turno</button>
          ) : (
            <button
              onClick={() => setCloseOpen(true)}
              className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-pop"
            >Fechar turno · conferir caixa</button>
          )}
        </div>
      </div>

      {myShifts.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Histórico de turnos</summary>
          <ul className="mt-2 divide-y divide-border text-sm">
            {myShifts.map((sh) => (
              <li key={sh.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <div className="font-mono text-[11px]">
                    {new Date(sh.openedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {" → "}
                    {sh.closedAt ? new Date(sh.closedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "aberto"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {sh.walletsIssued ?? 0} fichas · sistema R$ {sh.totalIssued ?? 0}
                  </div>
                </div>
                {sh.closedAt && typeof sh.diff === "number" && (
                  <div className={`text-right text-xs font-semibold ${sh.diff === 0 ? "text-success" : sh.diff > 0 ? "text-warning" : "text-destructive"}`}>
                    {sh.diff === 0 ? "✓ confere" : `R$ ${sh.diff > 0 ? "+" : ""}${sh.diff}`}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {closeOpen && open && (
        <CloseShiftDialog
          shift={open}
          totalSystem={totalSystem}
          onClose={() => setCloseOpen(false)}
        />
      )}
    </div>
  );
}

function CloseShiftDialog({ shift, totalSystem, onClose }: { shift: CashShift; totalSystem: number; onClose: () => void }) {
  const [counted, setCounted] = useState(totalSystem);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const diff = counted - totalSystem;

  const submit = () => {
    setErr(null);
    try {
      closeShift({ shiftId: shift.id, countedCash: counted, notes });
      onClose();
    } catch (e: any) { setErr(e?.message ?? "Erro"); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border-2 border-foreground bg-card p-6 shadow-pop">
        <h3 className="font-serif text-2xl">Conferir caixa físico</h3>
        <p className="text-xs text-muted-foreground">Conte o dinheiro/Pix recebido e digite abaixo. O sistema compara com o total emitido neste turno.</p>

        <div className="mt-4 rounded-2xl bg-secondary p-3 text-sm">
          <div className="flex justify-between"><span>Sistema (fichas emitidas)</span><span className="font-display">R$ {totalSystem}</span></div>
        </div>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor contado na gaveta</label>
        <input
          type="number" min={0} value={counted}
          onChange={(e) => setCounted(Math.max(0, Number(e.target.value) || 0))}
          className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-display text-2xl"
        />

        <div className={`mt-3 rounded-xl px-3 py-2 text-sm text-center ${diff === 0 ? "bg-success/15 text-success" : diff > 0 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`}>
          {diff === 0 ? "✓ Caixa confere" : diff > 0 ? `Sobra de R$ ${diff}` : `Falta R$ ${Math.abs(diff)}`}
        </div>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</label>
        <textarea
          rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: troco a mais, sangria pro cofre..."
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />

        {err && <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold">Cancelar</button>
          <button onClick={submit} className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-pop">Fechar turno</button>
        </div>
      </div>
    </div>
  );
}
