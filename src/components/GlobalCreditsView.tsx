import React, { useState, useEffect } from 'react';
import { getAllAdminPayments, Payment, updatePayment, deletePayment } from '@/src/services/condoService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, playBeep } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Building,
  Edit2,
  Trash2,
  Check,
  Plus,
  Repeat,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  addMonths, 
  isBefore, 
  startOfMonth, 
  endOfMonth,
  isSameMonth,
  parseISO
} from 'date-fns';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Condominium, CondoUnit, getCondosByAdmin, getUnits, addPayment } from '@/src/services/condoService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExtendedPayment extends Payment {
  condoName?: string;
}

export default function GlobalCreditsView() {
  const [payments, setPayments] = useState<ExtendedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPayment, setEditingPayment] = useState<ExtendedPayment | null>(null);
  const [editForm, setEditForm] = useState({ title: '', amount: '' as unknown as number, paidAmount: '' as unknown as number, dueDate: '', status: 'pending' as 'pending' | 'paid' | 'overdue' | 'partial' });
  
  const [sortField, setSortField] = useState<'status' | 'dueDate' | 'condoName' | 'title' | 'amount' | 'type'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'status' | 'dueDate' | 'condoName' | 'title' | 'amount' | 'type') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'status' | 'dueDate' | 'condoName' | 'title' | 'amount' | 'type') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300 group-hover:text-slate-500 shrink-0" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-3 h-3 ml-1 text-indigo-600 shrink-0" /> : 
      <ArrowDown className="w-3 h-3 ml-1 text-indigo-600 shrink-0" />;
  };
  
  // New creation states
  const [isCreating, setIsCreating] = useState(false);
  const [condos, setCondos] = useState<Condominium[]>([]);
  const [selectedCondoId, setSelectedCondoId] = useState<string>('');
  const [units, setUnits] = useState<CondoUnit[]>([]);
  const [creationForm, setCreationForm] = useState({
    unitId: '',
    title: '',
    amount: '' as unknown as number,
    paidAmount: '' as unknown as number,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'rate' as 'rate' | 'rent' | 'extra',
    isRecurring: false,
    recipientName: '',
    recipientUid: '',
    recipientType: 'owner' as 'owner' | 'tenant'
  });

  const [missingRecurrences, setMissingRecurrences] = useState<any[]>([]);

  useEffect(() => {
    loadAllPayments();
    loadCondos();
  }, []);

  const checkForRecurrences = (allPayments: ExtendedPayment[]) => {
    const today = new Date();
    const currentMonth = startOfMonth(today);
    
    // Find all recurring rent payments
    const recurringBasics = allPayments.filter(p => p.type === 'rent' && p.isRecurring);
    
    // Group by unit to find the latest one
    const latestByUnit: Record<string, ExtendedPayment> = {};
    recurringBasics.forEach(p => {
      if (!latestByUnit[p.unitId] || isBefore(parseISO(latestByUnit[p.unitId].dueDate), parseISO(p.dueDate))) {
        latestByUnit[p.unitId] = p;
      }
    });

    const missing: any[] = [];
    Object.values(latestByUnit).forEach(last => {
      const lastDate = parseISO(last.dueDate);
      let nextDate = addMonths(lastDate, 1);
      
      // If the next recurrence is due this month or earlier, and it doesn't already exist
      if (isBefore(nextDate, endOfMonth(today)) || isSameMonth(nextDate, today)) {
        // Check if next month's payment already exists for this unit
        const exists = allPayments.find(p => 
          p.unitId === last.unitId && 
          p.type === 'rent' && 
          isSameMonth(parseISO(p.dueDate), nextDate)
        );

        if (!exists) {
          missing.push({
            condoId: last.condoId,
            condoName: last.condoName,
            unitId: last.unitId,
            title: last.title, 
            amount: last.amount,
            dueDate: format(nextDate, 'yyyy-MM-dd'),
            type: 'rent',
            isRecurring: true,
            recipientName: last.recipientName || '',
            recipientUid: last.recipientUid || '',
            recipientType: last.recipientType || 'tenant'
          });
        }
      }
    });

    setMissingRecurrences(missing);
  };

  const handleGenerateRecurrences = async () => {
    if (missingRecurrences.length === 0) return;
    
    const promise = Promise.all(missingRecurrences.map(m => 
      addPayment(m.condoId, {
        unitId: m.unitId,
        title: m.title,
        amount: m.amount,
        dueDate: m.dueDate,
        type: 'rent',
        status: 'pending',
        isRecurring: true,
        recipientName: m.recipientName,
        recipientUid: m.recipientUid,
        recipientType: m.recipientType
      })
    ));

    toast.promise(promise, {
      loading: 'Generazione canoni ricorrenti...',
      success: () => {
        loadAllPayments();
        return `${missingRecurrences.length} canoni generati con successo`;
      },
      error: 'Errore durante la generazione'
    });
  };

  const loadCondos = async () => {
    try {
      const data = await getCondosByAdmin();
      setCondos(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (selectedCondoId) {
      loadUnits(selectedCondoId);
    } else {
      setUnits([]);
    }
  }, [selectedCondoId]);

  const loadUnits = async (condoId: string) => {
    try {
      const data = await getUnits(condoId);
      setUnits(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadAllPayments = async () => {
    setLoading(true);
    try {
      const data = await getAllAdminPayments();
      setPayments(data || []);
      checkForRecurrences(data || []);
    } catch (error) {
      toast.error("Errore nel caricamento dei crediti");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (payment: ExtendedPayment) => {
    try {
      await updatePayment(payment.condoId, payment.id, { 
        status: 'paid',
        paidAmount: payment.amount,
        paidAt: new Date().toISOString()
      });
      toast.success("Pagamento registrato");
      loadAllPayments();
    } catch (error) {
      toast.error("Errore nella registrazione");
    }
  };

  const [paymentToDelete, setPaymentToDelete] = useState<ExtendedPayment | null>(null);

  const handleDelete = async (payment: ExtendedPayment) => {
    try {
      await deletePayment(payment.condoId, payment.id);
      toast.success("Credito eliminato");
      setPaymentToDelete(null);
      loadAllPayments();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const startEdit = (payment: ExtendedPayment) => {
    setEditingPayment(payment);
    setEditForm({
      title: payment.title,
      amount: payment.amount as any,
      paidAmount: (payment.paidAmount || '') as any,
      dueDate: payment.dueDate || '',
      status: payment.status || 'pending'
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      const parsedAmount = parseFloat(editForm.amount as any) || 0;
      const parsedPaidAmount = parseFloat(editForm.paidAmount as any) || 0;
      let finalStatus = editForm.status;
      let finalPaidAmount = parsedPaidAmount;

      if (finalStatus === 'paid') {
        finalPaidAmount = parsedAmount;
      } else if (finalPaidAmount > 0) {
        if (finalPaidAmount >= parsedAmount) {
          finalStatus = 'paid';
          finalPaidAmount = parsedAmount;
        } else {
          finalStatus = 'partial';
        }
      } else {
        finalPaidAmount = 0;
        if (finalStatus === 'partial') {
          finalStatus = 'pending';
        }
      }

      await updatePayment(editingPayment.condoId, editingPayment.id, {
        title: editForm.title,
        amount: parsedAmount,
        paidAmount: finalPaidAmount,
        status: finalStatus,
        dueDate: editForm.dueDate,
        paidAt: finalStatus === 'paid' ? (editingPayment.paidAt || new Date().toISOString()) : null
      });
      toast.success("Credito aggiornato");
      setEditingPayment(null);
      loadAllPayments();
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(creationForm.amount as any) || 0;
    const parsedPaidAmount = parseFloat(creationForm.paidAmount as any) || 0;

    if (!selectedCondoId || !creationForm.unitId || !creationForm.title || parsedAmount <= 0) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    try {
      let finalStatus = 'pending' as 'pending' | 'paid' | 'overdue' | 'partial';
      let finalPaidAmount = parsedPaidAmount;

      if (finalPaidAmount > 0) {
        if (finalPaidAmount >= parsedAmount) {
          finalStatus = 'paid';
          finalPaidAmount = parsedAmount;
        } else {
          finalStatus = 'partial';
        }
      }

      await addPayment(selectedCondoId, {
        unitId: creationForm.unitId,
        title: creationForm.title,
        amount: parsedAmount,
        paidAmount: finalPaidAmount,
        dueDate: creationForm.dueDate,
        type: creationForm.type,
        status: finalStatus,
        isRecurring: creationForm.isRecurring,
        recipientName: creationForm.recipientName,
        recipientUid: creationForm.recipientUid,
        recipientType: creationForm.recipientType,
        paidAt: finalStatus === 'paid' ? new Date().toISOString() : null
      });
      toast.success("Nuovo credito creato con successo");
      setIsCreating(false);
      resetCreationForm();
      loadAllPayments();
    } catch (error) {
      toast.error("Errore nella creazione del credito");
    }
  };

  const resetCreationForm = () => {
    setSelectedCondoId('');
    setCreationForm({
      unitId: '',
      title: '',
      amount: '' as unknown as number,
      paidAmount: '' as unknown as number,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      type: 'rate',
      isRecurring: false,
      recipientName: '',
      recipientUid: '',
      recipientType: 'owner'
    });
  };

  const handleExportReport = () => {
    try {
      const doc = new jsPDF();
      const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
      
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); 
      doc.text('REPORT CREDITI GLOBALE', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`TIPO REPORT: Riepilogo Crediti Amministrati`, 14, 30);
      doc.text(`DATA EXPORT: ${timestamp}`, 14, 35);

      const tableData = sortedPayments.map(p => [
        p.status.toUpperCase(),
        p.dueDate ? format(new Date(p.dueDate), 'dd/MM/yyyy') : '--/--/----',
        p.condoName || 'N/D',
        p.title,
        p.type.toUpperCase(),
        `€ ${p.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Stato', 'Scadenza', 'Condominio', 'Titolo', 'Tipo', 'Importo']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
        columnStyles: {
          5: { halign: 'right', fontStyle: 'bold' }
        }
      });

      doc.save(`Report_Crediti_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      toast.success("Documento esportato");
    } catch (error) {
      console.error(error);
      toast.error("Errore esportazione PDF");
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesFilter = filter === 'all' || 
      (filter === 'pending' ? (p.status === 'pending' || p.status === 'partial') : p.status === filter);
    const matchesSearch = (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.condoName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    } else if (sortField === 'dueDate') {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      comparison = dateA - dateB;
    } else if (sortField === 'condoName') {
      const strA = a.condoName || '';
      const strB = b.condoName || '';
      comparison = strA.localeCompare(strB, 'it');
    } else if (sortField === 'title') {
      const strA = a.title || '';
      const strB = b.title || '';
      comparison = strA.localeCompare(strB, 'it');
    } else if (sortField === 'status') {
      const strA = a.status || '';
      const strB = b.status || '';
      comparison = strA.localeCompare(strB, 'it');
    } else if (sortField === 'type') {
      const strA = a.type || '';
      const strB = b.type || '';
      comparison = strA.localeCompare(strB, 'it');
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const stats = {
    total: payments.reduce((acc, p) => acc + p.amount, 0),
    paid: payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0),
    pending: payments.filter(p => p.status === 'pending' || p.status === 'partial').reduce((acc, p) => acc + p.amount, 0),
    overdue: payments.filter(p => p.status === 'overdue').reduce((acc, p) => acc + p.amount, 0)
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="md:hidden">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">Gestione Crediti</h2>
          <p className="text-slate-500 mt-1 font-medium text-sm">Monitoraggio incassi, rate e canoni dai condomini amministrati</p>
        </div>
      </div>

      <AnimatePresence>
        {missingRecurrences.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-indigo-600 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-indigo-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Repeat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-black uppercase text-sm tracking-tight">Canoni Ricorrenti Rilevati</h4>
                  <p className="text-indigo-100 text-xs font-medium">Ci sono {missingRecurrences.length} canoni di affitto da generare per il mese corrente.</p>
                </div>
              </div>
              <Button 
                onClick={handleGenerateRecurrences}
                className="bg-white text-indigo-600 hover:bg-slate-50 font-black uppercase text-xs tracking-widest h-12 px-8 rounded-xl shadow-lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Genera Automaticamente
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="rounded-2xl border border-slate-200 p-0 overflow-hidden shadow-xl shadow-slate-200/50">
        <div className="px-6 sm:px-8 py-6 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div className="w-full lg:w-auto">
            <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200 w-full lg:w-max">
              <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} label="Tutti" />
              <FilterTab active={filter === 'pending'} onClick={() => setFilter('pending')} label="Pendenti" />
              <FilterTab active={filter === 'paid'} onClick={() => setFilter('paid')} label="Saldati" />
              <FilterTab active={filter === 'overdue'} onClick={() => setFilter('overdue')} label="Scaduti" />
            </div>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              className="w-full h-11 pl-11 pr-6 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs"
              placeholder="Cerca per condomino o titolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Sincronizzazione dati in corso...</p>
            </div>
          ) : (
            <div className="md:overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50/50 hover:bg-slate-50/50 h-14 select-none">
                    <TableHead className="text-slate-400 px-8">
                      <button 
                        onClick={() => { playBeep(); handleSort('status'); }}
                        className="flex items-center gap-1 hover:text-indigo-600 active:scale-[0.95] transition-all uppercase text-xs font-black tracking-widest outline-none text-left font-sans"
                      >
                        Stato
                        {getSortIcon('status')}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-400">
                      <button 
                        onClick={() => { playBeep(); handleSort('dueDate'); }}
                        className="flex items-center gap-1 hover:text-indigo-600 active:scale-[0.95] transition-all uppercase text-xs font-black tracking-widest outline-none text-left font-sans"
                      >
                        Scadenza
                        {getSortIcon('dueDate')}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-400">
                      <button 
                        onClick={() => { playBeep(); handleSort('condoName'); }}
                        className="flex items-center gap-1 hover:text-indigo-600 active:scale-[0.95] transition-all uppercase text-xs font-black tracking-widest outline-none text-left font-sans"
                      >
                        Condominio
                        {getSortIcon('condoName')}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-400">
                      <button 
                        onClick={() => { playBeep(); handleSort('title'); }}
                        className="flex items-center gap-1 hover:text-indigo-600 active:scale-[0.95] transition-all uppercase text-xs font-black tracking-widest outline-none text-left font-sans"
                      >
                        Descrizione / Titolo
                        {getSortIcon('title')}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-400">
                      <button 
                        onClick={() => { playBeep(); handleSort('type'); }}
                        className="flex items-center gap-1 hover:text-indigo-600 active:scale-[0.95] transition-all uppercase text-xs font-black tracking-widest outline-none text-left font-sans"
                      >
                        Tipo
                        {getSortIcon('type')}
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-slate-400 px-8">
                      <div className="flex justify-end">
                        <button 
                          onClick={() => { playBeep(); handleSort('amount'); }}
                          className="flex items-center gap-1 hover:text-indigo-600 active:scale-[0.95] transition-all uppercase text-xs font-black tracking-widest outline-none text-right font-sans"
                        >
                          Azioni / Importo
                          {getSortIcon('amount')}
                        </button>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPayments.map((p) => {
                    const isPartial = p.status === 'partial' || (p.paidAmount && p.paidAmount > 0 && p.paidAmount < p.amount);
                    return (
                      <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50 transition-all h-20 group">
                        <TableCell label="Stato" className="px-8 whitespace-nowrap">
                          {p.status === 'paid' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1 px-2.5 py-0.5 font-black uppercase text-xs tracking-widest"><CheckCircle2 className="w-2.5 h-2.5" /> Saldato</Badge>
                          ) : isPartial ? (
                            <Badge className="bg-sky-50 text-sky-700 border-sky-100 gap-1 px-2.5 py-0.5 font-black uppercase text-xs tracking-widest"><CheckCircle2 className="w-2.5 h-2.5" /> Parziale</Badge>
                          ) : p.status === 'overdue' ? (
                            <Badge className="bg-red-50 text-red-750 border-red-100 gap-1 px-2.5 py-0.5 font-black uppercase text-xs tracking-widest"><AlertCircle className="w-2.5 h-2.5" /> Scaduto</Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-100 gap-1 px-2.5 py-0.5 font-black uppercase text-xs tracking-widest"><Clock className="w-2.5 h-2.5" /> Attesa</Badge>
                          )}
                        </TableCell>
                        <TableCell label="Scadenza" className="whitespace-nowrap">
                          <div className="text-xs font-mono font-black text-slate-500 tracking-tighter leading-none uppercase">
                            {p.dueDate ? format(new Date(p.dueDate), 'dd MMM yyyy', { locale: it }).toUpperCase() : '-- --- ----'}
                          </div>
                        </TableCell>
                        <TableCell label="Condominio">
                           <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                 <Building className="w-3.5 h-3.5" />
                              </div>
                              <div className="font-bold text-slate-900 text-sm tracking-tight">{p.condoName}</div>
                           </div>
                        </TableCell>
                        <TableCell label="Descrizione / Titolo">
                          <div className="flex items-center gap-2">
                            <div className="font-black text-slate-900 text-base tracking-tight uppercase leading-tight">{p.title}</div>
                            {p.isRecurring && (
                              <Repeat className="w-3 h-3 text-indigo-500" title="Ricorrente mensile" />
                            )}
                          </div>
                          {p.recipientName ? (
                            <div className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1.5 flex-wrap">
                              <span>Soggetto:</span>
                              <span className="text-slate-755 font-black text-slate-900">{p.recipientName}</span>
                              {p.recipientType === 'tenant' ? (
                                <span className="text-sky-600 bg-sky-50 px-1 py-0 rounded text-xs font-black uppercase whitespace-nowrap">Inquilino / Conduttore</span>
                              ) : (
                                <span className="text-indigo-600 bg-indigo-50 px-1 py-0 rounded text-xs font-black uppercase whitespace-nowrap">Proprietario Millesimale</span>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1.5">
                              <span>Soggetto:</span>
                              <span className="text-slate-600 font-black">---</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell label="Tipo">
                          <Badge variant="outline" className="uppercase text-xs font-black tracking-widest border-slate-200 text-slate-500 bg-white px-2 py-0">
                            {p.type === 'rate' ? 'Rata Cond.' : p.type === 'rent' ? 'Affitto' : 'Extra'}
                          </Badge>
                        </TableCell>
                        <TableCell label="Azioni / Importo" className="text-right px-8">
                          <div className="flex justify-end gap-1.5 mb-1">
                            {p.status !== 'paid' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleMarkAsPaid(p)}
                                title="Segna come pagato"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                              onClick={() => startEdit(p)}
                              title="Modifica"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setPaymentToDelete(p)}
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="font-mono font-black text-slate-900 text-xl tracking-tighter leading-none">€{p.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                          {p.paidAmount && p.paidAmount > 0 && p.paidAmount < p.amount ? (
                            <div className="text-xs text-emerald-600 font-extrabold mt-1">
                              Pagati: €{p.paidAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} &bull; Rim: €{(p.amount - p.paidAmount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </div>
                          ) : p.status === 'paid' ? (
                            <div className="text-xs text-emerald-600 font-bold mt-1">Interamente Saldato</div>
                          ) : (
                            <div className="text-xs text-slate-400 font-bold mt-1">Nessun acconto</div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!loading && filteredPayments.length === 0 && (
                <div className="py-32 text-center">
                  <p className="text-slate-300 font-black uppercase text-sm tracking-[0.5em] italic">Nessun credito trovato per questa categoria</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-4">
        <Button 
          onClick={() => setIsCreating(true)} 
          className="w-full sm:w-auto rounded-2xl h-14 px-10 bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100"
        >
          <Plus className="w-4 h-4 mr-2 stroke-[3]" /> NUOVO CREDITO
        </Button>
        <Button 
          onClick={handleExportReport}
          variant="outline" 
          className="w-full sm:w-auto rounded-2xl h-14 px-10 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-black uppercase text-xs tracking-widest border-2"
        >
          <Download className="w-4 h-4 mr-2" /> ESPORTA REPORT
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
        <StatsCard title="Volume Totale" value={stats.total} icon={<CreditCard className="w-5 h-5" />} color="indigo" />
        <StatsCard title="Incassato" value={stats.paid} icon={<CheckCircle2 className="w-5 h-5" />} color="emerald" />
        <StatsCard title="Pendente" value={stats.pending} icon={<Clock className="w-5 h-5" />} color="amber" />
        <StatsCard title="Insoluto" value={stats.overdue} icon={<AlertCircle className="w-5 h-5" />} color="red" />
      </div>


      {/* Edit Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="w-full max-w-2xl"
            >
              <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white">
                <div className="bg-indigo-600 px-8 py-8">
                  <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Emissione Nuovo Credito</h3>
                  <p className="text-white/60 font-bold uppercase text-xs tracking-[0.2em] mt-2">Creazione globale debitore</p>
                </div>
                <form onSubmit={handleCreate}>
                  <CardContent className="space-y-5 p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Selezione Condominio</Label>
                      <Select value={selectedCondoId} onValueChange={setSelectedCondoId}>
                        <SelectTrigger className="pro-input h-11 text-xs">
                          <SelectValue placeholder="Seleziona Fabbricato">
                            {condos.find(c => c.id === selectedCondoId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {condos.map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase">{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Unità Destinataria</Label>
                      <Select 
                        value={creationForm.unitId} 
                        onValueChange={v => {
                          const unit = units.find(u => u.id === v);
                          setCreationForm({
                            ...creationForm, 
                            unitId: v,
                            recipientName: unit ? unit.ownerName : '',
                            recipientUid: unit ? unit.ownerUid || '' : '',
                            recipientType: 'owner'
                          });
                        }}
                        disabled={!selectedCondoId}
                      >
                        <SelectTrigger className="pro-input h-11 text-xs">
                          <SelectValue placeholder={selectedCondoId ? "Seleziona Unità" : "Prima seleziona un condominio"}>
                            {creationForm.unitId && units.find(u => u.id === creationForm.unitId) ? (
                              `${units.find(u => u.id === creationForm.unitId)?.number} - ${units.find(u => u.id === creationForm.unitId)?.ownerName}`
                            ) : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {units.map(u => (
                            <SelectItem key={u.id} value={u.id} className="text-xs font-bold">{u.number} - {u.ownerName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {creationForm.unitId && (
                      <div className="space-y-2">
                        <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Soggetto Debitore (Persona Riconducibile)</Label>
                        <Select 
                          value={creationForm.recipientType || 'owner'} 
                          onValueChange={(typeVal: 'owner' | 'tenant') => {
                            const unit = units.find(u => u.id === creationForm.unitId);
                            if (!unit) return;
                            if (typeVal === 'owner') {
                              setCreationForm({
                                ...creationForm,
                                recipientType: 'owner',
                                recipientName: unit.ownerName,
                                recipientUid: unit.ownerUid || ''
                              });
                            } else {
                              setCreationForm({
                                ...creationForm,
                                recipientType: 'tenant',
                                recipientName: unit.tenantName || '',
                                recipientUid: unit.tenantUid || ''
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="pro-input h-11 text-xs font-bold">
                            <SelectValue placeholder="Seleziona Soggetto">
                              {creationForm.recipientType === 'tenant' ? (
                                `Inquilino: ${creationForm.recipientName || 'Nessuno'}`
                              ) : (
                                `Proprietario: ${creationForm.recipientName || 'Nessuno'}`
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="font-bold">
                            <SelectItem value="owner">Proprietario: {units.find(u => u.id === creationForm.unitId)?.ownerName || 'Caricamento...'}</SelectItem>
                            {units.find(u => u.id === creationForm.unitId)?.tenantName && (
                              <SelectItem value="tenant">Inquilino: {units.find(u => u.id === creationForm.unitId)?.tenantName}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Descrizione Rate / Titolo</Label>
                      <Input 
                        value={creationForm.title}
                        onChange={e => setCreationForm({ ...creationForm, title: e.target.value })}
                        className="pro-input h-11 font-bold text-xs"
                        placeholder="es. Rata 1 - 2024"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Importo Totale (€)</Label>
                        <Input 
                          type="number"
                          step="0.01"
                          value={creationForm.amount}
                          onChange={e => setCreationForm({ ...creationForm, amount: e.target.value as any })}
                          className="pro-input h-11 font-mono font-black text-indigo-600 text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Importo Pagato (€)</Label>
                        <Input 
                          type="number"
                          step="0.01"
                          value={creationForm.paidAmount}
                          onChange={e => setCreationForm({ ...creationForm, paidAmount: e.target.value as any })}
                          className="pro-input h-11 font-mono font-black text-emerald-600 text-lg"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Scadenza</Label>
                      <Input 
                        type="date"
                        value={creationForm.dueDate}
                        onChange={e => setCreationForm({ ...creationForm, dueDate: e.target.value })}
                        className="pro-input h-11 font-bold text-xs"
                      />
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <Checkbox 
                        id="isRecurring" 
                        checked={creationForm.isRecurring}
                        onCheckedChange={(checked) => setCreationForm({...creationForm, isRecurring: !!checked})}
                        className="rounded-md border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="isRecurring"
                          className="text-xs uppercase font-black text-slate-700 tracking-widest cursor-pointer"
                        >
                          Rendi Ricorrente (Mensile)
                        </label>
                        <p className="text-xs font-medium text-slate-500">
                          Se attivo, il sistema proporrà l&apos;emissione automatica ogni mese.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Tipologia</Label>
                      <Select 
                        value={creationForm.type} 
                        onValueChange={(v: any) => {
                          setCreationForm({
                            ...creationForm, 
                            type: v,
                            isRecurring: v === 'rent' ? true : creationForm.isRecurring
                          });
                        }}
                      >
                        <SelectTrigger className="pro-input h-11 text-xs">
                          <SelectValue>
                            {creationForm.type === 'rate' ? 'Rata Condominiale' : 
                             creationForm.type === 'rent' ? 'Affitto / Locazione' : 
                             creationForm.type === 'extra' ? 'Extra / Conguaglio' : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="font-bold">
                          <SelectItem value="rate">Rata Condominiale</SelectItem>
                          <SelectItem value="rent">Affitto / Locazione</SelectItem>
                          <SelectItem value="extra">Extra / Conguaglio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-3 p-8 pt-0 mt-2">
                    <Button variant="ghost" type="button" onClick={() => { setIsCreating(false); resetCreationForm(); }} className="flex-1 h-11 rounded-xl text-slate-400 font-black uppercase text-xs tracking-widest">
                      Annulla
                    </Button>
                    <Button type="submit" className="flex-1 bg-indigo-600 text-white font-black h-11 rounded-xl shadow-lg uppercase text-xs tracking-widest">
                      Emetti Credito
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          </div>
        )}

        {editingPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="w-full max-w-2xl"
            >
              <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white">
                <div className="bg-slate-900 px-8 py-8">
                  <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Modifica Credito</h3>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em] mt-2">Aggiornamento contabile globale</p>
                </div>
                <form onSubmit={handleUpdate}>
                  <CardContent className="space-y-6 p-8">
                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Titolo Credito</Label>
                      <Input 
                        value={editForm.title}
                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                        className="pro-input h-12 font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Importo Totale (€)</Label>
                        <Input 
                          type="number"
                          step="0.01"
                          value={editForm.amount}
                          onChange={e => setEditForm({ ...editForm, amount: e.target.value as any })}
                          className="pro-input h-12 font-mono font-black text-indigo-600 text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Importo Pagato (€)</Label>
                        <Input 
                          type="number"
                          step="0.01"
                          value={editForm.paidAmount}
                          onChange={e => setEditForm({ ...editForm, paidAmount: e.target.value as any })}
                          className="pro-input h-12 font-mono font-black text-emerald-600 text-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Scadenza</Label>
                        <Input 
                          type="date"
                          value={editForm.dueDate}
                          onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                          className="pro-input h-12 font-bold text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-900 font-black text-xs uppercase tracking-widest opacity-60">Stato Pagamento</Label>
                        <Select 
                          value={editForm.status} 
                          onValueChange={(v: any) => setEditForm({ ...editForm, status: v })}
                        >
                          <SelectTrigger className="pro-input h-12 font-bold text-xs">
                            <SelectValue>
                              {editForm.status === 'pending' ? 'Pendente' : 
                               editForm.status === 'paid' ? 'Saldato / Incassato' : 
                               editForm.status === 'overdue' ? 'Scaduto' : 
                               editForm.status === 'partial' ? 'Pagato Parzialmente' : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="font-bold text-xs animate-none">
                            <SelectItem value="pending">Pendente / Emesso</SelectItem>
                            <SelectItem value="paid">Saldato / Incassato</SelectItem>
                            <SelectItem value="partial">Pagato Parzialmente</SelectItem>
                            <SelectItem value="overdue">Scaduto / Insoluto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-3 p-8 pt-0">
                    <Button variant="ghost" type="button" onClick={() => setEditingPayment(null)} className="flex-1 h-12 rounded-xl text-slate-400 font-black uppercase text-xs tracking-widest">
                      Annulla
                    </Button>
                    <Button type="submit" className="flex-1 bg-indigo-600 text-white font-black h-12 rounded-xl shadow-lg uppercase text-xs tracking-widest">
                      Salva Modifiche
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden bg-white">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Conferma Eliminazione</h3>
                  <p className="text-slate-500 font-medium text-sm">
                    Sei sicuro di voler eliminare il credito <span className="font-black text-slate-900">&quot;{paymentToDelete.title}&quot;</span>?
                  </p>
                  <p className="text-red-500 font-bold text-xs uppercase tracking-widest mt-4 bg-red-50 py-2 rounded-lg">Questa operazione è irreversibile</p>
                </div>
                <div className="flex gap-3 p-6 pt-0">
                  <Button 
                    variant="ghost" 
                    className="flex-1 h-12 rounded-xl text-slate-400 font-black uppercase text-xs tracking-widest"
                    onClick={() => setPaymentToDelete(null)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    className="flex-1 bg-red-600 text-white hover:bg-red-700 h-12 rounded-xl font-black shadow-lg shadow-red-100 uppercase text-xs tracking-widest"
                    onClick={() => handleDelete(paymentToDelete)}
                  >
                    Sì, Elimina
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
  const bgColors: any = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-indigo-100/50',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-emerald-100/50',
    amber: 'bg-amber-50 border-amber-100 text-amber-600 shadow-amber-100/50',
    red: 'bg-red-50 border-red-100 text-red-600 shadow-red-100/50'
  };

  return (
    <Card className={`rounded-xl border-2 ${bgColors[color]} shadow-lg overflow-hidden transition-all hover:scale-[1.03]`}>
      <CardHeader className="pb-1 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">{title}</p>
          <div className="p-1.5 bg-white/50 rounded-lg">{icon}</div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="text-2xl font-black tracking-tighter">€{value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
      </CardContent>
    </Card>
  );
}

function FilterTab({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={() => { playBeep(); onClick(); }}
      className={`px-4 h-8 rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-[0.95] ${
        active 
          ? 'bg-slate-900 text-white shadow-md' 
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}
