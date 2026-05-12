import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clearNotifications, getNotificationsFor, markNotificationsRead, useStore, type NotificationAudience } from "@/lib/festa-store";

export function NotificationBell({
  audience,
  who,
  align = "right",
  tone = "light",
}: {
  audience: NotificationAudience;
  who: string;
  align?: "left" | "right";
  tone?: "light" | "dark";
}) {
  const s = useStore();
  void s.notifications.length; // re-render on update
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = getNotificationsFor(audience, who);
  const unread = list.filter((n) => !n.readBy.includes(who)).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open && unread > 0) {
      const t = setTimeout(() => markNotificationsRead(audience, who), 600);
      return () => clearTimeout(t);
    }
  }, [open, unread, audience, who]);

  const kindColor = (k: string) =>
    k === "danger" ? "bg-destructive/15 text-destructive"
    : k === "warn" ? "bg-warning/15 text-warning"
    : k === "success" ? "bg-success/15 text-success"
    : "bg-primary/15 text-primary";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative grid h-9 w-9 place-items-center rounded-full border ${
          tone === "dark" ? "border-border bg-card" : "bg-secondary border-transparent"
        } text-foreground/80 active:scale-95 transition`}
        title="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid h-4 min-w-4 px-1 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className={`absolute z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] origin-top rounded-2xl border-2 border-foreground bg-card p-3 shadow-pop ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="font-serif text-base">Notificações</div>
              <div className="flex gap-1">
                {list.length > 0 && (
                  <button
                    onClick={() => clearNotifications(audience)}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold"
                    title="Limpar tudo"
                  >Limpar</button>
                )}
                <button onClick={() => setOpen(false)} className="grid h-6 w-6 place-items-center rounded-full bg-secondary">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {list.length === 0 ? (
                <li className="px-3 py-8 text-center text-xs text-muted-foreground">Nada novo por aqui. 🎉</li>
              ) : list.slice(0, 50).map((n) => {
                const isUnread = !n.readBy.includes(who);
                return (
                  <li key={n.id} className={`flex gap-2 px-2 py-2.5 ${isUnread ? "bg-accent/30" : ""}`}>
                    <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${kindColor(n.kind)}`}>
                      {n.kind === "danger" ? "!" : n.kind === "warn" ? "⚠" : n.kind === "success" ? <Check className="h-3.5 w-3.5" /> : "•"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold leading-tight">{n.title}</div>
                      {n.body && <div className="text-[11px] text-muted-foreground leading-snug">{n.body}</div>}
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {new Date(n.at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
