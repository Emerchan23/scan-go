// Mock data + simple persisted store using localStorage.
// Frontend-only simulation of the FestaCash flows.

export type Product = { id: string; name: string; price: number; emoji: string; barraca: string };
export type Sale = { id: string; productId: string; product: string; price: number; barraca: string; at: number; user: string };
export type User = { id: string; name: string; balance: number };

const KEY = "festacash:v1";

type State = {
  user: User;
  products: Product[];
  sales: Sale[];
  event: { name: string; date: string; org: string };
  /** Taxa da plataforma (split). 0.02 = 2%. Configurada pelo dono do SaaS. */
  platformFee: number;
};

const initial: State = {
  user: { id: "u_1932", name: "Visitante", balance: 0 },
  event: { name: "Arraiá do Sagrado Coração", date: "21 de Junho", org: "Escola Sagrado Coração" },
  platformFee: 0.02,
  products: [
    { id: "p1", name: "Espetinho", price: 12, emoji: "🍢", barraca: "Churrasquinho" },
    { id: "p2", name: "Pastel de queijo", price: 10, emoji: "🥟", barraca: "Pastelaria" },
    { id: "p3", name: "Pé-de-moleque", price: 5, emoji: "🥜", barraca: "Doces" },
    { id: "p4", name: "Quentão (250ml)", price: 8, emoji: "🍷", barraca: "Bebidas" },
    { id: "p5", name: "Refrigerante", price: 7, emoji: "🥤", barraca: "Bebidas" },
    { id: "p6", name: "Milho cozido", price: 6, emoji: "🌽", barraca: "Milho" },
    { id: "p7", name: "Canjica", price: 9, emoji: "🥣", barraca: "Doces" },
    { id: "p8", name: "Cachorro-quente", price: 14, emoji: "🌭", barraca: "Lanches" },
  ],
  sales: [],
};

function read(): State {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    return { ...initial, ...JSON.parse(raw) };
  } catch {
    return initial;
  }
}

function write(s: State) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("festacash:update"));
}

export function getState() { return read(); }

export function addCredits(amount: number, name?: string) {
  const s = read();
  if (name) s.user.name = name;
  s.user.balance += amount;
  write(s);
}

export function transfer(amount: number) {
  const s = read();
  if (amount > s.user.balance) throw new Error("Saldo insuficiente");
  s.user.balance -= amount;
  write(s);
}

export function chargeProduct(productId: string) {
  const s = read();
  const p = s.products.find((x) => x.id === productId);
  if (!p) throw new Error("Produto não encontrado");
  if (s.user.balance < p.price) throw new Error("Saldo insuficiente");
  s.user.balance -= p.price;
  s.sales.unshift({
    id: "s_" + Math.random().toString(36).slice(2, 9),
    productId: p.id,
    product: p.name,
    price: p.price,
    barraca: p.barraca,
    at: Date.now(),
    user: s.user.name,
  });
  write(s);
  return { product: p, balance: s.user.balance };
}

export function reset() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
  write(initial);
}

import { useEffect, useState } from "react";
export function useStore() {
  const [s, setS] = useState<State>(() => read());
  useEffect(() => {
    const onUpd = () => setS(read());
    window.addEventListener("festacash:update", onUpd);
    window.addEventListener("storage", onUpd);
    return () => {
      window.removeEventListener("festacash:update", onUpd);
      window.removeEventListener("storage", onUpd);
    };
  }, []);
  return s;
}
