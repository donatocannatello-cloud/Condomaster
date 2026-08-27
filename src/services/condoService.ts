// Local, on-device data layer. No network calls: everything lives in localStorage
// on the phone, which is exactly what makes this app work fully offline.

const LOCAL_ADMIN_UID = 'local_admin';

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getCache<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data) as T;
  } catch (_) {
    return defaultValue;
  }
}

function setCache<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export interface CondoUnit {
  id: string;
  condoId: string;
  number: string;
  millesimi: number;
  ownerUid: string;
  ownerName: string;
  ownerPhone?: string;
  tenantUid?: string;
  tenantName?: string;
  tenantPhone?: string;
}

export interface Condominium {
  id: string;
  name: string;
  address: string;
  adminUid: string;
  totalMillesimi: number;
}

export type ExpenseCategory = 'ordinaria' | 'straordinaria';
export type ExpenseType = 'amministrazione' | 'pulizia' | 'ascensore' | 'riscaldamento' | 'struttura' | 'altro';
export type PaidBy = 'proprietario' | 'inquilino' | 'misto';

export interface Expense {
  id: string;
  condoId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  date: any;
  paidBy: PaidBy;
}

export interface Payment {
  id: string;
  condoId: string;
  unitId: string;
  title: string;
  amount: number;
  dueDate: any;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  type: 'rate' | 'rent' | 'extra';
  isRecurring?: boolean;
  paidAt?: any;
  recipientName?: string;
  recipientUid?: string;
  recipientType?: 'owner' | 'tenant';
  paidAmount?: number;
}

const condosKey = () => `cached_condos_${LOCAL_ADMIN_UID}`;
const unitsKey = (condoId: string) => `cached_units_${condoId}`;
const expensesKey = (condoId: string) => `cached_expenses_${condoId}`;
const paymentsKey = (condoId: string) => `cached_payments_${condoId}`;

export async function createCondo(name: string, address: string) {
  const condo: Condominium = {
    id: newId('condo'),
    name,
    address,
    adminUid: LOCAL_ADMIN_UID,
    totalMillesimi: 1000
  };
  const condos = getCache<Condominium[]>(condosKey(), []);
  setCache(condosKey(), [...condos, condo]);
  return condo.id;
}

export async function updateCondo(id: string, name: string, address: string) {
  const condos = getCache<Condominium[]>(condosKey(), []);
  setCache(condosKey(), condos.map(c => c.id === id ? { ...c, name, address } : c));
}

export async function deleteCondo(id: string) {
  const condos = getCache<Condominium[]>(condosKey(), []);
  setCache(condosKey(), condos.filter(c => c.id !== id));
  localStorage.removeItem(unitsKey(id));
  localStorage.removeItem(expensesKey(id));
  localStorage.removeItem(paymentsKey(id));
}

export async function getCondosByAdmin() {
  return getCache<Condominium[]>(condosKey(), []);
}

export async function addUnit(condoId: string, unitData: Omit<CondoUnit, 'id' | 'condoId'>) {
  const unit: CondoUnit = { id: newId('unit'), condoId, ...unitData };
  const units = getCache<CondoUnit[]>(unitsKey(condoId), []);
  setCache(unitsKey(condoId), [...units, unit]);
  return unit.id;
}

export async function updateUnit(condoId: string, unitId: string, unitData: Partial<Omit<CondoUnit, 'id' | 'condoId'>>) {
  const units = getCache<CondoUnit[]>(unitsKey(condoId), []);
  setCache(unitsKey(condoId), units.map(u => u.id === unitId ? { ...u, ...unitData } : u));
}

export async function deleteUnit(condoId: string, unitId: string) {
  const units = getCache<CondoUnit[]>(unitsKey(condoId), []);
  setCache(unitsKey(condoId), units.filter(u => u.id !== unitId));
}

export async function getUnits(condoId: string) {
  return getCache<CondoUnit[]>(unitsKey(condoId), []);
}

export async function addExpense(condoId: string, expenseData: Omit<Expense, 'id' | 'condoId'>) {
  const expense: Expense = { id: newId('exp'), condoId, ...expenseData };
  const expenses = getCache<Expense[]>(expensesKey(condoId), []);
  setCache(expensesKey(condoId), [...expenses, expense]);
  return expense.id;
}

export async function updateExpense(condoId: string, expenseId: string, expenseData: Partial<Omit<Expense, 'id' | 'condoId'>>) {
  const expenses = getCache<Expense[]>(expensesKey(condoId), []);
  setCache(expensesKey(condoId), expenses.map(e => e.id === expenseId ? { ...e, ...expenseData } : e));
}

export async function deleteExpense(condoId: string, expenseId: string) {
  const expenses = getCache<Expense[]>(expensesKey(condoId), []);
  setCache(expensesKey(condoId), expenses.filter(e => e.id !== expenseId));
}

export async function getExpenses(condoId: string) {
  return getCache<Expense[]>(expensesKey(condoId), []);
}

export async function addPayment(condoId: string, paymentData: Omit<Payment, 'id' | 'condoId'>) {
  const payment: Payment = { id: newId('pay'), condoId, ...paymentData };
  const payments = getCache<Payment[]>(paymentsKey(condoId), []);
  setCache(paymentsKey(condoId), [...payments, payment]);
  return payment.id;
}

export async function updatePayment(condoId: string, paymentId: string, paymentData: Partial<Omit<Payment, 'id' | 'condoId'>>) {
  const payments = getCache<Payment[]>(paymentsKey(condoId), []);
  setCache(paymentsKey(condoId), payments.map(p => p.id === paymentId ? { ...p, ...paymentData } : p));
}

export async function deletePayment(condoId: string, paymentId: string) {
  const payments = getCache<Payment[]>(paymentsKey(condoId), []);
  setCache(paymentsKey(condoId), payments.filter(p => p.id !== paymentId));
}

export async function getPayments(condoId: string) {
  return getCache<Payment[]>(paymentsKey(condoId), []);
}

export async function getAllAdminPayments() {
  const condos = await getCondosByAdmin();
  const allPayments = await Promise.all(condos.map(async (condo) => {
    const p = await getPayments(condo.id);
    return p.map(pay => ({ ...pay, condoName: condo.name }));
  }));
  return allPayments.flat();
}

export function getExpenseSplit(expense: Expense, unit: CondoUnit) {
  const totalMillesimi = 1000;
  const unitMillesimi = unit.millesimi;

  const unitTotalShare = (expense.amount * unitMillesimi) / totalMillesimi;

  let ownerShare = 0;
  let tenantShare = 0;

  if (expense.category === 'straordinaria' || expense.type === 'struttura' || expense.type === 'amministrazione') {
    ownerShare = unitTotalShare;
    tenantShare = 0;
  } else if (expense.category === 'ordinaria') {
    switch (expense.type) {
      case 'pulizia':
      case 'riscaldamento':
        tenantShare = unitTotalShare;
        ownerShare = 0;
        break;
      case 'ascensore':
        tenantShare = unitTotalShare;
        break;
      default:
        tenantShare = unitTotalShare;
        break;
    }
  }

  if (!unit.tenantUid && !unit.tenantName) {
    ownerShare = unitTotalShare;
    tenantShare = 0;
  }

  return {
    total: unitTotalShare,
    owner: ownerShare,
    tenant: tenantShare
  };
}

// Backup / restore: lets the admin save all local data to a JSON file and
// reload it later (e.g. after reinstalling the app or switching phone).
export interface BackupData {
  version: 1;
  exportedAt: string;
  condos: Condominium[];
  unitsByCondo: Record<string, CondoUnit[]>;
  expensesByCondo: Record<string, Expense[]>;
  paymentsByCondo: Record<string, Payment[]>;
}

export async function exportBackup(): Promise<BackupData> {
  const condos = await getCondosByAdmin();
  const unitsByCondo: Record<string, CondoUnit[]> = {};
  const expensesByCondo: Record<string, Expense[]> = {};
  const paymentsByCondo: Record<string, Payment[]> = {};

  for (const condo of condos) {
    unitsByCondo[condo.id] = await getUnits(condo.id);
    expensesByCondo[condo.id] = await getExpenses(condo.id);
    paymentsByCondo[condo.id] = await getPayments(condo.id);
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    condos,
    unitsByCondo,
    expensesByCondo,
    paymentsByCondo
  };
}

export async function importBackup(data: BackupData) {
  if (!data || data.version !== 1 || !Array.isArray(data.condos)) {
    throw new Error("File di backup non valido o incompatibile.");
  }

  setCache(condosKey(), data.condos);
  for (const condoId of Object.keys(data.unitsByCondo || {})) {
    setCache(unitsKey(condoId), data.unitsByCondo[condoId]);
  }
  for (const condoId of Object.keys(data.expensesByCondo || {})) {
    setCache(expensesKey(condoId), data.expensesByCondo[condoId]);
  }
  for (const condoId of Object.keys(data.paymentsByCondo || {})) {
    setCache(paymentsKey(condoId), data.paymentsByCondo[condoId]);
  }

  return {
    importedCondos: data.condos.length,
    importedUnits: Object.values(data.unitsByCondo || {}).reduce((sum, u) => sum + u.length, 0),
    importedExpenses: Object.values(data.expensesByCondo || {}).reduce((sum, e) => sum + e.length, 0),
    importedPayments: Object.values(data.paymentsByCondo || {}).reduce((sum, p) => sum + p.length, 0),
  };
}
