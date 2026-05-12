import { createFileRoute, Link } from "@tanstack/react-router";
import { Bunting } from "@/components/bunting";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FestaCash — Créditos digitais para festas e eventos" },
      { name: "description", content: "Substitua fichas de papel por créditos digitais com QR Code. Ideal para festas juninas, quermesses e eventos escolares." },
      { property: "og:title", content: "FestaCash — Adeus fichas de papel" },
      { property: "og:description", content: "Cliente compra crédito pelo celular, atendente escaneia o QR Code e debita. Sem filas, sem troco." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Bunting />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground shadow-soft">
              <span className="h-2 w-2 rounded-full bg-primary" /> SaaS para festas e eventos
            </span>
            <h1 className="mt-5 font-serif text-5xl leading-[0.95] sm:text-6xl lg:text-7xl text-balance">
              Adeus, fichas de papel.<br/>
              <span className="text-primary">Olá, créditos digitais.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              O cliente compra crédito pelo celular e recebe um QR Code. A barraca escaneia,
              debita o valor exato — sem fila, sem troco, sem ficha rasgada.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/cliente" className="rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-pop hover:translate-y-[1px] transition">
                Sou cliente — comprar crédito
              </Link>
              <Link to="/barraca" className="rounded-full border-2 border-foreground bg-card px-6 py-3 text-base font-semibold text-foreground hover:bg-secondary transition">
                Sou da barraca
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                ["0", "filas no caixa"],
                ["1", "QR pra tudo"],
                ["100%", "do dinheiro pra escola"],
              ].map(([k, v]) => (
                <div key={v} className="rounded-2xl bg-card p-4 shadow-soft">
                  <div className="font-display text-2xl text-primary">{k}</div>
                  <div className="text-xs text-muted-foreground mt-1">{v}</div>
                </div>
              ))}
            </dl>
          </div>

          {/* Mock device */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 rounded-[3rem] bg-accent/40 blur-2xl" aria-hidden />
            <div className="relative rounded-[2.5rem] border-[10px] border-foreground bg-card p-5 shadow-pop">
              <div className="rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.55_0.2_25)] p-5 text-primary-foreground">
                <div className="text-xs uppercase tracking-widest opacity-80">Saldo disponível</div>
                <div className="font-display text-4xl mt-1">R$ 47,00</div>
                <div className="text-xs opacity-80 mt-3">Arraiá do Sagrado Coração · 21 jun</div>
              </div>
              <div className="mt-5 grid place-items-center rounded-2xl bg-paper p-6">
                <div className="grid h-44 w-44 grid-cols-7 grid-rows-7 gap-[3px]">
                  {Array.from({ length: 49 }).map((_, i) => (
                    <div key={i} className={`rounded-[2px] ${[(i * 7) % 13 < 6, i % 5 === 0, (i * 3) % 11 < 5].some(Boolean) ? "bg-foreground" : "bg-transparent"}`} />
                  ))}
                </div>
                <div className="mt-3 font-display text-sm">MEU QR · #1932</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-secondary py-2 text-center text-sm font-semibold">Recarregar</div>
                <div className="rounded-xl bg-foreground py-2 text-center text-sm font-semibold text-background">Transferir</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <h2 className="font-serif text-4xl">Como funciona</h2>
            <p className="text-sm text-muted-foreground max-w-sm">Tudo no navegador. O cliente não baixa app — adiciona à tela inicial e usa como aplicativo (PWA).</p>
          </div>

          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { n: "01", t: "Cliente compra créditos", d: "Acessa o link da festa, escolhe o valor e paga via Pix ou cartão. O dinheiro cai direto na conta da escola." },
              { n: "02", t: "Recebe um QR Code", d: "Mostra o QR no celular. Funciona em iPhone e Android, online ou em sinal fraco." },
              { n: "03", t: "Atendente escaneia", d: "A barraca seleciona o produto, confirma e o sistema debita o valor exato. Saldo atualiza na hora." },
            ].map((s) => (
              <li key={s.n} className="rounded-3xl border border-border bg-background p-6 shadow-soft">
                <div className="font-display text-xs text-primary">{s.n}</div>
                <h3 className="mt-2 font-serif text-2xl">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-serif text-4xl max-w-2xl">Tudo que sua festa precisa, num só lugar.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { e: "🎟️", t: "Créditos digitais", d: "Adeus fichas perdidas e sem troco." },
            { e: "📲", t: "PWA — sem app store", d: "Atalho na tela inicial, parece app nativo." },
            { e: "🤝", t: "Transferência entre amigos", d: "Sobrou crédito? Manda pro coleguinha." },
            { e: "💸", t: "Dinheiro direto pra escola", d: "Mercado Pago, Pix, Stripe — você conecta a sua conta." },
            { e: "📊", t: "Painel em tempo real", d: "Vendas por barraca, produtos top, horário de pico." },
            { e: "🛡️", t: "QR seguro", d: "Token temporário, antifraude, sem saldo no QR." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-pop hover:translate-y-[-2px] transition">
              <div className="text-3xl">{f.e}</div>
              <h3 className="mt-3 font-serif text-xl">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="relative overflow-hidden rounded-[2rem] border-2 border-foreground bg-gradient-to-br from-accent to-corn p-10 shadow-pop">
          <div className="grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
            <div>
              <h2 className="font-serif text-4xl">Pronto pra modernizar sua festa?</h2>
              <p className="mt-3 max-w-xl text-foreground/80">Teste agora as três experiências — cliente, barraca e administrador — em poucos cliques.</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link to="/cliente" className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background">Abrir como cliente</Link>
              <Link to="/admin" className="rounded-full border-2 border-foreground bg-background px-5 py-3 text-sm font-semibold">Ver painel</Link>
            </div>
          </div>
        </div>
      </section>

      <Bunting />
      <footer className="mx-auto max-w-6xl px-5 py-8 text-center text-sm text-muted-foreground">
        © FestaCash · Demo frontend · Feito com 🌽 para arraiás brasileiros
      </footer>
    </div>
  );
}
