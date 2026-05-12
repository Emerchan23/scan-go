import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Download, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { useStore } from "@/lib/festa-store";

export const Route = createFileRoute("/folder")({
  head: () => ({
    meta: [
      { title: "Folders e QR Codes — FestaCash" },
      { name: "description", content: "Imprima cartazes, totens de mesa e adesivos com QR Code para os clientes acessarem a carteira do evento." },
    ],
  }),
  component: FolderPage,
});

type Template = "cartaz" | "tent" | "adesivo" | "ingresso";

function FolderPage() {
  const s = useStore();
  const [template, setTemplate] = useState<Template>("cartaz");
  const [headline, setHeadline] = useState("Compre seus créditos pelo celular");
  const [cta, setCta] = useState("Aponte a câmera no QR Code");
  const [color, setColor] = useState("#c0392b");
  const [copies, setCopies] = useState(4);

  const url = useMemo(() => {
    if (typeof window === "undefined") return "https://festacash.app/cliente";
    return `${window.location.origin}/cliente`;
  }, []);

  return (
    <div className="min-h-screen bg-paper print:bg-white">
      <div className="print:hidden">
        <SiteHeader />
      </div>

      {/* Editor */}
      <div className="print:hidden mx-auto max-w-6xl px-5 py-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Material para o evento</div>
          <h1 className="font-serif text-4xl">Folders e QR Codes para imprimir</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cole nas mesas, balcões e entradas. Os clientes apontam o celular e já acessam <span className="font-mono">{url}</span> — sem download, sem fila.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Sidebar config */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Modelo</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([
                  { k: "cartaz", l: "Cartaz A4", h: "21 × 29,7 cm" },
                  { k: "tent", l: "Totem de mesa", h: "Frente e verso" },
                  { k: "adesivo", l: "Adesivos", h: "8 por folha" },
                  { k: "ingresso", l: "Cupom", h: "Pulseira/ingresso" },
                ] as const).map((t) => (
                  <button
                    key={t.k}
                    onClick={() => setTemplate(t.k)}
                    className={`rounded-xl border-2 p-3 text-left transition active:scale-[0.98] ${
                      template === t.k ? "border-foreground bg-accent" : "border-border bg-background"
                    }`}
                  >
                    <div className="font-serif text-sm">{t.l}</div>
                    <div className="text-[10px] text-muted-foreground">{t.h}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conteúdo</div>
              <Field label="Chamada principal">
                <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="input" />
              </Field>
              <Field label="Instrução">
                <input value={cta} onChange={(e) => setCta(e.target.value)} className="input" />
              </Field>
              <Field label="Cor de destaque">
                <div className="flex items-center gap-2">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background" />
                  <input value={color} onChange={(e) => setColor(e.target.value)} className="input flex-1 font-mono text-xs" />
                </div>
              </Field>
              {template === "adesivo" && (
                <Field label="Quantidade na folha">
                  <input type="number" min={1} max={12} value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} className="input" />
                </Field>
              )}
            </div>

            <div className="rounded-2xl border-2 border-foreground bg-accent/40 p-4 shadow-pop">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <div className="font-serif text-sm">Dica de impressão</div>
              </div>
              <p className="mt-1 text-xs text-foreground/80">Use papel <span className="font-semibold">couché 150g</span> para cartazes e <span className="font-semibold">papel adesivo A4</span> para os adesivos. No diálogo de impressão, marque <span className="font-semibold">"Gráficos de fundo"</span> para imprimir as cores.</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 rounded-full bg-foreground py-3 text-sm font-semibold text-background shadow-pop active:scale-[0.98]"
              >
                <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
              </button>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}&margin=10`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold active:scale-[0.98]"
              >
                <Download className="h-4 w-4" /> Baixar só o QR Code (PNG)
              </a>
              <p className="text-center text-[11px] text-muted-foreground">Aponta para <span className="font-mono">{url}</span></p>
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-3xl border border-border bg-muted p-6 shadow-soft">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pré-visualização</div>
            <div className="mt-3 grid place-items-center">
              <div className="origin-top scale-[0.55] sm:scale-75 lg:scale-90">
                <PrintArea template={template} headline={headline} cta={cta} color={color} url={url} org={s.event.org} eventName={s.event.name} copies={copies} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print canvas — only this is shown when printing */}
      <div className="hidden print:block">
        <PrintArea template={template} headline={headline} cta={cta} color={color} url={url} org={s.event.org} eventName={s.event.name} copies={copies} />
      </div>

      <PrintStyles />
    </div>
  );
}

/* ------------------------------ Templates ------------------------------ */

function PrintArea(props: { template: Template; headline: string; cta: string; color: string; url: string; org: string; eventName: string; copies: number }) {
  switch (props.template) {
    case "cartaz": return <PosterA4 {...props} />;
    case "tent": return <TableTent {...props} />;
    case "adesivo": return <StickerSheet {...props} />;
    case "ingresso": return <CouponStrip {...props} />;
  }
}

function PosterA4({ headline, cta, color, url, org, eventName }: { headline: string; cta: string; color: string; url: string; org: string; eventName: string }) {
  return (
    <div className="page page-a4 relative flex flex-col overflow-hidden bg-white text-[#1f1612]" style={{ borderTop: `18px solid ${color}` }}>
      {/* Bandeirinhas decorativas */}
      <Bunting color={color} />

      <div className="flex flex-1 flex-col items-center justify-between px-12 pt-12 pb-10 text-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white" style={{ background: color }}>
            FestaCash · {org}
          </div>
          <h1 className="mt-6 font-serif text-[58px] leading-[1.05]">{headline}</h1>
          <p className="mt-3 text-xl text-[#5a4a3f]">Pague tudo da festa pelo celular. Sem dinheiro, sem fila.</p>
        </div>

        <div className="my-6 rounded-3xl border-[6px] p-7" style={{ borderColor: color }}>
          <QRCodeSVG value={url} size={300} bgColor="#ffffff" fgColor="#1f1612" level="H" />
        </div>

        <div>
          <div className="font-serif text-3xl">{cta}</div>
          <div className="mt-2 font-mono text-base text-[#5a4a3f]">{stripProtocol(url)}</div>
        </div>

        <ol className="mt-6 grid w-full max-w-md grid-cols-3 gap-3 text-[12px]">
          {[
            ["1", "Aponte a câmera"],
            ["2", "Compre créditos"],
            ["3", "Mostre o QR na barraca"],
          ].map(([n, t]) => (
            <li key={n} className="rounded-xl border border-[#e8d8c4] bg-[#fff8ec] p-3">
              <div className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white" style={{ background: color }}>{n}</div>
              <div className="mt-2 font-semibold">{t}</div>
            </li>
          ))}
        </ol>

        <div className="mt-6 text-[10px] uppercase tracking-widest text-[#7a6a5a]">{eventName}</div>
      </div>
    </div>
  );
}

function TableTent({ headline, cta, color, url, org, eventName }: { headline: string; cta: string; color: string; url: string; org: string; eventName: string }) {
  // Folha A4 paisagem dividida em 2: vinco no meio, ambos lados idênticos virados
  return (
    <div className="page page-a4-landscape grid grid-cols-2 bg-white text-[#1f1612]">
      {[0, 1].map((i) => (
        <div key={i} className={`relative flex flex-col items-center justify-center gap-4 p-10 text-center ${i === 0 ? "border-r-2 border-dashed border-[#bbb] rotate-180" : ""}`} style={{ background: i === 0 ? "#fff8ec" : "white" }}>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: color }}>
            FestaCash · {org}
          </div>
          <h2 className="font-serif text-[34px] leading-tight">{headline}</h2>
          <div className="rounded-2xl border-[5px] p-4" style={{ borderColor: color }}>
            <QRCodeSVG value={url} size={180} bgColor="#ffffff" fgColor="#1f1612" level="H" />
          </div>
          <div className="font-serif text-xl">{cta}</div>
          <div className="font-mono text-xs text-[#5a4a3f]">{stripProtocol(url)}</div>
          <div className="text-[9px] uppercase tracking-widest text-[#7a6a5a]">{eventName}</div>
        </div>
      ))}
    </div>
  );
}

function StickerSheet({ url, color, org, copies }: { url: string; color: string; org: string; copies: number }) {
  const cols = copies <= 4 ? 2 : copies <= 6 ? 2 : 3;
  return (
    <div className="page page-a4 bg-white p-6">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: copies }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#ccc] p-4" style={{ borderColor: color + "55" }}>
            <div className="rounded-xl border-[3px] p-2" style={{ borderColor: color }}>
              <QRCodeSVG value={url} size={110} bgColor="#ffffff" fgColor="#1f1612" level="H" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>FestaCash</div>
              <div className="mt-0.5 font-serif text-[15px] leading-tight">Compre seus créditos aqui</div>
              <div className="mt-1 font-mono text-[10px] text-[#5a4a3f]">{stripProtocol(url)}</div>
              <div className="mt-1 text-[9px] text-[#7a6a5a]">{org}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CouponStrip({ url, color, org, eventName }: { url: string; color: string; org: string; eventName: string }) {
  return (
    <div className="page page-a4 bg-white p-6">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-stretch overflow-hidden rounded-2xl border-2 border-dashed" style={{ borderColor: color }}>
            <div className="flex flex-col justify-center px-5 text-white" style={{ background: color, width: 200 }}>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">FestaCash</div>
              <div className="font-serif text-[22px] leading-tight">Cupom de acesso</div>
              <div className="mt-1 text-[10px] opacity-90">{eventName}</div>
            </div>
            <div className="flex flex-1 items-center gap-4 px-5 py-3">
              <div className="rounded-lg border-[3px] p-1.5" style={{ borderColor: color }}>
                <QRCodeSVG value={url} size={90} bgColor="#ffffff" fgColor="#1f1612" level="H" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-serif text-base">Aponte a câmera no QR Code</div>
                <div className="mt-1 text-[11px] text-[#5a4a3f]">Acesse, compre créditos e use em qualquer barraca da festa.</div>
                <div className="mt-1 font-mono text-[10px] text-[#7a6a5a]">{stripProtocol(url)}</div>
              </div>
              <div className="font-display text-xl text-[#7a6a5a]">#{String(i + 1).padStart(3, "0")}</div>
            </div>
          </div>
        ))}
        <div className="text-center text-[9px] text-[#999]">{org} · cortar nas linhas pontilhadas</div>
      </div>
    </div>
  );
}

function Bunting({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 600 60" className="w-full" preserveAspectRatio="none" style={{ height: 50 }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <polygon key={i} points={`${i * 45},0 ${i * 45 + 22},45 ${i * 45 + 44},0`} fill={i % 2 ? color : "#f4d35e"} />
      ))}
    </svg>
  );
}

function stripProtocol(u: string) {
  return u.replace(/^https?:\/\//, "");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function PrintStyles() {
  return (
    <style>{`
      .input{width:100%;border-radius:0.6rem;border:1px solid var(--border);background:var(--background);padding:0.5rem 0.75rem;font-size:0.85rem;outline:none}
      .input:focus{box-shadow:0 0 0 2px var(--ring)}
      .page{box-shadow:0 8px 30px rgba(0,0,0,0.12);}
      .page-a4{width:210mm;min-height:297mm;}
      .page-a4-landscape{width:297mm;min-height:210mm;}
      @media print{
        @page{size:A4;margin:0}
        html,body{background:white !important}
        .page{box-shadow:none !important;page-break-after:always}
      }
    `}</style>
  );
}
