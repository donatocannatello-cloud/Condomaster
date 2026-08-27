import React, { useState, useRef } from 'react';
import { exportBackup, importBackup } from '../services/condoService';
import { getLocalProfile, setLocalDisplayName } from '../services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Download,
  Upload,
  ShieldCheck,
  Smartphone,
  User,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [displayName, setDisplayName] = useState(getLocalProfile().displayName);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveName = () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setLocalDisplayName(trimmed);
    toast.success("Nome aggiornato. Ricarica l'app per vederlo nell'intestazione.");
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `condomaster_backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup esportato con successo");
    } catch (e: any) {
      toast.error("Errore durante l'esportazione: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      "Importando un backup, tutti i condomini, unità, spese e pagamenti salvati attualmente sul telefono verranno sostituiti. Continuare?"
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const stats = await importBackup(data);
      toast.success(
        `Ripristino completato: ${stats.importedCondos} condomini, ${stats.importedUnits} unità, ${stats.importedExpenses} spese, ${stats.importedPayments} pagamenti.`
      );
    } catch (err: any) {
      toast.error("Importazione fallita: " + (err.message || "file non valido"));
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-20">
      <Card className="rounded-[2.5rem] border-slate-200 shadow-xl shadow-indigo-100/20 overflow-hidden bg-white">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Profilo Amministratore</CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Nome visualizzato nell'app</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="pro-input h-14 font-bold text-lg flex-1"
              placeholder="Il tuo nome"
            />
            <Button
              onClick={handleSaveName}
              className="h-14 px-8 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-xs tracking-widest"
            >
              Salva
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-slate-200 shadow-xl shadow-indigo-100/20 overflow-hidden bg-white">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Dati sul dispositivo</CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Tutto resta offline, nessun server</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-4 space-y-6">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Condomini, unità, spese e pagamenti sono salvati solo sulla memoria di questo telefono.
              Esporta un backup periodicamente: se disinstalli l'app o cambi telefono, è l'unico modo per non perdere i dati.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Esporta Backup (.json)
            </Button>
            <Button
              onClick={handleImportClick}
              disabled={isImporting}
              variant="outline"
              className="flex-1 h-14 rounded-2xl border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" /> Importa Backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-slate-200 shadow-xl shadow-indigo-100/20 overflow-hidden bg-white">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">App Locale</CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400">CondoMaster Pro</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <p className="text-xs font-semibold text-slate-500 leading-relaxed">
            Questa è un'applicazione locale: non richiede login, non invia dati a nessun server e funziona anche senza connessione internet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
