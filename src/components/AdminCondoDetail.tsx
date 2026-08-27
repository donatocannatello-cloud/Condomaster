import React, { useState, useEffect } from 'react';
import { 
  Condominium, 
  CondoUnit, 
  Expense, 
  Payment,
  addUnit, 
  getUnits, 
  updateUnit,
  deleteUnit,
  addExpense, 
  getExpenses,
  updateExpense,
  deleteExpense,
  addPayment,
  getPayments,
  updatePayment,
  deletePayment,
  getExpenseSplit,
  ExpenseCategory,
  ExpenseType,
  PaidBy
} from '@/src/services/condoService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, playBeep } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  Receipt, 
  Calculator, 
  Building2, 
  FileText,
  PieChart,
  UserPlus,
  Euro,
  Calendar,
  Layers,
  MapPin,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Building,
  User,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCachedAccessToken, requestCalendarAccess } from '../services/authService';

interface AdminCondoDetailProps {
  condo: Condominium;
  onBack: () => void;
}

export default function AdminCondoDetail({ condo, onBack }: AdminCondoDetailProps) {
  const [units, setUnits] = useState<CondoUnit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Google Calendar and WhatsApp states
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [selectedWhatsAppPayment, setSelectedWhatsAppPayment] = useState<Payment | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  useEffect(() => {
    setIsGoogleConnected(!!getCachedAccessToken());
  }, []);

  // Emission state
  const [isEmittingRates, setIsEmittingRates] = useState(false);
  const [emitRatesTotal, setEmitRatesTotal] = useState<number>('' as unknown as number);
  const [emitRatesTitle, setEmitRatesTitle] = useState(`Rata Condominiale ${format(new Date(), 'MMMM yyyy', { locale: it })}`);

  // Sorting state for expenses
  const [expenseSortField, setExpenseSortField] = useState<'date' | 'title' | 'category' | 'amount'>('date');
  const [expenseSortOrder, setExpenseSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Forms states
  const [editingUnit, setEditingUnit] = useState<CondoUnit | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'unit' | 'expense' | 'payment', title: string } | null>(null);

  const [newUnit, setNewUnit] = useState({ number: '', millesimi: '' as unknown as number, ownerName: '', ownerPhone: '', tenantName: '', tenantPhone: '' });
  const [newExpense, setNewExpense] = useState({ 
    title: '', 
    amount: '' as unknown as number, 
    category: 'ordinaria' as ExpenseCategory, 
    type: 'altro' as ExpenseType,
    paidBy: 'misto' as PaidBy,
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [newPayment, setNewPayment] = useState({
    unitId: '',
    title: '',
    amount: '' as unknown as number,
    paidAmount: '' as unknown as number,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'rate' as 'rate' | 'rent' | 'extra',
    status: 'pending' as 'pending' | 'paid' | 'overdue' | 'partial',
    recipientName: '',
    recipientUid: '',
    recipientType: 'owner' as 'owner' | 'tenant'
  });

  useEffect(() => {
    loadData();
  }, [condo.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitsData, expensesData, paymentsData] = await Promise.all([
        getUnits(condo.id),
        getExpenses(condo.id),
        getPayments(condo.id)
      ]);
      setUnits(unitsData || []);
      setExpenses(expensesData || []);
      setPayments(paymentsData || []);
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMillesimi = parseFloat(newUnit.millesimi as any) || 0;
    if (!newUnit.number || !parsedMillesimi || !newUnit.ownerName) {
      toast.error("Inserisci i campi obbligatori");
      return;
    }
    try {
      const payload = { ...newUnit, millesimi: parsedMillesimi };
      if (editingUnit) {
        await updateUnit(condo.id, editingUnit.id, payload);
         toast.success("Unità aggiornata");
      } else {
        await addUnit(condo.id, {
          ...payload,
          ownerUid: 'pre-assigned-owner',
        });
        toast.success("Unità aggiunta");
      }
      setNewUnit({ number: '', millesimi: '' as unknown as number, ownerName: '', ownerPhone: '', tenantName: '', tenantPhone: '' });
      setEditingUnit(null);
      loadData();
    } catch (error) {
      toast.error("Errore nell'operazione");
    }
  };

  const handleDeleteUnit = async (id: string) => {
    try {
      await deleteUnit(condo.id, id);
      toast.success("Unità eliminata");
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newExpense.amount as any) || 0;
    if (!newExpense.title || parsedAmount === undefined || isNaN(parsedAmount) || !newExpense.date) return;
    try {
      const payload = { ...newExpense, amount: parsedAmount };
      if (editingExpense) {
        await updateExpense(condo.id, editingExpense.id, payload);
        toast.success("Spesa aggiornata");
      } else {
        await addExpense(condo.id, payload);
        toast.success("Spesa aggiunta");
      }
      setNewExpense({ title: '', amount: '' as unknown as number, category: 'ordinaria', type: 'altro', paidBy: 'misto', date: format(new Date(), 'yyyy-MM-dd') });
      setEditingExpense(null);
      loadData();
    } catch (error) {
      toast.error("Errore nell'operazione");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense(condo.id, id);
      toast.success("Spesa eliminata");
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newPayment.amount as any) || 0;
    const parsedPaidAmount = parseFloat(newPayment.paidAmount as any) || 0;

    if (!newPayment.unitId || !newPayment.title || !parsedAmount) {
      toast.error("Inserisci i campi obbligatori");
      return;
    }
    try {
      let finalStatus = newPayment.status;
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

      const paymentPayload = {
        ...newPayment,
        amount: parsedAmount,
        status: finalStatus,
        paidAmount: finalPaidAmount,
        paidAt: finalStatus === 'paid' ? new Date().toISOString() : null
      };

      if (editingPayment) {
        await updatePayment(condo.id, editingPayment.id, paymentPayload);
        toast.success("Pagamento/Rata aggiornata");
      } else {
        await addPayment(condo.id, paymentPayload);
        toast.success("Pagamento/Rata registrata");
      }
      setNewPayment({
        unitId: '',
        title: '',
        amount: '' as unknown as number,
        paidAmount: '' as unknown as number,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        type: 'rate',
        status: 'pending',
        recipientName: '',
        recipientUid: '',
        recipientType: 'owner'
      });
      setNewPayment({
        unitId: '',
        title: '',
        amount: 0,
        paidAmount: 0,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        type: 'rate',
        status: 'pending',
        recipientName: '',
        recipientUid: '',
        recipientType: 'owner'
      });
      setEditingPayment(null);
      loadData();
    } catch (error) {
      toast.error("Errore nell'operazione");
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await deletePayment(condo.id, id);
      toast.success("Pagamento eliminato");
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleEmitRates = async () => {
    const parsedEmitTotal = parseFloat(emitRatesTotal as any) || 0;
    if (parsedEmitTotal <= 0) {
      toast.error("Inserisci un importo totale maggiore di zero");
      return;
    }
    if (!emitRatesTitle) {
      toast.error("Inserisci un titolo per l'emissione delle rate");
      return;
    }
    if (units.length === 0) {
      toast.error("Impossibile emettere rate: non ci sono unità registrate in questo condominio");
      return;
    }

    const confirmAction = confirm(`Confermi l'emissione di ${units.length} rate per un totale di €${parsedEmitTotal.toLocaleString('it-IT')}?`);
    if (!confirmAction) return;

    setLoading(true);
    const loadingToast = toast.loading("Emissione delle rate in corso...");
    
    try {
      console.log(`Emitting ${units.length} rates for condo ${condo.id}, total: ${parsedEmitTotal}`);
      
      const promises = units.map(u => {
        const share = (parsedEmitTotal * u.millesimi) / 1000;
        return addPayment(condo.id, {
          unitId: u.id,
          title: emitRatesTitle,
          amount: share,
          dueDate: format(new Date(), 'yyyy-MM-dd'),
          type: 'rate',
          status: 'pending',
          recipientName: u.ownerName,
          recipientUid: u.ownerUid,
          recipientType: 'owner'
        });
      });

      await Promise.all(promises);
      
      toast.success(`${units.length} rate emesse con successo`, { id: loadingToast });
      setIsEmittingRates(false);
      await loadData();
    } catch (error) {
      console.error("Error emitting rates:", error);
      toast.error("Errore durante l'emissione delle rate. Riprova più tardi.", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    let compareA: any = a[expenseSortField as keyof Expense];
    let compareB: any = b[expenseSortField as keyof Expense];

    // Handle date sorting specifically
    if (expenseSortField === 'date') {
      compareA = new Date(a.date).getTime();
      compareB = new Date(b.date).getTime();
    }
    
    // Handle string logic (case insensitive)
    if (typeof compareA === 'string' && typeof compareB === 'string') {
      compareA = compareA.toLowerCase();
      compareB = compareB.toLowerCase();
    }

    if (compareA < compareB) return expenseSortOrder === 'asc' ? -1 : 1;
    if (compareA > compareB) return expenseSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: 'date' | 'title' | 'category' | 'amount') => {
    if (expenseSortField === field) {
      setExpenseSortOrder(expenseSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setExpenseSortField(field);
      setExpenseSortOrder('asc');
    }
  };

  const getSortIcon = (field: 'date' | 'title' | 'category' | 'amount') => {
    if (expenseSortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 stroke-[3]" />;
    return expenseSortOrder === 'asc' 
      ? <ChevronUp className="w-3 h-3 ml-1 text-indigo-600 stroke-[3]" /> 
      : <ChevronDown className="w-3 h-3 ml-1 text-indigo-600 stroke-[3]" />;
  };

  const handleConnectGoogle = async () => {
    try {
      const token = await requestCalendarAccess();
      if (token) {
        setIsGoogleConnected(true);
        toast.success("Google Calendar collegato con successo!");
      }
    } catch (error: any) {
      toast.error("Connessione Google Calendar fallita: " + error.message);
    }
  };

  const syncPaymentToCalendar = async (payment: Payment) => {
    const token = getCachedAccessToken();
    if (!token) {
      toast.error("Per favore, collega prima il tuo Google Calendar usando l'apposito pulsante.");
      return;
    }

    // Confirmation message (Mandatory Workspace Guidelines)
    const confirmed = window.confirm(
      `Sincronizzare la scadenza del pagamento "${payment.title}" di €${payment.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} su Google Calendar?`
    );
    if (!confirmed) return;

    setIsSyncingCalendar(true);
    try {
      const unit = units.find(u => u.id === payment.unitId);
      const dateStr = payment.dueDate; // e.g. "2026-06-30"

      const event = {
        summary: `⚠️ Scadenza Condo: ${payment.title} (${unit?.number || ''})`,
        description: `Avviso promemoria di scadenza amministrativa generato da CondoManage IT.\n\nSoggetto: ${payment.recipientName || 'Proprietario'}\nImporto: €${payment.amount}\nStato: ${payment.status === 'overdue' ? 'SCADUTO' : 'In attesa'}`,
        start: {
          dateTime: `${dateStr}T09:00:00`,
          timeZone: 'Europe/Rome'
        },
        end: {
          dateTime: `${dateStr}T10:00:00`,
          timeZone: 'Europe/Rome'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 }, // 1 giorno prima
            { method: 'popup', minutes: 60 }     // 1 ora prima
          ]
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error("Errore durante il salvataggio: " + response.statusText);
      }

      toast.success("Promemoria scadenza salvato correttamente sul tuo Google Calendar!");
    } catch (error: any) {
      toast.error("Impossibile salvare sul calendario: " + error.message);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const syncAllOverdueToCalendar = async () => {
    const token = getCachedAccessToken();
    if (!token) {
      toast.error("Collega prima il tuo Google Calendar.");
      return;
    }

    const overduePayments = payments.filter(p => p.status === 'overdue');
    if (overduePayments.length === 0) {
      toast.error("Nessun pagamento scaduto da sincronizzare (Stato: Scaduto).");
      return;
    }

    // Confirmation message (Mandatory Workspace Guidelines)
    const confirmed = window.confirm(
      `Confermi la sincronizzazione di massa di tutti i ${overduePayments.length} pagamenti SCADUTI su Google Calendar?`
    );
    if (!confirmed) return;

    setIsSyncingCalendar(true);
    let successCount = 0;

    for (const payment of overduePayments) {
      try {
        const unit = units.find(u => u.id === payment.unitId);
        const dateStr = payment.dueDate;

        const event = {
          summary: `⚠️ SOLLECITO COATTIVO: ${payment.title} (${unit?.number || ''})`,
          description: `Procedura di sollecito per morosità.\n\nSoggetto: ${payment.recipientName}\nImporto: €${payment.amount}\nStato: MOROSO / SCADUTO`,
          start: {
            dateTime: `${dateStr}T09:00:00`,
            timeZone: 'Europe/Rome'
          },
          end: {
            dateTime: `${dateStr}T10:00:00`,
            timeZone: 'Europe/Rome'
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 1440 },
              { method: 'popup', minutes: 60 }
            ]
          }
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        });

        if (response.ok) {
          successCount++;
        }
      } catch (err) {
        console.error(err);
      }
    }

    setIsSyncingCalendar(false);
    if (successCount > 0) {
      toast.success(`Sincronizzati ${successCount}/${overduePayments.length} solleciti di morosità su Google Calendar!`);
    } else {
      toast.error("Si è verificato un errore durante la sincronizzazione.");
    }
  };

  const openWhatsAppPrompt = (payment: Payment) => {
    const unit = units.find(u => u.id === payment.unitId);
    const recipient = payment.recipientName || (payment.recipientType === 'tenant' ? unit?.tenantName : unit?.ownerName) || 'Condomino';
    const phone = payment.recipientType === 'tenant' ? unit?.tenantPhone : unit?.ownerPhone;

    if (!phone) {
      toast.error(`Nessun recapito telefonico registrato per ${recipient}. Modifica l'unità ${unit?.number || ''} per specificarne uno.`);
      return;
    }

    const message = `Gentile ${recipient},\n\nDesideriamo ricordarLe che il pagamento "${payment.title}" associato all'unità "${unit?.number || ''}" di importo pari a €${payment.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} è scaduto in data ${payment.dueDate} e risulta attualmente INSOLUTO.\n\nLa invitiamo a regolarizzare la Sua posizione amministrativa il prima possibile o a contattarci per chiarimenti.\n\nCordiali saluti,\nAmministrazione ${condo.name}`;
    
    setSelectedWhatsAppPayment(payment);
    setWhatsAppMessage(message);
  };

  const sendWhatsApp = () => {
    if (!selectedWhatsAppPayment) return;
    const unit = units.find(u => u.id === selectedWhatsAppPayment.unitId);
    const phone = selectedWhatsAppPayment.recipientType === 'tenant' ? unit?.tenantPhone : unit?.ownerPhone;
    if (!phone) return;

    // Remove any formatting to leave pure digits / plus sign
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(whatsAppMessage)}`;
    window.open(url, '_blank');
    setSelectedWhatsAppPayment(null);
    toast.success("Messaggio WhatsApp avviato!");
  };

  const markAsPaid = async (payment: Payment) => {
    try {
      await updatePayment(condo.id, payment.id, { 
        status: 'paid', 
        paidAmount: payment.amount,
        paidAt: new Date().toISOString() 
      });
      toast.success("Pagamento saldato");
      loadData();
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('BILANCIO DI RIPARTIZIONE', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-400
      doc.text(`CONDOMINIO: ${condo.name.toUpperCase()}`, 14, 30);
      doc.text(`INDIRIZZO: ${condo.address.toUpperCase()}`, 14, 35);
      doc.text(`DATA EXPORT: ${timestamp}`, 14, 40);
      
      const ordinariaTotal = expenses.filter(e => e.category === 'ordinaria').reduce((sum, e) => sum + e.amount, 0);
      const straordinariaTotal = expenses.filter(e => e.category === 'straordinaria').reduce((sum, e) => sum + e.amount, 0);
      const grandTotal = ordinariaTotal + straordinariaTotal;

      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text(`TOTALE PREVENTIVO: EUR ${grandTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 14, 50);
      
      // Expenses Table
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('DETTAGLIO SPESE', 14, 60);

      const expenseData = expenses.map(e => [
        format(new Date(e.date), 'dd/MM/yyyy'),
        e.title.toUpperCase(),
        e.category.toUpperCase(),
        `€ ${e.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['Data', 'Descrizione', 'Categoria', 'Importo']],
        body: expenseData,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
        columnStyles: {
          3: { halign: 'right' }
        }
      });

      // Table Data
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('RIPARTIZIONE MILLESIMALE', 14, finalY);

      const tableData = units.map(u => {
        const ordShare = (ordinariaTotal * u.millesimi / 1000);
        const straShare = (straordinariaTotal * u.millesimi / 1000);
        const totalShare = ordShare + straShare;
        
        return [
          u.number,
          u.ownerName,
          u.millesimi.toFixed(2),
          `€ ${ordShare.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
          `€ ${straShare.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
          `€ ${totalShare.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
        ];
      });

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Unità', 'Soggetto', 'Millesimi', 'Quota ORD', 'Quota STRA', 'TOTALE']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' }
        }
      });

      doc.save(`Bilancio_${condo.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success("PDF generato con successo");
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Errore nella generazione del PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="rounded-xl h-11 w-11 shrink-0 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 bg-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            {condo.name}
          </h2>
          <div className="flex items-center gap-2 text-slate-500 font-bold mt-0.5 uppercase text-[9px] sm:text-[10px] tracking-widest break-all">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            {condo.address}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="w-full overflow-x-auto no-scrollbar pb-1.5 mb-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200 h-11 shadow-inner flex w-max sm:w-auto min-w-full">
            <TabsTrigger value="overview" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500 transition-all px-5 sm:px-6 font-black text-[9px] uppercase tracking-widest whitespace-nowrap"><Layers className="w-3.5 h-3.5 stroke-[3]" /> Panoramica</TabsTrigger>
            <TabsTrigger value="units" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500 transition-all px-5 sm:px-6 font-black text-[9px] uppercase tracking-widest whitespace-nowrap"><Users className="w-3.5 h-3.5 stroke-[3]" /> Anagrafica</TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500 transition-all px-5 sm:px-6 font-black text-[9px] uppercase tracking-widest whitespace-nowrap"><Receipt className="w-3.5 h-3.5 stroke-[3]" /> Spese</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500 transition-all px-5 sm:px-6 font-black text-[9px] uppercase tracking-widest whitespace-nowrap"><CreditCard className="w-3.5 h-3.5 stroke-[3]" /> Incassi</TabsTrigger>
            <TabsTrigger value="report" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500 transition-all px-5 sm:px-6 font-black text-[9px] uppercase tracking-widest whitespace-nowrap"><Calculator className="w-3.5 h-3.5 stroke-[3]" /> Ripartizione</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
            <Card className="bg-white border-2 border-slate-100 rounded-2xl shadow-lg shadow-slate-100 overflow-hidden">
              <div className="h-1.5 w-full bg-indigo-600" />
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-[9px] uppercase tracking-[0.25em] font-black text-slate-400">Patrimonio Millesimale</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-4xl font-black text-slate-900 tracking-tighter">1.000<span className="text-slate-200">,00</span></div>
                <div className="text-[10px] uppercase font-bold text-indigo-600 mt-3 tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  Coefficiente Base Stabile
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-slate-100 rounded-2xl shadow-lg shadow-slate-100 overflow-hidden">
              <div className="h-1.5 w-full bg-slate-900" />
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-[9px] uppercase tracking-[0.25em] font-black text-slate-400">Archivio Fabbricati</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-4xl font-black text-slate-900 tracking-tighter">{units.length}</div>
                <p className="text-[10px] uppercase font-bold text-slate-500 mt-3 tracking-widest">Unità Immobiliari Censite</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-slate-100 rounded-2xl shadow-lg shadow-slate-100 overflow-hidden">
              <div className="h-1.5 w-full bg-emerald-500" />
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-[9px] uppercase tracking-[0.25em] font-black text-slate-400">Saldo Netto Cassa</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className={`text-4xl font-black tracking-tighter ${
                  (payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) - expenses.reduce((sum, e) => sum + e.amount, 0)) >= 0 
                  ? 'text-slate-900' 
                  : 'text-red-600'
                }`}>
                  €{(payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) - expenses.reduce((sum, e) => sum + e.amount, 0)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] uppercase font-bold text-emerald-600 mt-3 tracking-widest">Saldo Entrate - Uscite</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="units">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <Card className="lg:col-span-1 h-fit rounded-2xl border border-slate-200 sticky top-24 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="bg-slate-900 p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-white/10 rounded-xl">
                    <UserPlus className="w-5 h-5 text-white" />
                   </div>
                   <div>
                    <h3 className="text-white font-black text-lg tracking-tight uppercase">
                      {editingUnit ? 'Modifica Unità' : 'Nuova Iscrizione'}
                    </h3>
                    <p className="text-[9px] text-white/40 uppercase font-black tracking-[0.2em] mt-0.5">
                      {editingUnit ? 'Aggiornamento Dati Catastali' : 'Anagrafica Condominiale'}
                    </p>
                   </div>
                </div>
              </div>
              <form onSubmit={handleAddUnit}>
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Identificativo Unità</Label>
                    <Input className="pro-input h-11 text-xs font-bold" value={newUnit.number} onChange={e => setNewUnit({...newUnit, number: e.target.value})} placeholder="es. Int. 1 - Scala A" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Quota Millesimale</Label>
                    <Input className="pro-input h-11 font-mono text-indigo-700 text-xl font-black" type="number" step="0.01" value={newUnit.millesimi} onChange={e => setNewUnit({...newUnit, millesimi: e.target.value as any})} placeholder="000.00" />
                  </div>
                  <div className="pt-4 space-y-6 border-t border-slate-100">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Nominativo Proprietario</Label>
                        <Input className="pro-input h-10 text-sm font-bold" value={newUnit.ownerName} onChange={e => setNewUnit({...newUnit, ownerName: e.target.value})} placeholder="Rossi Mario" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Telefono Proprietario (WhatsApp)</Label>
                        <Input className="pro-input h-10 text-xs font-medium" value={newUnit.ownerPhone || ''} onChange={e => setNewUnit({...newUnit, ownerPhone: e.target.value})} placeholder="+39 333 1234567" />
                      </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-dashed border-slate-100">
                      <div className="space-y-1.5">
                        <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Conduttore / Inquilino</Label>
                        <Input className="pro-input h-10 text-sm font-medium" value={newUnit.tenantName} onChange={e => setNewUnit({...newUnit, tenantName: e.target.value})} placeholder="Opzionale" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Telefono Conduttore (WhatsApp)</Label>
                        <Input className="pro-input h-10 text-xs font-medium" value={newUnit.tenantPhone || ''} onChange={e => setNewUnit({...newUnit, tenantPhone: e.target.value})} placeholder="+39 333 7654321" />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex flex-col gap-2">
                  <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-indigo-600 font-black h-11 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-[10px]">
                    {editingUnit ? 'CONFERMA MODIFICA' : 'REGISTRA UNITÀ'}
                  </Button>
                  {editingUnit && (
                    <Button variant="ghost" className="w-full h-8 text-[9px] font-black tracking-widest uppercase text-slate-400" onClick={() => { setEditingUnit(null); setNewUnit({number:'',millesimi:'' as unknown as number,ownerName:'',ownerPhone:'',tenantName:'',tenantPhone:''}); }}>
                      Annulla Modifica
                    </Button>
                  )}
                </CardFooter>
              </form>
            </Card>

            <Card className="lg:col-span-2 rounded-2xl border border-slate-200 p-0 overflow-hidden shadow-xl shadow-slate-200/50">
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Anagrafica Fabbricato</h3>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1.5">Dati catastali e coefficienti di riparto</p>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 font-black px-3 py-1 rounded-full border-none uppercase tracking-widest text-[9px]">
                  {units.length} Unit&agrave;
                </Badge>
              </div>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[600px] lg:min-w-0">
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 h-14">
                      <TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest px-8">U.I.</TableHead>
                      <TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Soggetto / Nominativo</TableHead>
                      <TableHead className="text-right text-slate-400 uppercase text-[10px] font-black tracking-widest px-8">Azioni / Coeff.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map(u => (
                      <TableRow key={u.id} className="border-slate-100 hover:bg-slate-50 transition-all h-20 group">
                        <TableCell className="font-mono font-black text-slate-900 px-8 text-2xl group-hover:text-indigo-600 transition-colors tracking-tighter">
                          {u.number}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-black text-lg tracking-tight uppercase leading-tight">{u.ownerName}</span>
                            <div className="flex items-center gap-2 mt-1.5">
                              {u.tenantName ? (
                                <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest text-indigo-600 border-indigo-200 bg-indigo-50 px-2.5 py-0">
                                  Inq: {u.tenantName}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest text-emerald-600 border-emerald-200 bg-emerald-50 px-2.5 py-0">
                                  Piena Proprietà
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                           <div className="flex justify-end gap-1.5 mb-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => { setEditingUnit(u); setNewUnit({number:u.number, millesimi:u.millesimi as any, ownerName:u.ownerName, ownerPhone:u.ownerPhone || '', tenantName:u.tenantName || '', tenantPhone:u.tenantPhone || ''}); }}>
                               <Edit2 className="w-4 h-4" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm({ id: u.id, type: 'unit', title: u.number })}>
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                           <div className="font-mono font-black text-slate-900 text-xl tracking-tighter leading-none">{u.millesimi.toFixed(2)}</div>
                           <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Caratura Mill.</div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {units.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-48 text-slate-200 uppercase tracking-[0.5em] text-[13px] font-black italic">Archivio Fabbricati Vuoto</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 h-fit rounded-2xl border border-slate-200 sticky top-24 shadow-xl shadow-slate-200/50 overflow-hidden">
               <div className="bg-indigo-600 p-6">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-white/10 rounded-xl">
                    <Receipt className="w-5 h-5 text-white" />
                   </div>
                   <div>
                    <h3 className="text-white font-black text-lg tracking-tight uppercase">
                      {editingExpense ? 'Modifica Spesa' : 'Nuova Spesa'}
                    </h3>
                    <p className="text-[9px] text-white/50 uppercase font-black tracking-[0.2em] mt-0.5">
                      {editingExpense ? 'Aggiornamento Contabile' : 'Contabilità Esercizio'}
                    </p>
                   </div>
                </div>
              </div>
              <form onSubmit={handleAddExpense}>
                <CardContent className="space-y-6 p-6 pt-6">
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Descrizione Oneri</Label>
                    <Input className="pro-input h-11 font-black text-sm" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} placeholder="es. Manutenzione Giardino" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Importo Fattura (€)</Label>
                    <Input 
                      className={`pro-input h-11 font-mono text-xl font-black tracking-tighter ${newExpense.amount < 0 ? 'text-red-600' : 'text-emerald-700'}`} 
                      type="number" 
                      step="0.01" 
                      value={newExpense.amount} 
                      onChange={e => setNewExpense({...newExpense, amount: e.target.value as any})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Data Fattura</Label>
                    <Input type="date" className="pro-input h-11 font-bold text-sm" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                  </div>
                  <div className="pt-3 space-y-4 border-t border-slate-100">
                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Classificazione</Label>
                      <Select value={newExpense.category} onValueChange={(v: any) => setNewExpense({...newExpense, category: v})}>
                        <SelectTrigger className="pro-input h-10 font-bold text-xs">
                          <SelectValue placeholder="Seleziona">
                            {newExpense.category === 'ordinaria' ? 'ORD (Ordinaria / Mista)' : 
                             newExpense.category === 'straordinaria' ? 'EXT (Straordinaria / Proprietario)' : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ordinaria" className="font-bold">ORD (Ordinaria / Mista)</SelectItem>
                          <SelectItem value="straordinaria" className="font-bold">EXT (Straordinaria / Proprietario)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Tipologia Costo</Label>
                      <Select value={newExpense.type} onValueChange={(v: any) => setNewExpense({...newExpense, type: v})}>
                        <SelectTrigger className="pro-input h-10 font-bold text-xs">
                          <SelectValue placeholder="Seleziona">
                            {newExpense.type === 'amministrazione' ? 'Amministrazione' : 
                             newExpense.type === 'pulizia' ? 'Pulizia / Servizi' :
                             newExpense.type === 'ascensore' ? 'Ascensore / Impianti' :
                             newExpense.type === 'riscaldamento' ? 'Energia / Gas' :
                             newExpense.type === 'struttura' ? 'Edilizia / Struttura' :
                             newExpense.type === 'altro' ? 'Altro' : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="font-bold">
                          <SelectItem value="amministrazione">Amministrazione</SelectItem>
                          <SelectItem value="pulizia">Pulizia / Servizi</SelectItem>
                          <SelectItem value="ascensore">Ascensore / Impianti</SelectItem>
                          <SelectItem value="riscaldamento">Energia / Gas</SelectItem>
                          <SelectItem value="struttura">Edilizia / Struttura</SelectItem>
                          <SelectItem value="altro">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex flex-col gap-2">
                  <Button type="submit" className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-black h-11 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.1em] text-[10px]">
                    {editingExpense ? 'CONFERMA MODIFICA' : 'CONTABILIZZA SPESA'}
                  </Button>
                  {editingExpense && (
                    <Button variant="ghost" className="w-full h-8 text-[9px] font-black tracking-widest uppercase text-slate-400" onClick={() => { setEditingExpense(null); setNewExpense({title:'',amount:'' as unknown as number,category:'ordinaria',type:'altro',paidBy:'misto', date: format(new Date(), 'yyyy-MM-dd')}); }}>
                      Annulla Modifica
                    </Button>
                  )}
                </CardFooter>
              </form>
            </Card>

            <Card className="lg:col-span-2 rounded-2xl border border-slate-200 p-0 overflow-hidden shadow-xl shadow-slate-200/50">
               <div className="px-8 py-6 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Libro Giornale Spese</h3>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1.5">Movimenti contabili certificati</p>
              </div>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[700px] lg:min-w-0">
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 h-14">
                      <TableHead 
                        className="text-slate-400 uppercase text-[10px] font-black tracking-widest px-8 cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => toggleSort('date')}
                      >
                        <div className="flex items-center">
                          Protocollo {getSortIcon('date')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-slate-400 uppercase text-[10px] font-black tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => toggleSort('title')}
                      >
                        <div className="flex items-center">
                          Titolo / Causa {getSortIcon('title')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-slate-400 uppercase text-[10px] font-black tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => toggleSort('category')}
                      >
                        <div className="flex items-center">
                          Categoria {getSortIcon('category')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right text-slate-400 uppercase text-[10px] font-black tracking-widest px-8 cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => toggleSort('amount')}
                      >
                        <div className="flex items-center justify-end">
                          Valore {getSortIcon('amount')}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedExpenses.map(e => (
                      <TableRow key={e.id} className="border-slate-100 hover:bg-slate-50 transition-all h-20 group">
                        <TableCell className="text-[11px] font-mono text-slate-400 px-8 uppercase font-black tracking-tighter leading-tight">
                          {e.date && !isNaN(new Date(e.date).getTime()) ? (
                            <>
                              {format(new Date(e.date), 'dd.MM', { locale: it })}<br/>
                              <span className="text-slate-300">{format(new Date(e.date), 'yyyy', { locale: it })}</span>
                            </>
                          ) : (
                            <span className="text-slate-300">--.--<br/>----</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-black text-slate-900 text-lg tracking-tight uppercase leading-tight">{e.title}</div>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold uppercase text-[8px] mt-1.5 border-none px-2 py-0">REF: {e.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`uppercase text-[9px] font-black tracking-widest border-none px-3 py-1 rounded-full ${
                            e.category === 'ordinaria' ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {e.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex justify-end gap-1.5 mb-1">
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => { setEditingExpense(e); setNewExpense({title:e.title, amount:e.amount as any, category:e.category, type:e.type, paidBy:e.paidBy, date: e.date || format(new Date(), 'yyyy-MM-dd')}); }}>
                               <Edit2 className="w-4 h-4" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm({ id: e.id, type: 'expense', title: e.title })}>
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                          <div className="font-mono font-black text-xl tracking-tighter leading-none text-red-600">
                            -€{Math.abs(e.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] font-black uppercase tracking-widest mt-0.5 text-red-500">
                             Uscita Contabile
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {expenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-48 text-slate-200 uppercase tracking-[0.5em] text-[13px] font-black italic">Registro Contabile Vuoto</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="report">
          <Card className="rounded-2xl border border-slate-200 p-0 overflow-hidden shadow-xl shadow-slate-200/50">
             <div className="px-8 py-8 bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase">Bilancio di Ripartizione</h3>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-2">Ripartizione analitica per caratura millesimale</p>
                </div>
                <div className="flex gap-4">
                  <Button 
                    onClick={() => setIsEmittingRates(true)}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-xl shadow-lg shadow-emerald-900/20"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Emetti Rate
                  </Button>
                  <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-0.5">Saldo Netto Operativo</p>
                    <p className="text-2xl font-black text-white">€{(payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) - expenses.reduce((sum, e) => sum + e.amount, 0)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
             </div>
             <CardContent className="p-0 overflow-x-auto">
               <Table className="min-w-[900px] lg:min-w-0">
                 <TableHeader>
                   <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 h-16">
                     <TableHead className="text-slate-900 uppercase text-[10px] font-black tracking-widest px-8">Unità / Caratura</TableHead>
                     <TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Soggetto</TableHead>
                     <TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Ripartizione Ordinaria</TableHead>
                     <TableHead className="text-right text-slate-900 uppercase text-[10px] font-black tracking-widest px-8">Debito Totale</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {units.map(u => {
                     const ordinaria = expenses.filter(e => e.category === 'ordinaria').reduce((sum, e) => sum + e.amount, 0);
                     const straordinaria = expenses.filter(e => e.category === 'straordinaria').reduce((sum, e) => sum + e.amount, 0);
                     const totalShare = (ordinaria * u.millesimi / 1000) + (straordinaria * u.millesimi / 1000);
                     
                     return (
                       <TableRow key={u.id} className="border-slate-100 hover:bg-slate-50/80 transition-all h-24 group">
                         <TableCell className="px-8">
                           <div className="flex flex-col">
                             <span className="font-mono font-black text-slate-900 text-2xl tracking-tighter group-hover:text-indigo-600 transition-colors">{u.number}</span>
                             <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Caratura: {u.millesimi.toFixed(2)}</span>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex flex-col">
                             <span className="text-slate-900 font-black text-lg tracking-tight uppercase leading-tight">{u.ownerName}</span>
                             <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-1.5">Proprietario Certificato</span>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="space-y-0.5">
                             <div className="flex items-center gap-2">
                               <span className="text-[9px] font-black uppercase text-slate-400 w-14">ORDINARIA</span>
                               <span className="font-mono font-bold text-slate-600 tracking-tight text-xs">€{(ordinaria * u.millesimi / 1000).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                             </div>
                             <div className="flex items-center gap-2 border-t border-slate-100 pt-0.5">
                               <span className="text-[9px] font-black uppercase text-slate-400 w-14">STRAORD.</span>
                               <span className="font-mono font-bold text-slate-600 tracking-tight text-xs">€{(straordinaria * u.millesimi / 1000).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                             </div>
                           </div>
                         </TableCell>
                         <TableCell className="text-right px-8">
                           <div className="font-mono font-black text-slate-900 text-3xl tracking-tighter group-hover:scale-105 transition-transform origin-right">
                             €{totalShare.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                           </div>
                           <div className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mt-1.5 flex items-center justify-end gap-1.5">
                             <PieChart className="w-2.5 h-2.5" />
                             Quota Calcolata
                           </div>
                         </TableCell>
                       </TableRow>
                     );
                   })}
                   {units.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={4} className="text-center py-32 text-slate-200 uppercase tracking-[0.5em] text-[11px] font-black italic">Dati Insufficienti per il Report</TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </CardContent>
             <CardFooter className="p-8 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                    <FileText className="w-5 h-5" />
                   </div>
                   <p className="text-slate-500 font-bold max-w-xs text-xs">Il presente documento costituisce base per l&apos;emissione delle rate condominiali.</p>
                </div>
                <Button 
                  onClick={handleExportPDF}
                  className="rounded-xl h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg text-[10px]"
                >
                  ESPORTA BILANCIO PDF
                </Button>
             </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 h-fit rounded-2xl border border-slate-200 sticky top-24 shadow-xl shadow-slate-200/50 overflow-hidden">
               <div className="bg-emerald-600 p-6">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-white/10 rounded-xl">
                    <CreditCard className="w-5 h-5 text-white" />
                   </div>
                   <div>
                    <h3 className="text-white font-black text-lg tracking-tight uppercase">Gestione Incassi</h3>
                    <p className="text-[9px] text-white/50 uppercase font-black tracking-[0.2em] mt-0.5">Rate e Canoni di Locazione</p>
                   </div>
                </div>
              </div>
              <form onSubmit={handleAddPayment}>
                <CardContent className="space-y-6 p-6 pt-6">
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Unità Destinataria</Label>
                    <Select value={newPayment.unitId} onValueChange={(v) => {
                      const unit = units.find(u => u.id === v);
                      setNewPayment({
                        ...newPayment, 
                        unitId: v,
                        recipientName: unit ? unit.ownerName : '',
                        recipientUid: unit ? unit.ownerUid || '' : '',
                        recipientType: 'owner'
                      });
                    }}>
                      <SelectTrigger className="pro-input h-10 font-bold text-xs">
                        <SelectValue placeholder="Seleziona Unità">
                          {newPayment.unitId && units.find(u => u.id === newPayment.unitId) ? (
                            `${units.find(u => u.id === newPayment.unitId)?.number} - ${units.find(u => u.id === newPayment.unitId)?.ownerName}`
                          ) : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.id} className="font-bold">{u.number} - {u.ownerName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {newPayment.unitId && (
                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Soggetto Debitore (Persona Riconducibile)</Label>
                      <Select 
                        value={newPayment.recipientType || 'owner'} 
                        onValueChange={(typeVal: 'owner' | 'tenant') => {
                          const unit = units.find(u => u.id === newPayment.unitId);
                          if (!unit) return;
                          if (typeVal === 'owner') {
                            setNewPayment({
                              ...newPayment,
                              recipientType: 'owner',
                              recipientName: unit.ownerName,
                              recipientUid: unit.ownerUid || ''
                            });
                          } else {
                            setNewPayment({
                              ...newPayment,
                              recipientType: 'tenant',
                              recipientName: unit.tenantName || '',
                              recipientUid: unit.tenantUid || ''
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="pro-input h-10 font-bold text-xs">
                          <SelectValue placeholder="Seleziona Soggetto">
                            {newPayment.recipientType === 'tenant' ? (
                              `Inquilino: ${newPayment.recipientName || 'Nessuno'}`
                            ) : (
                              `Proprietario: ${newPayment.recipientName || 'Nessuno'}`
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="font-bold">
                          <SelectItem value="owner">Proprietario: {units.find(u => u.id === newPayment.unitId)?.ownerName || 'Caricamento...'}</SelectItem>
                          {units.find(u => u.id === newPayment.unitId)?.tenantName && (
                            <SelectItem value="tenant">Inquilino: {units.find(u => u.id === newPayment.unitId)?.tenantName}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Titolo del Pagamento</Label>
                    <Input className="pro-input h-11 font-black text-sm" value={newPayment.title} onChange={e => setNewPayment({...newPayment, title: e.target.value})} placeholder="es. Rata 1 - Gennaio" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Importo Totale (€)</Label>
                      <Input className="pro-input h-11 font-mono text-indigo-700 text-lg font-black tracking-tighter" type="number" step="0.01" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value as any})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Importo Pagato (€)</Label>
                      <Input className="pro-input h-11 font-mono text-emerald-700 text-lg font-black tracking-tighter" type="number" step="0.01" value={newPayment.paidAmount} onChange={e => setNewPayment({...newPayment, paidAmount: e.target.value as any})} />
                    </div>
                  </div>
                  <div className="pt-3 space-y-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Scadenza</Label>
                        <Input type="date" className="pro-input h-10 font-bold text-xs" value={newPayment.dueDate} onChange={e => setNewPayment({...newPayment, dueDate: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Tipologia</Label>
                        <Select value={newPayment.type} onValueChange={(v: any) => setNewPayment({...newPayment, type: v})}>
                          <SelectTrigger className="pro-input h-10 font-bold text-xs">
                            <SelectValue>
                              {newPayment.type === 'rate' ? 'Rata Cond.' : 
                               newPayment.type === 'rent' ? 'Canone Affit.' : 
                               newPayment.type === 'extra' ? 'Extra / Altro' : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="font-bold">
                            <SelectItem value="rate">Rata Cond.</SelectItem>
                            <SelectItem value="rent">Canone Affit.</SelectItem>
                            <SelectItem value="extra">Extra / Altro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Stato Pagamento</Label>
                      <Select value={newPayment.status} onValueChange={(v: any) => setNewPayment({...newPayment, status: v})}>
                        <SelectTrigger className="pro-input h-10 font-bold text-xs">
                          <SelectValue>
                            {newPayment.status === 'pending' ? 'Pendente / Emesso' : 
                             newPayment.status === 'paid' ? 'Saldato / Incassato' : 
                             newPayment.status === 'overdue' ? 'Scaduto / Insoluto' : 
                             newPayment.status === 'partial' ? 'Pagato Parzialmente' : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="font-bold">
                          <SelectItem value="pending">Pendente / Emesso</SelectItem>
                          <SelectItem value="paid">Saldato / Incassato</SelectItem>
                          <SelectItem value="partial">Pagato Parzialmente</SelectItem>
                          <SelectItem value="overdue">Scaduto / Insoluto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex flex-col gap-2">
                  <Button type="submit" className="w-full bg-emerald-600 text-white hover:bg-emerald-700 font-black h-11 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.1em] text-[10px]">
                    {editingPayment ? 'AGGIORNA PAGA' : 'EMETTI PAGAMENTO'}
                  </Button>
                  {editingPayment && (
                    <Button variant="ghost" className="w-full h-8 text-[9px] font-black tracking-widest uppercase text-slate-400" onClick={() => { 
                      setEditingPayment(null); 
                      setNewPayment({unitId:'',title:'',amount:0,dueDate:format(new Date(), 'yyyy-MM-dd'),type:'rate',status:'pending'}); 
                    }}>
                      Annulla
                    </Button>
                  )}
                </CardFooter>
              </form>
            </Card>

            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-2xl border border-slate-200 p-6 shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-md font-black text-slate-900 uppercase tracking-tight">Sincronizzazione Google Calendar</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {isGoogleConnected 
                          ? "Connesso all'account Google - Pronto per impostare allarmi di scadenze" 
                          : "Collega Google Calendar per ricevere allarmi automatici sul telefono per pagamenti scaduti"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isGoogleConnected ? (
                      <Button 
                        type="button"
                        onClick={handleConnectGoogle}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl flex items-center gap-2"
                      >
                        Connetti Google Calendar
                      </Button>
                    ) : (
                      <>
                        <Button 
                          type="button"
                          onClick={syncAllOverdueToCalendar}
                          disabled={isSyncingCalendar}
                          className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl flex items-center gap-2"
                        >
                          {isSyncingCalendar ? "Sincronizzazione..." : "Sincronizza Scadenze Scadute"}
                        </Button>
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const confirmed = window.confirm("Sei sicuro di voler scollegare l'account Google Calendar dall'applicazione?");
                            if (confirmed) {
                              setIsGoogleConnected(false);
                            }
                          }}
                          className="border-slate-200 hover:bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl"
                        >
                          Scollega
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border border-slate-200 p-0 overflow-hidden shadow-xl shadow-slate-200/50 bg-white">
                 <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Registro Incassi / Crediti</h3>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1.5">Monitoraggio flussi finanziari in entrata</p>
                  </div>
                   <div className="flex gap-3">
                      <div className="text-right px-4 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                        <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest leading-none mb-1">Incassato</p>
                        <p className="text-lg font-black text-emerald-700 leading-none">€{payments.filter(p => p.status === 'paid').reduce((s,p) => s+p.amount, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="text-right px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Pendente</p>
                        <p className="text-lg font-black text-slate-900 leading-none">€{payments.filter(p => p.status !== 'paid').reduce((s,p) => s+p.amount, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                      </div>
                   </div>
              </div>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[800px] lg:min-w-0">
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 h-14">
                      <TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest px-8">Stato / Data</TableHead>
                      <TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Unità / Descrizione</TableHead>
                      <TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Soggetto Collegato (Debitore)</TableHead>
                      <TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Tipo</TableHead>
                      <TableHead className="text-right text-slate-400 uppercase text-[10px] font-black tracking-widest px-8">Azioni / Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => {
                      const unit = units.find(u => u.id === p.unitId);
                      const isPartial = p.status === 'partial' || (p.paidAmount && p.paidAmount > 0 && p.paidAmount < p.amount);
                      return (
                        <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50 transition-all h-20 group">
                          <TableCell className="px-8">
                            {p.status === 'paid' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1 px-2.5 py-0.5 font-black mb-1.5 uppercase text-[8px] tracking-widest whitespace-nowrap"><CheckCircle2 className="w-2.5 h-2.5" /> Saldato</Badge>
                            ) : isPartial ? (
                              <Badge className="bg-sky-50 text-sky-700 border-sky-100 gap-1 px-2.5 py-0.5 font-black mb-1.5 uppercase text-[8px] tracking-widest whitespace-nowrap"><Clock className="w-2.5 h-2.5" /> Parziale</Badge>
                            ) : p.status === 'overdue' ? (
                              <Badge className="bg-red-50 text-red-700 border-red-100 gap-1 px-2.5 py-0.5 font-black mb-1.5 uppercase text-[8px] tracking-widest whitespace-nowrap"><AlertCircle className="w-2.5 h-2.5" /> Scaduto</Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-100 gap-1 px-2.5 py-0.5 font-black mb-1.5 uppercase text-[8px] tracking-widest whitespace-nowrap"><Clock className="w-2.5 h-2.5" /> Attesa</Badge>
                            )}
                            <div className="text-[10px] font-mono font-black text-slate-400 tracking-tighter leading-none">SCAD: {p.dueDate}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-black text-slate-900 text-sm tracking-tight uppercase leading-tight">{p.title}</div>
                            <div className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest mt-1">
                              U.I. INTERNO: {unit?.number || 'Ometti'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {p.recipientName || unit?.ownerName || 'Anagrafica Mancante'}
                              </div>
                              <div className="text-[9px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1">
                                {p.recipientType === 'tenant' ? (
                                  <span className="text-sky-600 bg-sky-50 px-1.5 py-0 rounded font-black">Inquilino / Conduttore</span>
                                ) : (
                                  <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0 rounded font-black">Proprietario Millesimale</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase text-[8px] font-black tracking-widest border-slate-200 text-slate-500">{p.type}</Badge>
                          </TableCell>
                          <TableCell className="text-right px-8">
                             <div className="flex justify-end gap-1.5 mb-1 text-xs">
                               {p.status !== 'paid' && (
                                 <>
                                   <Button 
                                     type="button"
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 animate-pulse" 
                                     onClick={() => openWhatsAppPrompt(p)} 
                                     title="Sollecita su WhatsApp"
                                   >
                                     <MessageSquare className="w-4 h-4" />
                                   </Button>
                                   
                                   {isGoogleConnected && (
                                     <Button 
                                       type="button"
                                       variant="ghost" 
                                       size="icon" 
                                       className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-55" 
                                       onClick={() => syncPaymentToCalendar(p)} 
                                       title="Sincronizza su Google Calendar"
                                     >
                                       <Calendar className="w-4 h-4" />
                                     </Button>
                                   )}

                                   <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => markAsPaid(p)} title="Segna come Saldato">
                                     <CheckCircle2 className="w-4 h-4" />
                                   </Button>
                                 </>
                               )}
                               <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => { setEditingPayment(p); setNewPayment({unitId:p.unitId, title:p.title, amount:p.amount as any, paidAmount: (p.paidAmount || '') as any, dueDate:p.dueDate, type:p.type, status:p.status, recipientName: p.recipientName || '', recipientUid: p.recipientUid || '', recipientType: p.recipientType || 'owner'}); }} title="Modifica">
                                 <Edit2 className="w-4 h-4" />
                               </Button>
                               <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm({ id: p.id, type: 'payment', title: p.title })} title="Elimina">
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                             </div>
                            <div className="font-mono font-black text-slate-900 text-xl tracking-tighter leading-none">€{p.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                            {p.paidAmount && p.paidAmount > 0 && p.paidAmount < p.amount ? (
                              <div className="text-[9px] text-emerald-600 font-extrabold mt-1">
                                Pagati: €{p.paidAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} &bull; Rim: €{(p.amount - p.paidAmount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </div>
                            ) : p.status === 'paid' ? (
                              <div className="text-[9px] text-emerald-600 font-bold mt-1">Interamente Saldato</div>
                            ) : (
                              <div className="text-[9px] text-slate-400 font-bold mt-1">Nessun acconto</div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-48 text-slate-200 uppercase tracking-[0.5em] text-[13px] font-black italic">Nessuna rata o rateazione emessa</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm"
          >
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Conferma Eliminazione</h3>
                <p className="text-slate-500 font-medium text-sm">
                  Sei sicuro di voler eliminare <span className="font-black text-slate-900">&quot;{deleteConfirm.title}&quot;</span>?
                </p>
                <p className="text-red-500 font-bold text-[10px] uppercase tracking-widest mt-4 bg-red-50 py-2 rounded-lg italic">L&apos;operazione è irreversibile</p>
              </div>
              <div className="flex gap-3 px-8 pb-8">
                <Button 
                  variant="ghost" 
                  className="flex-1 h-12 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-widest"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Indietro
                </Button>
                <Button 
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 h-12 rounded-xl font-black shadow-lg shadow-red-100 uppercase text-[10px] tracking-widest"
                  onClick={() => {
                    if (deleteConfirm.type === 'unit') handleDeleteUnit(deleteConfirm.id);
                    if (deleteConfirm.type === 'expense') handleDeleteExpense(deleteConfirm.id);
                    if (deleteConfirm.type === 'payment') handleDeletePayment(deleteConfirm.id);
                  }}
                >
                  Sì, Elimina
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Emit Rates Modal */}
      {isEmittingRates && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl"
          >
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
              <div className="bg-indigo-600 p-8 text-center text-white">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Euro className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Emissione Rate Massiva</h3>
                <p className="text-indigo-100 text-xs font-medium mt-1">Sottoponi a pagamento le quote millesimali</p>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Descrizione dell'Emissione</Label>
                  <Input 
                    className="pro-input h-12 font-bold" 
                    value={emitRatesTitle} 
                    onChange={e => setEmitRatesTitle(e.target.value)}
                    placeholder="es. Rata 1 - Gestione 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Importo Totale da Ripartire (€)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="pro-input h-14 font-mono text-2xl font-black text-indigo-700 tracking-tighter" 
                    value={emitRatesTotal} 
                    onChange={e => setEmitRatesTotal(e.target.value as any)}
                    placeholder="0.00"
                  />
                  <div className="flex items-center gap-4 w-full mt-2.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic shrink-0">Verrà diviso tra {units.length} unità</p>
                    <button 
                      type="button"
                      className="flex-1 h-9 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-lg transition-all duration-75 active:scale-[0.95] flex items-center justify-center text-[9px] uppercase tracking-wider text-center"
                      onClick={() => {
                        playBeep();
                        const exp = expenses.reduce((sum, e) => sum + e.amount, 0);
                        const paid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
                        setEmitRatesTotal(Math.max(0, exp - paid));
                      }}
                    >
                      Pareggia Bilancio
                    </button>
                  </div>
                </div>
              </CardContent>
              <div className="flex gap-3 px-8 pb-8">
                <Button 
                  variant="ghost" 
                  className="flex-1 h-12 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-widest"
                  onClick={() => setIsEmittingRates(false)}
                >
                  Indietro
                </Button>
                <Button 
                  className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 h-12 rounded-xl font-black shadow-lg shadow-indigo-100 uppercase text-[10px] tracking-widest"
                  onClick={handleEmitRates}
                  disabled={loading}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Genera Rate'}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* WhatsApp Message Editor Modal */}
      {selectedWhatsAppPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xl"
          >
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
              <div className="bg-emerald-600 p-8 text-center text-white">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Invia Sollecito WhatsApp</h3>
                <p className="text-emerald-150 text-xs font-medium mt-1">Personalizza l'avviso di pagamento pronto per l'invio</p>
              </div>
              <CardContent className="p-8 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Soggetto Destinatario</Label>
                  <Input 
                    className="pro-input h-10 font-bold bg-slate-50 border-none text-slate-700" 
                    value={
                      (() => {
                        const unit = units.find(u => u.id === selectedWhatsAppPayment.unitId);
                        return selectedWhatsAppPayment.recipientName || (selectedWhatsAppPayment.recipientType === 'tenant' ? unit?.tenantName : unit?.ownerName) || '';
                      })()
                    } 
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Recapito WhatsApp</Label>
                  <Input 
                    className="pro-input h-10 font-bold bg-slate-50 border-none text-slate-700 font-mono text-xs" 
                    value={
                      (() => {
                        const unit = units.find(u => u.id === selectedWhatsAppPayment.unitId);
                        return selectedWhatsAppPayment.recipientType === 'tenant' ? unit?.tenantPhone || '' : unit?.ownerPhone || '';
                      })()
                    } 
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-900 font-black text-[10px] uppercase tracking-widest opacity-60">Testo del Messaggio</Label>
                  <textarea 
                    className="w-full min-h-[160px] p-4 font-medium text-xs text-slate-800 rounded-2xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all leading-relaxed resize-none"
                    value={whatsAppMessage} 
                    onChange={e => setWhatsAppMessage(e.target.value)}
                    placeholder="Scrivi il corpo del messaggio di sollecito..."
                  />
                </div>
              </CardContent>
              <div className="flex gap-3 px-8 pb-8">
                <Button 
                  variant="ghost" 
                  className="flex-1 h-12 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-widest"
                  onClick={() => setSelectedWhatsAppPayment(null)}
                >
                  Annulla
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 h-12 rounded-xl font-black shadow-lg shadow-emerald-100 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                  onClick={sendWhatsApp}
                >
                  Invia su WhatsApp
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
