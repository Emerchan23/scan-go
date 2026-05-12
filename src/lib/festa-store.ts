// Mock data + simple persisted store using localStorage.
// Frontend-only simulation of the FestaCash flows.

export type ProductKind = "comida" | "bebida" | "doce" | "brinquedo" | "ingresso";

export type Product = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  /** Nome legado / fallback de barraca (compat com seeds antigos). */
  barraca: string;
  kind: ProductKind;
  image?: string;
  description?: string;
  durationMin?: number;
  stock?: number;
};

/** Barraca cadastrada pelo organizador. */
export type Barraca = {
  id: string;
  name: string;
  emoji: string;
  attendant?: string;
  /** Produtos liberados pra venda nesta barraca (N:N). */
  productIds: string[];
};

/** Ficha offline emitida pelo Caixa — carteira com saldo e QR próprio. */
export type Wallet = {
  /** Código curto pra impressão (ex.: F-7K9XA2). */
  code: string;
  /** Nome do portador (opcional — pulseira pode ser anônima). */
  holder?: string;
  balance: number;
  issuedAt: number;
  issuedBy: string;
  /** Histórico de débitos no PDV. */
  consumed: number;
};

export type Sale = { id: string; productId: string; product: string; price: number; barraca: string; at: number; user: string };
export type User = { id: string; name: string; balance: number };

const KEY = "festacash:v4";

/** O que acontece com o saldo não usado quando o evento acaba. */
export type CreditPolicy = {
  /**
   * - "expire": saldo expira ao fim do evento (fica com a organização)
   * - "refund": cliente pode pedir reembolso até X dias após o fim
   * - "carry":  saldo continua valendo pro próximo evento da mesma org
   */
  mode: "expire" | "refund" | "carry";
  /** Janela de reembolso em dias após o fim do evento (modo refund). */
  refundDays: number;
  /** Timestamp em ms de quando o evento termina. */
  endsAt: number;
};

/** Conta Mercado Pago do organizador onde o split deposita o valor dele. */
export type SplitAccount = {
  /** Status da conexão Mercado Pago via OAuth. */
  status: "pending" | "connected";
  /** Nome do titular da conta (visível pro cliente final, gera confiança). */
  holder: string;
  /** Documento mascarado. */
  document: string;
  /** Email da conta MP. */
  email: string;
  /** ID público do vendedor no MP (mostra ao cliente que existe conta real). */
  mpUserId?: string;
  /** Quando conectou. */
  connectedAt?: number;
};

type State = {
  user: User;
  products: Product[];
  barracas: Barraca[];
  wallets: Wallet[];
  sales: Sale[];
  event: { name: string; date: string; org: string };
  platformFee: number;
  policy: CreditPolicy;
  split: SplitAccount;
};

const KEY_BUMP = "v4";
void KEY_BUMP;

const initial: State = {
  user: { id: "u_1932", name: "Visitante", balance: 0 },
  event: { name: "Arraiá do Sagrado Coração", date: "21 de Junho", org: "Escola Sagrado Coração" },
  platformFee: 0.02,
  policy: {
    mode: "refund",
    refundDays: 7,
    endsAt: Date.now() + 8 * 60 * 60 * 1000,
  },
  split: {
    status: "connected",
    holder: "Escola Sagrado Coração Ltda",
    document: "12.***.***/0001-23",
    email: "tesouraria@sagradocoracao.org.br",
    mpUserId: "MP-829471",
    connectedAt: Date.now() - 2 * 86_400_000,
  },
  products: [
    { id: "p1", name: "Espetinho de carne", price: 12, emoji: "🍢", barraca: "Churrasquinho", kind: "comida", description: "Carne bovina temperada na brasa, com farofa.", stock: 80 },
    { id: "p2", name: "Pastel de queijo", price: 10, emoji: "🥟", barraca: "Pastelaria", kind: "comida", description: "Massa crocante recém-frita." , stock: 60 },
    { id: "p3", name: "Pé-de-moleque", price: 5, emoji: "🥜", barraca: "Doces", kind: "doce", description: "Tradicional, feito na hora." },
    { id: "p4", name: "Quentão (250ml)", price: 8, emoji: "🍷", barraca: "Bebidas", kind: "bebida", description: "Gengibre, cravo e canela." },
    { id: "p5", name: "Refrigerante lata", price: 7, emoji: "🥤", barraca: "Bebidas", kind: "bebida" },
    { id: "p6", name: "Milho cozido", price: 6, emoji: "🌽", barraca: "Milho", kind: "comida" },
    { id: "p7", name: "Canjica", price: 9, emoji: "🥣", barraca: "Doces", kind: "doce" },
    { id: "p8", name: "Cachorro-quente", price: 14, emoji: "🌭", barraca: "Lanches", kind: "comida" },
    { id: "b1", name: "Cama elástica", price: 15, emoji: "🤸", barraca: "Brinquedos", kind: "brinquedo", durationMin: 10, description: "10 minutos de pulo livre na cama elástica gigante." },
    { id: "b2", name: "Touro mecânico", price: 20, emoji: "🐂", barraca: "Brinquedos", kind: "brinquedo", durationMin: 5, description: "5 minutos no touro — quem aguenta?" },
    { id: "b3", name: "Pintura facial", price: 10, emoji: "🎨", barraca: "Brinquedos", kind: "ingresso", description: "Uma sessão de pintura facial temática." },
    { id: "b4", name: "Pula-pula infantil", price: 12, emoji: "🎈", barraca: "Brinquedos", kind: "brinquedo", durationMin: 15, description: "15 minutos no castelo inflável (até 8 anos)." },
  ],
  barracas: [
    { id: "bar_churras",  name: "Churrasquinho", emoji: "🍢", attendant: "Seu Zé",   productIds: ["p1", "p5"] },
    { id: "bar_pastel",   name: "Pastelaria",    emoji: "🥟", attendant: "Dona Lu",  productIds: ["p2", "p5"] },
    { id: "bar_doces",    name: "Doces",         emoji: "🍬", attendant: "Marina",   productIds: ["p3", "p7"] },
    { id: "bar_bebidas",  name: "Bebidas",       emoji: "🥤", attendant: "Carlos",   productIds: ["p4", "p5"] },
    { id: "bar_milho",    name: "Milho",         emoji: "🌽", attendant: "Ana",      productIds: ["p6"] },
    { id: "bar_lanches",  name: "Lanches",       emoji: "🌭", attendant: "João",     productIds: ["p8", "p5"] },
    { id: "bar_brinq",    name: "Brinquedos",    emoji: "🎈", attendant: "Equipe",   productIds: ["b1", "b2", "b3", "b4"] },
  ],
  wallets: [],
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

/**
 * Cobra um produto. Se `walletCode` for informado, debita da ficha emitida
 * pelo Caixa; caso contrário, da carteira do cliente logado.
 */
export function chargeProduct(productId: string, walletCode?: string) {
  const s = read();
  const p = s.products.find((x) => x.id === productId);
  if (!p) throw new Error("Produto não encontrado");

  let payerName = s.user.name;
  let newBalance: number;

  if (walletCode) {
    const w = s.wallets.find((x) => x.code === walletCode);
    if (!w) throw new Error("Ficha não encontrada");
    if (w.balance < p.price) throw new Error("Saldo da ficha insuficiente");
    w.balance -= p.price;
    w.consumed += p.price;
    payerName = w.holder || `Ficha ${w.code}`;
    newBalance = w.balance;
  } else {
    if (s.user.balance < p.price) throw new Error("Saldo insuficiente");
    s.user.balance -= p.price;
    newBalance = s.user.balance;
  }

  s.sales.unshift({
    id: "s_" + Math.random().toString(36).slice(2, 9),
    productId: p.id,
    product: p.name,
    price: p.price,
    barraca: p.barraca,
    at: Date.now(),
    user: payerName,
  });
  write(s);
  return { product: p, balance: newBalance };
}

/* ---------------------- Barracas (CRUD + atribuição) -------------------- */

export function upsertBarraca(b: Barraca) {
  const s = read();
  const i = s.barracas.findIndex((x) => x.id === b.id);
  if (i >= 0) s.barracas[i] = b; else s.barracas.unshift(b);
  write(s);
}

export function removeBarraca(id: string) {
  const s = read();
  s.barracas = s.barracas.filter((b) => b.id !== id);
  write(s);
}

export function toggleBarracaProduct(barracaId: string, productId: string, on: boolean) {
  const s = read();
  const b = s.barracas.find((x) => x.id === barracaId);
  if (!b) return;
  const has = b.productIds.includes(productId);
  if (on && !has) b.productIds.push(productId);
  if (!on && has) b.productIds = b.productIds.filter((p) => p !== productId);
  write(s);
}

/** Produtos liberados pra venda numa barraca específica. */
export function productsForBarraca(barracaId: string): Product[] {
  const s = read();
  const b = s.barracas.find((x) => x.id === barracaId);
  if (!b) return [];
  return s.products.filter((p) => b.productIds.includes(p.id));
}

/* ----------------------------- Carteiras / Caixa ------------------------ */

function genWalletCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "F-";
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

/** Caixa emite uma ficha (carteira offline) com saldo. Devolve a ficha. */
export function issueWallet(opts: { holder?: string; amount: number; issuedBy: string }): Wallet {
  if (opts.amount <= 0) throw new Error("Valor inválido");
  const s = read();
  let code = genWalletCode();
  while (s.wallets.find((w) => w.code === code)) code = genWalletCode();
  const w: Wallet = {
    code,
    holder: opts.holder?.trim() || undefined,
    balance: opts.amount,
    issuedAt: Date.now(),
    issuedBy: opts.issuedBy,
    consumed: 0,
  };
  s.wallets.unshift(w);
  write(s);
  return w;
}

export function findWallet(code: string): Wallet | undefined {
  return read().wallets.find((w) => w.code.toUpperCase() === code.toUpperCase());
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

export function setSplit(patch: Partial<SplitAccount>) {
  const s = read();
  s.split = { ...s.split, ...patch };
  write(s);
}

export function connectSplit(data: { holder: string; document: string; email: string }) {
  const s = read();
  s.split = {
    status: "connected",
    holder: data.holder,
    document: data.document,
    email: data.email,
    mpUserId: "MP-" + Math.floor(100000 + Math.random() * 900000),
    connectedAt: Date.now(),
  };
  write(s);
}

export function disconnectSplit() {
  const s = read();
  s.split = { status: "pending", holder: "", document: "", email: "" };
  write(s);
}

export function setPolicy(patch: Partial<CreditPolicy>) {
  const s = read();
  s.policy = { ...s.policy, ...patch };
  write(s);
}

export function requestRefund() {
  const s = read();
  if (s.user.balance <= 0) throw new Error("Sem saldo para reembolsar");
  if (s.policy.mode !== "refund") throw new Error("Reembolso não disponível");
  const deadline = s.policy.endsAt + s.policy.refundDays * 86_400_000;
  if (Date.now() > deadline) throw new Error("Prazo de reembolso encerrado");
  const amount = s.user.balance;
  s.user.balance = 0;
  write(s);
  return amount;
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
