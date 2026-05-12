// Mock data + simple persisted store using localStorage.
// Frontend-only simulation of the FestaCash flows.

export type ProductKind = "comida" | "bebida" | "doce" | "brinquedo" | "ingresso";

export type Product = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  barraca: string;
  kind: ProductKind;
  /** Foto do produto (URL ou data:URL salvo do upload). */
  image?: string;
  /** Descrição curta para o catálogo. */
  description?: string;
  /** Tempo de uso em minutos — usado em brinquedos / ingressos. */
  durationMin?: number;
  /** Estoque (opcional). */
  stock?: number;
};

export type Sale = { id: string; productId: string; product: string; price: number; barraca: string; at: number; user: string };
export type User = { id: string; name: string; balance: number };

const KEY = "festacash:v2";

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
    { id: "p1", name: "Espetinho de carne", price: 12, emoji: "🍢", barraca: "Churrasquinho", kind: "comida", description: "Carne bovina temperada na brasa, com farofa.", stock: 80 },
    { id: "p2", name: "Pastel de queijo", price: 10, emoji: "🥟", barraca: "Pastelaria", kind: "comida", description: "Massa crocante recém-frita." , stock: 60 },
    { id: "p3", name: "Pé-de-moleque", price: 5, emoji: "🥜", barraca: "Doces", kind: "doce", description: "Tradicional, feito na hora." },
    { id: "p4", name: "Quentão (250ml)", price: 8, emoji: "🍷", barraca: "Bebidas", kind: "bebida", description: "Gengibre, cravo e canela." },
    { id: "p5", name: "Refrigerante lata", price: 7, emoji: "🥤", barraca: "Bebidas", kind: "bebida" },
    { id: "p6", name: "Milho cozido", price: 6, emoji: "🌽", barraca: "Milho", kind: "comida" },
    { id: "p7", name: "Canjica", price: 9, emoji: "🥣", barraca: "Doces", kind: "doce" },
    { id: "p8", name: "Cachorro-quente", price: 14, emoji: "🌭", barraca: "Lanches", kind: "comida" },
    // Brinquedos / ingressos
    { id: "b1", name: "Cama elástica", price: 15, emoji: "🤸", barraca: "Brinquedos", kind: "brinquedo", durationMin: 10, description: "10 minutos de pulo livre na cama elástica gigante." },
    { id: "b2", name: "Touro mecânico", price: 20, emoji: "🐂", barraca: "Brinquedos", kind: "brinquedo", durationMin: 5, description: "5 minutos no touro — quem aguenta?" },
    { id: "b3", name: "Pintura facial", price: 10, emoji: "🎨", barraca: "Brinquedos", kind: "ingresso", description: "Uma sessão de pintura facial temática." },
    { id: "b4", name: "Pula-pula infantil", price: 12, emoji: "🎈", barraca: "Brinquedos", kind: "brinquedo", durationMin: 15, description: "15 minutos no castelo inflável (até 8 anos)." },
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

export function setPlatformFee(fee: number) {
  const s = read();
  s.platformFee = Math.max(0, Math.min(0.1, fee));
  write(s);
}

export function upsertProduct(p: Product) {
  const s = read();
  const i = s.products.findIndex((x) => x.id === p.id);
  if (i >= 0) s.products[i] = p; else s.products.unshift(p);
  write(s);
}

export function removeProduct(id: string) {
  const s = read();
  s.products = s.products.filter((p) => p.id !== id);
  write(s);
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
