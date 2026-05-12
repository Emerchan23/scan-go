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
  /** Estoque inicial disponível (unidades). undefined = sem controle. */
  stock?: number;
  /** Limite a partir do qual aparece "acabando". Default = 10. */
  stockAlert?: number;
};

/** Histórico de reposições de estoque feitas pelo admin/caixa. */
export type StockMovement = {
  id: string;
  productId: string;
  qty: number;            // positivo = entrada, negativo = ajuste
  by: string;
  at: number;
  note?: string;
};

/** Como o cliente vê disponibilidade no catálogo. */
export type StockVisibility = "off" | "esgotado" | "acabando";

/** Estado de vendas — kill switch em 2 estágios. */
export type SalesStatus = {
  /** Recargas (cliente comprar crédito) e emissão de ficha pelo caixa. */
  topUps: "open" | "closed";
  /** Cobranças nas barracas. */
  charges: "open" | "closed";
  /** Quando charges=closed, fichas offline já emitidas continuam debitando? */
  walletsActiveAfterClose: boolean;
  closedAt?: number;
  topUpsClosedAt?: number;
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
  /**
   * Palavra-chave (segredo) que o cliente combina no caixa. Se definida,
   * a barraca SÓ debita após o atendente conferir verbalmente. Defesa
   * contra alguém fotografar o QR e tentar usar a ficha.
   * Guardada em maiúsculas/normalizada — comparação case-insensitive.
   */
  passphrase?: string;
};

export type Sale = { id: string; productId: string; product: string; price: number; barraca: string; at: number; user: string; walletCode?: string; refunded?: number };
export type User = { id: string; name: string; balance: number };

/* ----------------------------- Usuários & RBAC ---------------------------- */

/** Permissões granulares do sistema. Combine em perfis customizáveis. */
export type Permission =
  | "admin.full"           // tudo (super admin)
  | "users.manage"         // cadastrar/editar usuários e perfis
  | "catalog.manage"       // produtos
  | "barracas.manage"      // barracas + atribuição de produtos
  | "split.manage"         // configurar split MP
  | "policy.manage"        // política de saldo
  | "caixa.issue"          // emitir fichas
  | "caixa.search_orders"  // buscar pedidos / vendas
  | "refund.execute"       // executa estorno direto (devolve saldo)
  | "refund.request"       // só abre solicitação pro admin aprovar
  | "refund.approve"       // aprova/nega solicitações
  | "barraca.charge";      // operar PDV de barraca

/** Perfil = conjunto nomeado de permissões. */
export type Role = {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  /** Built-ins não podem ser deletados, mas podem ter perms ajustadas. */
  builtIn?: boolean;
};

export type Staff = {
  id: string;
  name: string;
  pin: string;       // 4 dígitos (mock)
  roleId: string;
  active: boolean;
  createdAt: number;
};

/** Solicitação de reembolso aberta pelo Caixa pro Admin aprovar. */
export type RefundRequest = {
  id: string;
  saleId: string;
  walletCode?: string;
  amount: number;        // valor a reembolsar (parcial ou total)
  reason: string;
  requestedBy: string;   // staff name
  requestedAt: number;
  status: "pending" | "approved" | "denied";
  decidedBy?: string;
  decidedAt?: number;
  decisionNote?: string;
};

/** Log de qualquer estorno executado (direto ou pós-aprovação). */
export type RefundLog = {
  id: string;
  saleId: string;
  walletCode?: string;
  amount: number;
  reason: string;
  by: string;
  at: number;
  via: "direct" | "approved";
};

const KEY = "festacash:v5";

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
  roles: Role[];
  staff: Staff[];
  refundRequests: RefundRequest[];
  refundLogs: RefundLog[];
  /** Sessão atual (staff logado) — id ou null. */
  sessionStaffId: string | null;
  salesStatus: SalesStatus;
  stockMoves: StockMovement[];
  /** O quanto o cliente vê de estoque no catálogo. */
  clientStockVisibility: StockVisibility;
};

const KEY_BUMP = "v6";
void KEY_BUMP;

const builtInRoles: Role[] = [
  {
    id: "role_admin", name: "Administrador", builtIn: true,
    description: "Acesso total ao painel, usuários, split e aprovações.",
    permissions: ["admin.full", "users.manage", "catalog.manage", "barracas.manage", "split.manage", "policy.manage", "caixa.issue", "caixa.search_orders", "refund.execute", "refund.approve", "barraca.charge"],
  },
  {
    id: "role_caixa", name: "Caixa", builtIn: true,
    description: "Bilheteria — emite fichas e abre solicitações de reembolso.",
    permissions: ["caixa.issue", "caixa.search_orders", "refund.request"],
  },
  {
    id: "role_barraca", name: "Barraca", builtIn: true,
    description: "Atendente de PDV — só cobra produtos da sua barraca.",
    permissions: ["barraca.charge"],
  },
];

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
    { id: "p1", name: "Espetinho de carne", price: 12, emoji: "🍢", barraca: "Churrasquinho", kind: "comida", description: "Carne bovina temperada na brasa, com farofa.", stock: 80, stockAlert: 15 },
    { id: "p2", name: "Pastel de queijo", price: 10, emoji: "🥟", barraca: "Pastelaria", kind: "comida", description: "Massa crocante recém-frita." , stock: 60, stockAlert: 10 },
    { id: "p3", name: "Pé-de-moleque", price: 5, emoji: "🥜", barraca: "Doces", kind: "doce", description: "Tradicional, feito na hora.", stock: 40, stockAlert: 8 },
    { id: "p4", name: "Quentão (250ml)", price: 8, emoji: "🍷", barraca: "Bebidas", kind: "bebida", description: "Gengibre, cravo e canela.", stock: 50, stockAlert: 10 },
    { id: "p5", name: "Refrigerante lata", price: 7, emoji: "🥤", barraca: "Bebidas", kind: "bebida", stock: 120, stockAlert: 24 },
    { id: "p6", name: "Milho cozido", price: 6, emoji: "🌽", barraca: "Milho", kind: "comida", stock: 30, stockAlert: 6 },
    { id: "p7", name: "Canjica", price: 9, emoji: "🥣", barraca: "Doces", kind: "doce", stock: 25, stockAlert: 5 },
    { id: "p8", name: "Cachorro-quente", price: 14, emoji: "🌭", barraca: "Lanches", kind: "comida", stock: 40, stockAlert: 8 },
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
  roles: builtInRoles,
  staff: [
    { id: "staff_admin", name: "Marcos (Organizador)", pin: "1234", roleId: "role_admin", active: true, createdAt: Date.now() },
    { id: "staff_caixa", name: "Bia (Bilheteria)",     pin: "2222", roleId: "role_caixa", active: true, createdAt: Date.now() },
    { id: "staff_barr",  name: "Seu Zé (Churrasco)",   pin: "3333", roleId: "role_barraca", active: true, createdAt: Date.now() },
  ],
  refundRequests: [],
  refundLogs: [],
  sessionStaffId: null,
  salesStatus: { topUps: "open", charges: "open", walletsActiveAfterClose: true },
  stockMoves: [],
  clientStockVisibility: "esgotado",
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
 * pelo Caixa; caso contrário, da carteira do cliente logado. Quando a ficha
 * tem `passphrase`, é obrigatório passar `passphrase` correta — protege
 * fichas que vazem por foto do QR.
 */
export function chargeProduct(productId: string, walletCode?: string, passphrase?: string) {
  const s = read();
  const p = s.products.find((x) => x.id === productId);
  if (!p) throw new Error("Produto não encontrado");

  let payerName = s.user.name;
  let newBalance: number;

  if (walletCode) {
    const w = s.wallets.find((x) => x.code === walletCode);
    if (!w) throw new Error("Ficha não encontrada");
    if (w.passphrase) {
      const given = (passphrase ?? "").trim().toUpperCase();
      if (!given) throw new Error("Esta ficha exige palavra-chave");
      if (given !== w.passphrase) throw new Error("Palavra-chave incorreta");
    }
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
    walletCode,
    refunded: 0,
  });
  write(s);
  return { product: p, balance: newBalance };
}

/** Verifica código + palavra-chave. Usado no PDV antes de montar o pedido. */
export function verifyWalletAccess(code: string, passphrase?: string): Wallet {
  const s = read();
  const w = s.wallets.find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
  if (!w) throw new Error("Ficha não encontrada");
  if (w.passphrase) {
    const given = (passphrase ?? "").trim().toUpperCase();
    if (!given) throw new Error("Esta ficha exige palavra-chave");
    if (given !== w.passphrase) throw new Error("Palavra-chave incorreta");
  }
  return w;
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
export function issueWallet(opts: { holder?: string; amount: number; issuedBy: string; passphrase?: string }): Wallet {
  if (opts.amount <= 0) throw new Error("Valor inválido");
  const pass = opts.passphrase?.trim();
  if (pass && pass.length < 3) throw new Error("Palavra-chave muito curta (mín. 3 caracteres)");
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
    passphrase: pass ? pass.toUpperCase() : undefined,
  };
  s.wallets.unshift(w);
  write(s);
  return w;
}

/**
 * Cliente converte parte do saldo digital em uma ficha offline (carteira própria).
 * Útil pra usar a ficha sem internet na festa, emprestar, etc.
 */
export function convertBalanceToWallet(opts: { amount: number; passphrase?: string }): Wallet {
  const s = read();
  if (opts.amount <= 0) throw new Error("Valor inválido");
  if (opts.amount > s.user.balance) throw new Error("Saldo insuficiente");
  s.user.balance -= opts.amount;
  write(s);
  return issueWallet({
    holder: s.user.name || undefined,
    amount: opts.amount,
    issuedBy: `Cliente: ${s.user.name || "anônimo"}`,
    passphrase: opts.passphrase,
  });
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

/* ----------------------------- Sessão / RBAC ---------------------------- */

export function login(staffId: string, pin: string): Staff {
  const s = read();
  const u = s.staff.find((x) => x.id === staffId);
  if (!u) throw new Error("Usuário não encontrado");
  if (!u.active) throw new Error("Usuário desativado");
  if (u.pin !== pin) throw new Error("PIN incorreto");
  s.sessionStaffId = u.id;
  write(s);
  return u;
}

export function logout() {
  const s = read();
  s.sessionStaffId = null;
  write(s);
}

export function getCurrentStaff(): Staff | null {
  const s = read();
  if (!s.sessionStaffId) return null;
  return s.staff.find((x) => x.id === s.sessionStaffId) ?? null;
}

export function getCurrentPermissions(): Permission[] {
  const s = read();
  const u = s.staff.find((x) => x.id === s.sessionStaffId);
  if (!u) return [];
  const role = s.roles.find((r) => r.id === u.roleId);
  return role?.permissions ?? [];
}

export function hasPermission(p: Permission): boolean {
  const perms = getCurrentPermissions();
  return perms.includes("admin.full") || perms.includes(p);
}

/* ----------------------------- Roles CRUD ------------------------------- */

export function upsertRole(r: Role) {
  const s = read();
  const i = s.roles.findIndex((x) => x.id === r.id);
  if (i >= 0) {
    // Built-ins: preservar flag
    s.roles[i] = { ...r, builtIn: s.roles[i].builtIn };
  } else {
    s.roles.unshift({ ...r, builtIn: false });
  }
  write(s);
}

export function removeRole(id: string) {
  const s = read();
  const r = s.roles.find((x) => x.id === id);
  if (!r) return;
  if (r.builtIn) throw new Error("Perfis padrão não podem ser removidos");
  if (s.staff.some((u) => u.roleId === id)) throw new Error("Existem usuários com este perfil");
  s.roles = s.roles.filter((x) => x.id !== id);
  write(s);
}

/* ----------------------------- Staff CRUD ------------------------------- */

export function upsertStaff(u: Staff) {
  if (!u.name.trim()) throw new Error("Nome obrigatório");
  if (!/^\d{4}$/.test(u.pin)) throw new Error("PIN deve ter 4 dígitos");
  const s = read();
  const i = s.staff.findIndex((x) => x.id === u.id);
  if (i >= 0) s.staff[i] = u; else s.staff.unshift(u);
  write(s);
}

export function removeStaff(id: string) {
  const s = read();
  s.staff = s.staff.filter((x) => x.id !== id);
  if (s.sessionStaffId === id) s.sessionStaffId = null;
  write(s);
}

/* --------------------------- Reembolsos / Estorno ----------------------- */

/** Executa estorno direto: devolve saldo à ficha (ou marca venda) e loga. */
export function executeRefund(opts: { saleId: string; amount: number; reason: string; by: string; via?: "direct" | "approved" }): RefundLog {
  const s = read();
  const sale = s.sales.find((x) => x.id === opts.saleId);
  if (!sale) throw new Error("Venda não encontrada");
  if (!opts.reason.trim() || opts.reason.trim().length < 4) throw new Error("Motivo obrigatório (mín. 4 caracteres)");
  const already = sale.refunded ?? 0;
  const max = sale.price - already;
  if (opts.amount <= 0 || opts.amount > max) throw new Error(`Valor inválido (máx R$${max})`);

  // Devolve à carteira de origem
  if (sale.walletCode) {
    const w = s.wallets.find((x) => x.code === sale.walletCode);
    if (!w) throw new Error("Ficha de origem não encontrada");
    w.balance += opts.amount;
    w.consumed = Math.max(0, w.consumed - opts.amount);
  } else {
    s.user.balance += opts.amount;
  }

  sale.refunded = already + opts.amount;

  const log: RefundLog = {
    id: "rl_" + Math.random().toString(36).slice(2, 9),
    saleId: sale.id,
    walletCode: sale.walletCode,
    amount: opts.amount,
    reason: opts.reason.trim(),
    by: opts.by,
    at: Date.now(),
    via: opts.via ?? "direct",
  };
  s.refundLogs.unshift(log);
  write(s);
  return log;
}

export function createRefundRequest(opts: { saleId: string; amount: number; reason: string; requestedBy: string }): RefundRequest {
  const s = read();
  const sale = s.sales.find((x) => x.id === opts.saleId);
  if (!sale) throw new Error("Venda não encontrada");
  if (!opts.reason.trim() || opts.reason.trim().length < 4) throw new Error("Motivo obrigatório (mín. 4 caracteres)");
  const already = sale.refunded ?? 0;
  const max = sale.price - already;
  if (opts.amount <= 0 || opts.amount > max) throw new Error(`Valor inválido (máx R$${max})`);
  const r: RefundRequest = {
    id: "rr_" + Math.random().toString(36).slice(2, 9),
    saleId: sale.id,
    walletCode: sale.walletCode,
    amount: opts.amount,
    reason: opts.reason.trim(),
    requestedBy: opts.requestedBy,
    requestedAt: Date.now(),
    status: "pending",
  };
  s.refundRequests.unshift(r);
  write(s);
  return r;
}

export function decideRefundRequest(id: string, approve: boolean, by: string, note?: string) {
  const s = read();
  const r = s.refundRequests.find((x) => x.id === id);
  if (!r) throw new Error("Solicitação não encontrada");
  if (r.status !== "pending") throw new Error("Solicitação já decidida");
  r.status = approve ? "approved" : "denied";
  r.decidedBy = by;
  r.decidedAt = Date.now();
  r.decisionNote = note?.trim() || undefined;
  write(s);
  if (approve) {
    executeRefund({ saleId: r.saleId, amount: r.amount, reason: r.reason, by, via: "approved" });
  }
}

/** Busca venda por ID curto (últimos 6 chars) ou código de ficha. */
export function searchSales(query: string): Sale[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const s = read();
  return s.sales.filter(
    (x) =>
      x.id.toUpperCase().includes(q) ||
      (x.walletCode?.toUpperCase().includes(q) ?? false) ||
      x.user.toUpperCase().includes(q) ||
      x.product.toUpperCase().includes(q),
  ).slice(0, 25);
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
