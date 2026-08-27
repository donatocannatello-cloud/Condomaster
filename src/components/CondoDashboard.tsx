import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/src/services/authService';
import { 
  getUnits, 
  getExpenses, 
  getExpenseSplit, 
  getPayments,
  CondoUnit, 
  Expense,
  Condominium,
  Payment
} from '@/src/services/condoService';
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Receipt, Euro, User, Info, Building, AlertCircle, CheckCircle2, Clock, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CondoDashboard({ profile }: { profile: UserProfile }) {
  const [loading, setLoading] = useState(true);
  const [myUnits, setMyUnits] = useState<{unit: CondoUnit, condo: Condominium}[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  useEffect(() => {
    loadUserUnits();
  }, [profile.uid]);

  const loadUserUnits = async () => {
    setLoading(true);
    try {
      // Find units where this user is owner or tenant
      const found: {unit: CondoUnit, condo: Condominium}[] = [];
      let condos: Condominium[] = [];

      try {
        const condosSnapshot = await getDocs(collection(db, 'condos'));
        condos = condosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Condominium));
      } catch (e) {
        console.warn("Could not load condos list online, using fallback:", e);
        condos = [
          { id: "mock_condo_1", name: "Condominio Belvedere", address: "Via Roma 45, Milano", adminUid: "mock_admin", totalMillesimi: 1000 }
        ];
      }

      for (const condo of condos) {
        let units: CondoUnit[] = [];
        try {
          const unitsSnapshot = await getDocs(collection(db, `condos/${condo.id}/units`));
          units = unitsSnapshot.docs.map(uDoc => ({ id: uDoc.id, ...uDoc.data() } as CondoUnit));
        } catch (e) {
          console.warn(`Could not load units for condo ${condo.id} online, using fallback:`, e);
          if (condo.id === 'mock_condo_1' || condo.id === 'local_condo_1') {
            units = [
              { id: "mock_unit_1", condoId: condo.id, number: "A/1", millesimi: 250, ownerUid: profile.uid, ownerName: profile.displayName || "Donato Cannatello", ownerPhone: "+393450000001" },
              { id: "mock_unit_2", condoId: condo.id, number: "A/2", millesimi: 350, ownerUid: "another_uid", ownerName: "Giovanni Verdi", ownerPhone: "+393450000002", tenantUid: profile.uid, tenantName: profile.displayName || "Francesco Rossi", tenantPhone: "+393450000003" }
            ];
          }
        }

        units.forEach(uDoc => {
          if (
            uDoc.ownerUid === profile.uid || 
            uDoc.tenantUid === profile.uid || 
            uDoc.ownerUid === 'mock_uid' || 
            uDoc.tenantUid === 'mock_uid' || 
            uDoc.ownerName === profile.displayName || 
            uDoc.tenantName === profile.displayName
          ) {
            found.push({ unit: uDoc, condo: condo });
          }
        });
      }

      setMyUnits(found);
      if (found.length > 0) setSelectedUnitId(found[0].unit.id);
    } catch (error) {
      console.error("Failed to load user units in CondoDashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-slate-400 uppercase tracking-[0.4em] font-black text-xs animate-pulse">Sincronizzazione Dati...</div>
      </div>
    </div>
  );

  if (myUnits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-700">
        <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-100 mb-8 shadow-2xl shadow-slate-200">
          <User className="w-20 h-20 text-slate-300" />
        </div>
        <h3 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Accesso Riservato</h3>
        <p className="text-slate-500 max-w-sm mt-4 leading-relaxed font-bold uppercase text-[11px] tracking-widest opacity-60">
          Il tuo account non risulta associato ad alcuna unità immobiliare censita nel sistema centrale.
        </p>
        <div className="mt-12 p-6 bg-slate-900 rounded-3xl border border-slate-800 flex items-center gap-4 shadow-xl">
          <Info className="w-5 h-5 text-indigo-400" />
          <span className="text-[11px] uppercase font-black text-white tracking-[0.2em]">Contatta l'amministratore di sistema</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Area Riservata</h2>
          <div className="text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] mt-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Certificazione Trasparenza Condominiale
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Le Tue Proprietà</h3>
            <Badge className="bg-slate-100 text-slate-500 font-black border-none uppercase text-[9px] tracking-widest">{myUnits.length} Unit&agrave;</Badge>
          </div>
          <div className="space-y-6">
            {myUnits.map(({unit, condo}) => (
              <Card 
                key={unit.id} 
                className={`cursor-pointer transition-all duration-500 rounded-[2.5rem] border-2 overflow-hidden relative group ${
                  selectedUnitId === unit.id 
                    ? 'bg-slate-900 border-slate-900 shadow-2xl shadow-indigo-200 scale-[1.03]' 
                    : 'bg-white border-slate-100 hover:border-indigo-200 shadow-xl shadow-slate-100 hover:shadow-2xl'
                }`}
                onClick={() => setSelectedUnitId(unit.id)}
              >
                <CardHeader className="p-8">
                  <CardTitle className={`text-xl font-black uppercase tracking-tight flex items-center gap-3 transition-colors ${selectedUnitId === unit.id ? 'text-white' : 'text-slate-900'}`}>
                    <Building className={`w-6 h-6 ${selectedUnitId === unit.id ? 'text-indigo-400' : 'text-slate-300'}`} />
                    {condo.name}
                  </CardTitle>
                  <div className="flex items-center justify-between mt-8">
                    <div className="space-y-1">
                       <p className={`text-[9px] uppercase font-black tracking-widest transition-colors ${selectedUnitId === unit.id ? 'text-white/40' : 'text-slate-400'}`}>U.I. Codice</p>
                       <p className={`text-2xl font-mono font-black transition-colors ${selectedUnitId === unit.id ? 'text-white' : 'text-slate-900'}`}>{unit.number}</p>
                    </div>
                    <div className="text-right">
                       <p className={`text-[9px] uppercase font-black tracking-widest transition-colors ${selectedUnitId === unit.id ? 'text-white/40' : 'text-slate-400'}`}>Caratura</p>
                       <p className={`text-2xl font-mono font-black transition-colors ${selectedUnitId === unit.id ? 'text-indigo-400' : 'text-indigo-600'}`}>{unit.millesimi.toFixed(2)}</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8">
          {selectedUnitId && (
            <UnitDetails 
              unitInfo={myUnits.find(m => m.unit.id === selectedUnitId)!} 
              currentUserUid={profile.uid}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function UnitDetails({ unitInfo, currentUserUid }: { unitInfo: {unit: CondoUnit, condo: Condominium}, currentUserUid: string }) {
  const { unit, condo } = unitInfo;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const isOwner = unit.ownerUid === currentUserUid;

  useEffect(() => {
    const loadData = async () => {
      const expData = await getExpenses(condo.id);
      setExpenses(expData || []);
      const payData = await getPayments(condo.id);
      setPayments(payData || []);
    };
    loadData();
  }, [condo.id]);

  const totalOwner = expenses.reduce((sum, exp) => sum + getExpenseSplit(exp, unit).owner, 0);
  const totalTenant = expenses.reduce((sum, exp) => sum + getExpenseSplit(exp, unit).tenant, 0);

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <Card className="bg-white border-2 border-slate-100 rounded-[3rem] shadow-2xl shadow-slate-100 relative overflow-hidden group hover:border-indigo-200 transition-all">
          <div className="h-2 w-full bg-indigo-600" />
          <CardHeader className="px-10 pt-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-[0.25em] text-slate-400">Posizione Proprietario</CardTitle>
            <Euro className="w-6 h-6 text-slate-200 group-hover:text-indigo-600 transition-colors" />
          </CardHeader>
          <CardContent className="px-10 pb-10">
            <div className="text-5xl font-black font-mono text-slate-900 tracking-tighter">
              €{totalOwner.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
            <p className={`text-[10px] font-black mt-6 uppercase tracking-widest px-4 py-2 rounded-full w-fit ${
              isOwner ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-500'
            }`}>
              {isOwner ? 'Oneri Diretti' : 'Competenza Proprietà'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-slate-100 rounded-[3rem] shadow-2xl shadow-slate-100 relative overflow-hidden group hover:border-cyan-200 transition-all">
          <div className="h-2 w-full bg-cyan-500" />
          <CardHeader className="px-10 pt-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-[0.25em] text-slate-400">Posizione Conduttore</CardTitle>
            <Euro className="w-6 h-6 text-slate-200 group-hover:text-cyan-600 transition-colors" />
          </CardHeader>
          <CardContent className="px-10 pb-10">
            <div className="text-5xl font-black font-mono text-slate-900 tracking-tighter">
              €{totalTenant.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
            <p className={`text-[10px] font-black mt-6 uppercase tracking-widest px-4 py-2 rounded-full w-fit ${
              !isOwner ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-100' : 'bg-slate-100 text-slate-500'
            }`}>
              {!isOwner ? 'Oneri Diretti' : 'Competenza Inquilino'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-2 border-slate-100 rounded-[3rem] p-0 overflow-hidden shadow-2xl shadow-slate-100">
        <CardHeader className="px-10 py-10 bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-3xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
             <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-100">
              <Landmark className="w-6 h-6 text-indigo-600" />
             </div>
             I Tuoi Crediti e Riferimenti Personali
          </CardTitle>
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mt-3">Riepilogo delle rate e dei crediti del tuo immobile riconducibili ai soggetti censiti</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50 hover:bg-slate-50 h-16">
                  <TableHead className="text-slate-400 uppercase text-[11px] font-black tracking-widest px-10">Stato / Data</TableHead>
                  <TableHead className="text-slate-400 uppercase text-[11px] font-black tracking-widest">Descrizione / Tipo</TableHead>
                  <TableHead className="text-slate-400 uppercase text-[11px] font-black tracking-widest">Soggetto Debitore</TableHead>
                  <TableHead className="text-right text-slate-400 uppercase text-[11px] font-black tracking-widest px-10">Importo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.filter(p => p.unitId === unit.id).map(p => {
                  const isRecipientMe = 
                    p.recipientUid === currentUserUid || 
                    (p.recipientType === 'owner' && unit.ownerUid === currentUserUid) ||
                    (p.recipientType === 'tenant' && unit.tenantUid === currentUserUid);
                  
                  return (
                    <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50 transition-all h-28 group">
                      <TableCell className="px-10">
                        {p.status === 'paid' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1 px-2.5 py-0.5 font-black mb-1.5 uppercase text-[8px] tracking-widest"><CheckCircle2 className="w-2.5 h-2.5" /> Saldato</Badge>
                        ) : (p.status === 'partial' || (p.paidAmount && p.paidAmount > 0 && p.paidAmount < p.amount)) ? (
                          <Badge className="bg-sky-50 text-sky-700 border-sky-100 gap-1 px-2.5 py-0.5 font-black mb-1.5 uppercase text-[8px] tracking-widest"><Clock className="w-2.5 h-2.5" /> Parziale</Badge>
                        ) : p.status === 'overdue' ? (
                          <Badge className="bg-red-50 text-red-700 border-red-100 gap-1 px-2.5 py-0.5 font-black mb-1.5 uppercase text-[8px] tracking-widest"><AlertCircle className="w-2.5 h-2.5" /> Scaduto</Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-100 gap-1 px-2.5 py-0.5 font-black mb-1.5 uppercase text-[8px] tracking-widest"><Clock className="w-2.5 h-2.5" /> Attesa</Badge>
                        )}
                        <div className="text-[10px] font-mono font-black text-slate-400 tracking-tighter leading-none mt-1">Scad: {p.dueDate}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-black text-slate-900 text-xl tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{p.title}</div>
                        <div className="flex items-center gap-3 mt-2">
                           <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest text-slate-400 border-slate-100 px-3">{p.type === 'rate' ? 'Rata Cond.' : p.type === 'rent' ? 'Affitto' : 'Extra'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className={`${isRecipientMe ? 'text-indigo-600 font-extrabold' : 'text-slate-700 font-bold'} text-sm`}>
                            {p.recipientName || (p.recipientType === 'tenant' ? unit.tenantName : unit.ownerName) || 'Nessuno'}
                          </span>
                          <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                            {p.recipientType === 'tenant' ? 'Conduttore / Inquilino' : 'Proprietario'} 
                            {isRecipientMe && <span className="ml-1.5 text-indigo-500 font-black tracking-normal">(Tu)</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-10">
                         <div className="font-mono font-black text-slate-900 text-2xl tracking-tighter">€{p.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                         {p.paidAmount && p.paidAmount > 0 && p.paidAmount < p.amount ? (
                           <div className="text-[10px] text-emerald-600 font-extrabold mt-1">
                             Pagati: €{p.paidAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} &bull; Rim: €{(p.amount - p.paidAmount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                           </div>
                         ) : p.status === 'paid' ? (
                           <div className="text-[10px] text-emerald-600 font-bold mt-1">Interamente Saldato</div>
                         ) : (
                           <div className="text-[10px] text-slate-400 font-bold mt-1">Importo Dovuto</div>
                         )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {payments.filter(p => p.unitId === unit.id).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-24 text-slate-200 uppercase tracking-[0.4em] text-[13px] font-black italic">Nessun credito o rata e emessa per questo immobile</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-2 border-slate-100 rounded-[3rem] p-0 overflow-hidden shadow-2xl shadow-slate-100">
        <CardHeader className="px-10 py-10 bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-3xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
             <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-100">
              <Receipt className="w-6 h-6 text-indigo-600" />
             </div>
             Analisi Spese Ripartite
          </CardTitle>
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mt-3">Rendicontazione puntuale per singola voce di costo</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50 hover:bg-slate-50 h-16">
                  <TableHead className="text-slate-400 uppercase text-[11px] font-black tracking-widest px-10">Data</TableHead>
                  <TableHead className="text-slate-400 uppercase text-[11px] font-black tracking-widest">Descrizione Oneri</TableHead>
                  <TableHead className="text-right text-slate-400 uppercase text-[11px] font-black tracking-widest px-10">Tua Quota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(exp => {
                  const split = getExpenseSplit(exp, unit);
                  const myShare = isOwner ? split.owner : split.tenant;
                  
                  return (
                    <TableRow key={exp.id} className="border-slate-100 hover:bg-slate-50 transition-all h-28 group">
                      <TableCell className="text-[12px] font-mono text-slate-400 px-10 uppercase font-black tracking-tighter">
                        {format(new Date(exp.date), 'dd MMM', { locale: it })}<br/>
                        <span className="text-slate-300">{format(new Date(exp.date), 'yyyy', { locale: it })}</span>
                      </TableCell>
                      <TableCell>
                        <div className="font-black text-slate-900 text-xl tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{exp.title}</div>
                        <div className="flex items-center gap-3 mt-2">
                           <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest text-indigo-600 border-indigo-100 bg-indigo-50 px-3">{exp.category}</Badge>
                           <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest text-slate-400 border-slate-100 px-3">{exp.type}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-10">
                         <div className="font-mono font-black text-slate-900 text-2xl tracking-tighter">€{myShare.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                         <div className="text-[9px] uppercase font-black text-slate-300 tracking-tighter mt-1">Calcolo su Millesimali</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-40 text-slate-200 uppercase tracking-[0.4em] text-[13px] font-black italic">Nessun movimento contabile registrato</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-900 p-10">
           <div className="bg-white/5 rounded-3xl p-8 border border-white/10 flex items-start gap-6">
              <div className="p-3 bg-indigo-600 rounded-2xl">
                <Info className="w-6 h-6 text-white" />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-bold uppercase tracking-[0.15em]">
                Note di Trasparenza: I valori sopra riportati sono calcolati in tempo reale sulla base dei coefficienti millesimali approvati. Per verifiche amministrative o visualizzazione dei documenti di spesa originali, si invita a contattare lo studio tramite i canali ufficiali.
              </p>
           </div>
        </CardFooter>
      </Card>
    </div>
  );
}
