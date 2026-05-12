import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, Plus, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "festacash:install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS
    window.navigator.standalone === true
  );
}

function detectIOS() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

/**
 * App-like install prompt.
 * - Android/Chrome: captura `beforeinstallprompt` e mostra botão "Instalar".
 * - iOS Safari: mostra instruções "Compartilhar → Adicionar à Tela de Início".
 * - Quando rodando como PWA (standalone) não aparece nada.
 */
export function InstallPrompt({ appName = "FestaCash" }: { appName?: string }) {
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [iosOpen, setIosOpen] = useState(false);
  const [show, setShow] = useState(false);
  const isIOS = typeof window !== "undefined" && detectIOS();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS — sem evento; mostrar dica após 1.2s
    if (isIOS) {
      const t = setTimeout(() => setShow(true), 1200);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [isIOS]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  const install = async () => {
    if (!bip) return;
    await bip.prompt();
    const r = await bip.userChoice;
    if (r.outcome === "accepted") setShow(false);
    setBip(null);
  };

  return (
    <>
      <AnimatePresence>
        {show && !iosOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-md p-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center gap-3 rounded-2xl border-2 border-foreground bg-card p-3 shadow-pop">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg">F</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-serif text-sm">Instalar {appName}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {isIOS ? "Adicione à Tela de Início" : "Funciona offline, abre como app"}
                </div>
              </div>
              {bip ? (
                <button
                  onClick={install}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background active:scale-95 transition"
                >
                  <Download className="h-3.5 w-3.5" /> Instalar
                </button>
              ) : (
                <button
                  onClick={() => setIosOpen(true)}
                  className="shrink-0 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background active:scale-95 transition"
                >
                  Como instalar
                </button>
              )}
              <button onClick={dismiss} className="shrink-0 rounded-full p-1.5 text-muted-foreground active:scale-95">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {iosOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] grid place-items-end bg-foreground/40"
            onClick={() => setIosOpen(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-auto w-full max-w-md rounded-t-3xl border-t-2 border-foreground bg-card p-6"
              style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-foreground/20" />
              <h2 className="font-serif text-2xl">Instalar {appName} no iPhone</h2>
              <p className="mt-1 text-sm text-muted-foreground">Abra como app, sem barras do navegador.</p>

              <ol className="mt-5 space-y-3 text-sm">
                <li className="flex items-start gap-3 rounded-2xl bg-secondary p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-background text-xs font-bold">1</span>
                  <div>
                    Toque em <Share className="mx-1 inline h-4 w-4 align-text-bottom text-primary" /> <span className="font-semibold">Compartilhar</span> na barra do Safari.
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-2xl bg-secondary p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-background text-xs font-bold">2</span>
                  <div>
                    Role e toque em <Plus className="mx-1 inline h-4 w-4 align-text-bottom text-primary" /> <span className="font-semibold">Adicionar à Tela de Início</span>.
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-2xl bg-secondary p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-background text-xs font-bold">3</span>
                  <div>Confirme em <span className="font-semibold">Adicionar</span>. Pronto, abre como app.</div>
                </li>
              </ol>

              <button
                onClick={() => { setIosOpen(false); dismiss(); }}
                className="mt-5 w-full rounded-full bg-foreground py-3 text-sm font-semibold text-background active:scale-95"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
