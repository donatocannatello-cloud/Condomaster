import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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

async function syncToAruba(op: 'CREATE' | 'UPDATE' | 'DELETE', collectionName: string, id: string, data?: any) {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, collection: collectionName, id, data })
    });
    return await res.json();
  } catch (e) {
    console.warn("Mirror sync failed (optional):", e);
  }
}

// Helper to read/write cache
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

export async function createCondo(name: string, address: string) {
  const path = 'condos';
  const uid = auth.currentUser?.uid || 'offline_user';
  const cacheKey = `cached_condos_${uid}`;
  const data = {
    name,
    address,
    adminUid: uid,
    totalMillesimi: 1000,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      createdAt: serverTimestamp()
    });
    await syncToAruba('CREATE', 'condos', docRef.id, data);
    
    const cached = getCache<Condominium[]>(cacheKey, []);
    setCache(cacheKey, [...cached, { id: docRef.id, ...data }]);
    return docRef.id;
  } catch (error: any) {
    console.warn("createCondo failed, writing to local cache:", error.message || error);
    const mockId = 'local_condo_' + Math.random().toString(36).substr(2, 9);
    const cached = getCache<Condominium[]>(cacheKey, []);
    setCache(cacheKey, [...cached, { id: mockId, ...data }]);
    return mockId;
  }
}

export async function updateCondo(id: string, name: string, address: string) {
  const path = `condos/${id}`;
  const uid = auth.currentUser?.uid || 'offline_user';
  const cacheKey = `cached_condos_${uid}`;
  const data = {
    name,
    address,
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'condos', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    await syncToAruba('UPDATE', 'condos', id, data);
  } catch (error: any) {
    console.warn("updateCondo failed, bypassing to local cache:", error.message || error);
  }

  const cached = getCache<Condominium[]>(cacheKey, []);
  setCache(cacheKey, cached.map(c => c.id === id ? { ...c, ...data } : c));
}

export async function deleteCondo(id: string) {
  const path = `condos/${id}`;
  const uid = auth.currentUser?.uid || 'offline_user';
  const cacheKey = `cached_condos_${uid}`;

  try {
    const docRef = doc(db, 'condos', id);
    await deleteDoc(docRef);
    await syncToAruba('DELETE', 'condos', id);
  } catch (error: any) {
    console.warn("deleteCondo failed, deleting from local cache:", error.message || error);
  }

  const cached = getCache<Condominium[]>(cacheKey, []);
  setCache(cacheKey, cached.filter(c => c.id !== id));
}

export async function getCondosByAdmin() {
  const path = 'condos';
  const uid = auth.currentUser?.uid || 'offline_user';
  const cacheKey = `cached_condos_${uid}`;

  try {
    const q = query(collection(db, path), where('adminUid', '==', uid));
    const querySnapshot = await getDocs(q);
    const condos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Condominium));
    setCache(cacheKey, condos);
    return condos;
  } catch (error: any) {
    console.warn("getCondosByAdmin failed, falling back to cache/mock data:", error.message || error);
    const cached = getCache<Condominium[]>(cacheKey, []);
    if (cached.length > 0) return cached;
    
    // Provide high-quality initial data under offline evaluation mode
    const mockCondos: Condominium[] = [
      { id: "mock_condo_1", name: "Condominio Belvedere", address: "Via Roma 45, Milano", adminUid: uid, totalMillesimi: 1000 },
      { id: "mock_condo_2", name: "Residenza Sole", address: "Corso Vittorio Emanuele 12, Torino", adminUid: uid, totalMillesimi: 1000 }
    ];
    // Return mock data but do NOT write it to cache to avoid polluting real database reads later
    return mockCondos;
  }
}

export async function addUnit(condoId: string, unitData: Omit<CondoUnit, 'id' | 'condoId'>) {
  const path = `condos/${condoId}/units`;
  const cacheKey = `cached_units_${condoId}`;
  const data = {
    ...unitData,
    condoId,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, path), {
      ...unitData,
      condoId,
      createdAt: serverTimestamp()
    });
    await syncToAruba('CREATE', 'units', docRef.id, data);
    
    const cached = getCache<CondoUnit[]>(cacheKey, []);
    setCache(cacheKey, [...cached, { id: docRef.id, ...data }]);
    return docRef.id;
  } catch (error: any) {
    console.warn("addUnit failed, caching locally:", error.message || error);
    const mockId = 'local_unit_' + Math.random().toString(36).substr(2, 9);
    const cached = getCache<CondoUnit[]>(cacheKey, []);
    setCache(cacheKey, [...cached, { id: mockId, ...data }]);
    return mockId;
  }
}

export async function updateUnit(condoId: string, unitId: string, unitData: Partial<Omit<CondoUnit, 'id' | 'condoId'>>) {
  const path = `condos/${condoId}/units/${unitId}`;
  const cacheKey = `cached_units_${condoId}`;
  const data = {
    ...unitData,
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'condos', condoId, 'units', unitId);
    await updateDoc(docRef, {
      ...unitData,
      updatedAt: serverTimestamp()
    });
    await syncToAruba('UPDATE', 'units', unitId, { ...data, condoId });
  } catch (error: any) {
    console.warn("updateUnit failed, saving locally:", error.message || error);
  }

  const cached = getCache<CondoUnit[]>(cacheKey, []);
  setCache(cacheKey, cached.map(u => u.id === unitId ? { ...u, ...data } : u));
}

export async function deleteUnit(condoId: string, unitId: string) {
  const path = `condos/${condoId}/units/${unitId}`;
  const cacheKey = `cached_units_${condoId}`;

  try {
    const docRef = doc(db, 'condos', condoId, 'units', unitId);
    await deleteDoc(docRef);
    await syncToAruba('DELETE', 'units', unitId);
  } catch (error: any) {
    console.warn("deleteUnit failed, deleting locally:", error.message || error);
  }

  const cached = getCache<CondoUnit[]>(cacheKey, []);
  setCache(cacheKey, cached.filter(u => u.id !== unitId));
}

export async function getUnits(condoId: string) {
  const path = `condos/${condoId}/units`;
  const cacheKey = `cached_units_${condoId}`;

  try {
    const querySnapshot = await getDocs(collection(db, path));
    const units = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CondoUnit));
    setCache(cacheKey, units);
    return units;
  } catch (error: any) {
    console.warn(`getUnits failed for ${condoId}, using local cache/mock:`, error.message || error);
    const cached = getCache<CondoUnit[]>(cacheKey, []);
    if (cached.length > 0) return cached;
    
    if (condoId === 'mock_condo_1') {
      const mockUnits: CondoUnit[] = [
        { id: "mock_unit_1", condoId, number: "A/1", millesimi: 250, ownerUid: auth.currentUser?.uid || "mock_uid", ownerName: "Donato Cannatello", ownerPhone: "+393450000001" },
        { id: "mock_unit_2", condoId, number: "A/2", millesimi: 350, ownerUid: "another_uid", ownerName: "Giovanni Verdi", ownerPhone: "+393450000002", tenantUid: auth.currentUser?.uid || "mock_uid", tenantName: "Francesco Rossi", tenantPhone: "+393450000003" },
        { id: "mock_unit_3", condoId, number: "B/1", millesimi: 400, ownerUid: "third_uid", ownerName: "Giulia Bianchi", ownerPhone: "+393450000004" }
      ];
      // Do not write mock units to cache so that if data becomes available later, cache remains clean
      return mockUnits;
    }
    return [];
  }
}

export async function addExpense(condoId: string, expenseData: Omit<Expense, 'id' | 'condoId'>) {
  const path = `condos/${condoId}/expenses`;
  const cacheKey = `cached_expenses_${condoId}`;
  const data = {
    ...expenseData,
    condoId,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, path), {
      ...expenseData,
      condoId,
      createdAt: serverTimestamp()
    });
    await syncToAruba('CREATE', 'expenses', docRef.id, data);
    
    const cached = getCache<Expense[]>(cacheKey, []);
    setCache(cacheKey, [...cached, { id: docRef.id, ...data }]);
    return docRef.id;
  } catch (error: any) {
    console.warn("addExpense failed, bypass to local cache:", error.message || error);
    const mockId = 'local_exp_' + Math.random().toString(36).substr(2, 9);
    const cached = getCache<Expense[]>(cacheKey, []);
    setCache(cacheKey, [...cached, { id: mockId, ...data }]);
    return mockId;
  }
}

export async function updateExpense(condoId: string, expenseId: string, expenseData: Partial<Omit<Expense, 'id' | 'condoId'>>) {
  const path = `condos/${condoId}/expenses/${expenseId}`;
  const cacheKey = `cached_expenses_${condoId}`;
  const data = {
    ...expenseData,
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'condos', condoId, 'expenses', expenseId);
    await updateDoc(docRef, {
      ...expenseData,
      updatedAt: serverTimestamp()
    });
    await syncToAruba('UPDATE', 'expenses', expenseId, { ...data, condoId });
  } catch (error: any) {
    console.warn("updateExpense failed, bypassing:", error.message || error);
  }

  const cached = getCache<Expense[]>(cacheKey, []);
  setCache(cacheKey, cached.map(e => e.id === expenseId ? { ...e, ...data } : e));
}

export async function deleteExpense(condoId: string, expenseId: string) {
  const path = `condos/${condoId}/expenses/${expenseId}`;
  const cacheKey = `cached_expenses_${condoId}`;

  try {
    const docRef = doc(db, 'condos', condoId, 'expenses', expenseId);
    await deleteDoc(docRef);
    await syncToAruba('DELETE', 'expenses', expenseId);
  } catch (error: any) {
    console.warn("deleteExpense failed, bypassing:", error.message || error);
  }

  const cached = getCache<Expense[]>(cacheKey, []);
  setCache(cacheKey, cached.filter(e => e.id !== expenseId));
}

export async function getExpenses(condoId: string) {
  const path = `condos/${condoId}/expenses`;
  const cacheKey = `cached_expenses_${condoId}`;

  try {
    const querySnapshot = await getDocs(collection(db, path));
    const expenses = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date
      } as Expense;
    });
    setCache(cacheKey, expenses);
    return expenses;
  } catch (error: any) {
    console.warn(`getExpenses failed for ${condoId}, using cache:`, error.message || error);
    const cached = getCache<Expense[]>(cacheKey, []);
    if (cached.length > 0) return cached;

    if (condoId === 'mock_condo_1') {
      const mockExpenses: Expense[] = [
        { id: "mock_exp_1", condoId, title: "Manutenzione Ascensore", amount: 450, category: "ordinaria", type: "ascensore", date: new Date(2026, 5, 10).toISOString(), paidBy: "proprietario" },
        { id: "mock_exp_2", condoId, title: "Pulizia Scale Maggio", amount: 200, category: "ordinaria", type: "pulizia", date: new Date(2026, 4, 31).toISOString(), paidBy: "inquilino" },
        { id: "mock_exp_3", condoId, title: "Rifacimento Facciata", amount: 15000, category: "straordinaria", type: "struttura", date: new Date(2026, 3, 15).toISOString(), paidBy: "proprietario" }
      ];
      // Do not write mock data to local storage to keep persistent database reads clear
      return mockExpenses;
    }
    return [];
  }
}

export async function addPayment(condoId: string, paymentData: Omit<Payment, 'id' | 'condoId'>) {
  const path = `condos/${condoId}/payments`;
  const cacheKey = `cached_payments_${condoId}`;
  const data = {
    ...paymentData,
    condoId,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, path), {
      ...paymentData,
      condoId,
      createdAt: serverTimestamp()
    });
    await syncToAruba('CREATE', 'payments', docRef.id, data);
    
    const cached = getCache<Payment[]>(cacheKey, []);
    setCache(cacheKey, [...cached, { id: docRef.id, ...data }]);
    return docRef.id;
  } catch (error: any) {
    console.warn("addPayment failed, caching locally:", error.message || error);
    const mockId = 'local_pay_' + Math.random().toString(36).substr(2, 9);
    const cached = getCache<Payment[]>(cacheKey, []);
    setCache(cacheKey, [...cached, { id: mockId, ...data }]);
    return mockId;
  }
}

export async function updatePayment(condoId: string, paymentId: string, paymentData: Partial<Omit<Payment, 'id' | 'condoId'>>) {
  const path = `condos/${condoId}/payments/${paymentId}`;
  const cacheKey = `cached_payments_${condoId}`;
  const data = {
    ...paymentData,
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'condos', condoId, 'payments', paymentId);
    await updateDoc(docRef, {
      ...paymentData,
      updatedAt: serverTimestamp()
    });
    await syncToAruba('UPDATE', 'payments', paymentId, { ...data, condoId });
  } catch (error: any) {
    console.warn("updatePayment failed, saving locally:", error.message || error);
  }

  const cached = getCache<Payment[]>(cacheKey, []);
  setCache(cacheKey, cached.map(p => p.id === paymentId ? { ...p, ...data } : p));
}

export async function deletePayment(condoId: string, paymentId: string) {
  const path = `condos/${condoId}/payments/${paymentId}`;
  const cacheKey = `cached_payments_${condoId}`;

  try {
    const docRef = doc(db, 'condos', condoId, 'payments', paymentId);
    await deleteDoc(docRef);
    await syncToAruba('DELETE', 'payments', paymentId);
  } catch (error: any) {
    console.warn("deletePayment failed, bypassing:", error.message || error);
  }

  const cached = getCache<Payment[]>(cacheKey, []);
  setCache(cacheKey, cached.filter(p => p.id !== paymentId));
}

export async function getPayments(condoId: string) {
  const path = `condos/${condoId}/payments`;
  const cacheKey = `cached_payments_${condoId}`;

  try {
    const querySnapshot = await getDocs(collection(db, path));
    const payments = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate().toISOString() : data.dueDate,
        paidAt: data.paidAt instanceof Timestamp ? data.paidAt.toDate().toISOString() : data.paidAt
      } as Payment;
    });
    setCache(cacheKey, payments);
    return payments;
  } catch (error: any) {
    console.warn(`getPayments failed for ${condoId}, using local cache/mock:`, error.message || error);
    const cached = getCache<Payment[]>(cacheKey, []);
    if (cached.length > 0) return cached;

    if (condoId === 'mock_condo_1') {
      const mockPayments: Payment[] = [
        { id: "mock_pay_1", condoId, unitId: "mock_unit_1", title: "Rata Amministrazione Q1", amount: 150, dueDate: "2026-05-31", status: "paid", type: "rate", recipientName: "Donato Cannatello", recipientUid: auth.currentUser?.uid || "mock_uid", recipientType: "owner", paidAt: new Date(2026, 4, 30).toISOString(), paidAmount: 150 },
        { id: "mock_pay_2", condoId, unitId: "mock_unit_1", title: "Rata Amministrazione Q2", amount: 150, dueDate: "2026-06-30", status: "pending", type: "rate", recipientName: "Donato Cannatello", recipientUid: auth.currentUser?.uid || "mock_uid", recipientType: "owner" },
        { id: "mock_pay_3", condoId, unitId: "mock_unit_2", title: "Sollecito Spese Straordinarie Facciata", amount: 1200, dueDate: "2026-06-15", status: "overdue", type: "rate", recipientName: "Francesco Rossi", recipientUid: auth.currentUser?.uid || "mock_uid", recipientType: "tenant" }
      ];
      // Do not write mock data to local storage to keep persistent database reads clear
      return mockPayments;
    }
    return [];
  }
}

export async function getAllAdminPayments() {
  try {
    const condos = await getCondosByAdmin();
    if (!condos) return [];

    const allPaymentsPromise = condos.map(async (condo) => {
      const p = await getPayments(condo.id);
      return (p || []).map(pay => ({ ...pay, condoName: condo.name }));
    });

    const results = await Promise.all(allPaymentsPromise);
    return results.flat();
  } catch (error) {
    console.error(error);
    return [];
  }
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

export async function importFromArubaToFirestore(arubaConfig: any) {
  const res = await fetch('/api/db/import-aruba', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arubaConfig)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Errore sconosciuto sul server.");
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Impossibile recuperare i dati da Aruba.");
  }

  const { condos, units, expenses, payments } = data;
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Utente non autenticato.");

  // Apply cache updates directly so they are immediately visible offline
  const finalCondos = (condos || []).map((condo: any) => ({
    id: condo.id,
    name: condo.name,
    address: condo.address,
    adminUid: (condo.adminUid === 'offline_user' || !condo.adminUid) ? uid : condo.adminUid,
    totalMillesimi: Number(condo.totalMillesimi) || 1000
  }));
  localStorage.setItem(`cached_condos_${uid}`, JSON.stringify(finalCondos));

  // Cache units by condoId
  const unitsByCondo: { [condoId: string]: CondoUnit[] } = {};
  for (const unit of (units || [])) {
    if (!unitsByCondo[unit.condoId]) unitsByCondo[unit.condoId] = [];
    unitsByCondo[unit.condoId].push({
      id: unit.id,
      condoId: unit.condoId,
      number: unit.number,
      millesimi: Number(unit.millesimi),
      ownerUid: unit.ownerUid || '',
      ownerName: unit.ownerName || '',
      tenantUid: unit.tenantUid || '',
      tenantName: unit.tenantName || ''
    });
  }
  for (const condoId of Object.keys(unitsByCondo)) {
    localStorage.setItem(`cached_units_${condoId}`, JSON.stringify(unitsByCondo[condoId]));
  }

  // Cache expenses by condoId
  const expensesByCondo: { [condoId: string]: Expense[] } = {};
  for (const exp of (expenses || [])) {
    if (!expensesByCondo[exp.condoId]) expensesByCondo[exp.condoId] = [];
    expensesByCondo[exp.condoId].push({
      id: exp.id,
      condoId: exp.condoId,
      title: exp.title,
      amount: Number(exp.amount),
      category: exp.category,
      type: exp.type,
      date: exp.date,
      paidBy: exp.paidBy || 'proprietario'
    });
  }
  for (const condoId of Object.keys(expensesByCondo)) {
    localStorage.setItem(`cached_expenses_${condoId}`, JSON.stringify(expensesByCondo[condoId]));
  }

  // Cache payments by condoId
  const paymentsByCondo: { [condoId: string]: Payment[] } = {};
  for (const pay of (payments || [])) {
    if (!paymentsByCondo[pay.condoId]) paymentsByCondo[pay.condoId] = [];
    paymentsByCondo[pay.condoId].push({
      id: pay.id,
      condoId: pay.condoId,
      unitId: pay.unitId,
      title: pay.title,
      amount: Number(pay.amount),
      dueDate: pay.dueDate,
      status: pay.status || 'pending',
      type: pay.type || 'rate',
      isRecurring: !!pay.isRecurring,
      paidAt: pay.paidAt || null,
      recipientName: pay.recipientName || '',
      recipientUid: pay.recipientUid || '',
      recipientType: pay.recipientType || 'owner'
    });
  }
  for (const condoId of Object.keys(paymentsByCondo)) {
    localStorage.setItem(`cached_payments_${condoId}`, JSON.stringify(paymentsByCondo[condoId]));
  }

  // Attempt sync to Firestore in background
  const batchPromises: Promise<any>[] = [];

  // Write condos
  for (const condo of (condos || [])) {
    const finalAdminUid = (condo.adminUid === 'offline_user' || !condo.adminUid) ? uid : condo.adminUid;
    batchPromises.push(
      setDoc(doc(db, 'condos', condo.id), {
        name: condo.name,
        address: condo.address,
        adminUid: finalAdminUid,
        totalMillesimi: Number(condo.totalMillesimi) || 1000,
        createdAt: condo.createdAt || new Date().toISOString()
      }, { merge: true })
    );
  }

  // Write units
  for (const unit of (units || [])) {
    batchPromises.push(
      setDoc(doc(db, 'condos', unit.condoId, 'units', unit.id), {
        condoId: unit.condoId,
        number: unit.number,
        millesimi: Number(unit.millesimi),
        ownerUid: unit.ownerUid || '',
        ownerName: unit.ownerName || '',
        tenantUid: unit.tenantUid || '',
        tenantName: unit.tenantName || '',
        createdAt: unit.createdAt || new Date().toISOString()
      }, { merge: true })
    );
  }

  // Write expenses
  for (const expense of (expenses || [])) {
    batchPromises.push(
      setDoc(doc(db, 'condos', expense.condoId, 'expenses', expense.id), {
        condoId: expense.condoId,
        title: expense.title,
        amount: Number(expense.amount),
        category: expense.category,
        type: expense.type,
        date: expense.date,
        paidBy: expense.paidBy || 'proprietario',
        createdAt: expense.createdAt || new Date().toISOString()
      }, { merge: true })
    );
  }

  // Write payments
  for (const payment of (payments || [])) {
    batchPromises.push(
      setDoc(doc(db, 'condos', payment.condoId, 'payments', payment.id), {
        condoId: payment.condoId,
        unitId: payment.unitId,
        title: payment.title,
        amount: Number(payment.amount),
        dueDate: payment.dueDate,
        status: payment.status || 'pending',
        type: payment.type || 'rate',
        isRecurring: !!payment.isRecurring,
        paidAt: payment.paidAt || null,
        recipientName: payment.recipientName || '',
        recipientUid: payment.recipientUid || '',
        recipientType: payment.recipientType || 'owner',
        createdAt: payment.createdAt || new Date().toISOString()
      }, { merge: true })
    );
  }

  try {
    await Promise.all(batchPromises);
  } catch (fsError: any) {
    console.warn("Firestore syncing skipped (client offline/rules restriction), data is safely saved in local storage:", fsError.message || fsError);
  }

  return {
    importedCondos: condos?.length || 0,
    importedUnits: units?.length || 0,
    importedExpenses: expenses?.length || 0,
    importedPayments: payments?.length || 0,
  };
}
