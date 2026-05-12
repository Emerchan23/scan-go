import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { SiteHeader } from "@/components/site-header";
import { Bunting } from "@/components/bunting";
import { addCredits, transfer, useStore } from "@/lib/festa-store";

export const Route = createFileRoute("/cliente")({
  head: () => ({
    meta: [
      { title: "Cliente — FestaCash" },
      { name: "description", content: "Compre créditos, mostre seu QR Code e transfira saldo para amigos." },
    ],
  }),
  component: ClientePage,
});

function ClientePage() {
  const s = useStore();
  const [tab, setTab] = useState<"qr" | "comprar" | "transferir" | "historico">("qr");
  const [name, setName] = useState(s.user.name === "Visitante" ? "" : s.user.name);
  const [amount, setAmount] = useState<number>(50);
  const [transferAmt, setTransferAmt] = useState<number>(10);
  const [msg, setMsg] = useState<string | null>(null);

  const buy = () => {
    if (!name.trim()) { setMsg("Digite seu nome para começar"); return; }
    addCredits(amount, name.trim());
    setMsg(`R$ ${amount},00 adicionados. Bom arraiá!`);
    setTimeout(() => setMsg(null), 2500);
    setTab("qr");
  };

  const sendTransfer = () => {
    try {
      transfer(transferAmt);
      setMsg(`R$ ${transferAmt},00 transferidos.`);
    } catch (e: any) {
      setMsg(e.message);
    }
    setTimeout(() => setMsg(null), 2500);
  };

  const tabs = [
    { id: "qr", label: "Meu QR" },
    { id: "comprar", label: "Comprar" },
    { id: "transferir", label: "Transferir" },
    { id: "historico", label: "Histórico" },
  ] as const;

  const myHistory = s.sales.filter((x) => x.user === s.user.name);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Bunting />

      <main className="mx-auto max-w-md px-5 py-8">
        {/* Wallet card */}
        <div className="rounded-3xl border-2 border-foreground bg-gradient-to-br from-primary to-[oklch(0.5_0.2_25)] p-6 text-primary-foreground shadow-pop">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">{s.event.name}</div>
              <div className="mt-1 text-sm opacity-90">Olá, {s.user.name}</div>
            </div>
            <span className="rounded-full bg-background/20 px-3 py-1 text-xs font-semibold">#{s.user.id.slice(-4)}</span>
          </div>
          <div className="mt-5">
            <div className="text-xs uppercase tracking-widest opacity-80">Saldo</div>
            <div className="font-display text-5xl mt-1">R$ {s.user.balance},00</div>
          </div>
        </div>

        {msg && <div className="mt-4 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">{msg}</div>}

        {/* Tabs */}
        <div className="mt-6 grid grid-cols-4 gap-1 rounded-full bg-secondary p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full py-2 text-xs font-semibold transition ${
                tab === t.id ? "bg-foreground text-background" : "text-foreground/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <section className="mt-6">
          {tab === "qr" && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-serif text-2xl">Mostre na barraca</h2>
              <p className="text-sm text-muted-foreground">O atendente vai escanear este código para debitar.</p>
              <div className="mt-5 grid place-items-center rounded-2xl bg-paper p-6">
                <QRCodeSVG value={`festacash://user/${s.user.id}`} size={220} bgColor="transparent" fgColor="oklch(0.22 0.06 35)" />
                <div className="mt-3 font-display text-sm">#{s.user.id.toUpperCase()}</div>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">Token expira em 60s · gerado novamente automaticamente</p>
            </div>
          )}

          {tab === "comprar" && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-serif text-2xl">Comprar créditos</h2>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seu nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como você quer ser chamado(a)"
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[20, 50, 100, 150, 200, 300].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className={`rounded-xl border-2 py-3 font-display ${
                      amount === v ? "border-foreground bg-accent" : "border-border bg-background"
                    }`}
                  >
                    R${v}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {["Pix", "Crédito", "Mercado Pago"].map((m) => (
                  <div key={m} className="rounded-xl border border-border bg-secondary py-2 text-center text-xs font-semibold">{m}</div>
                ))}
              </div>
              <button onClick={buy} className="mt-5 w-full rounded-full bg-primary py-3 text-base font-semibold text-primary-foreground shadow-pop">
                Pagar R$ {amount},00
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">O pagamento vai direto pra conta de {s.event.org}</p>
            </div>
          )}

          {tab === "transferir" && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-serif text-2xl">Transferir para um amigo</h2>
              <p className="text-sm text-muted-foreground">Escaneie o QR do amigo e envie o valor.</p>
              <div className="mt-5 rounded-2xl border-2 border-dashed border-border bg-paper p-6 text-center text-sm text-muted-foreground">
                📷 Toque para abrir a câmera
              </div>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor (R$)</label>
              <input
                type="number"
                value={transferAmt}
                onChange={(e) => setTransferAmt(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={sendTransfer} className="mt-5 w-full rounded-full bg-foreground py-3 text-base font-semibold text-background">
                Transferir R$ {transferAmt},00
              </button>
            </div>
          )}

          {tab === "historico" && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-serif text-2xl">Suas compras</h2>
              {myHistory.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Nada por aqui ainda. Vai lá comer um espetinho! 🍢</p>
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {myHistory.map((h) => (
                    <li key={h.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-semibold">{h.product}</div>
                        <div className="text-xs text-muted-foreground">{h.barraca} · {new Date(h.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                      <div className="font-display text-primary">- R${h.price}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
