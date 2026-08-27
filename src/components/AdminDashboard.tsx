import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/src/services/authService';
import { 
  getCondosByAdmin, 
  createCondo, 
  updateCondo,
  deleteCondo,
  Condominium 
} from '@/src/services/condoService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  Plus, 
  MapPin, 
  ArrowRight, 
  Search,
  LayoutDashboard,
  Users,
  Receipt,
  Edit2,
  Trash2,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import AdminCondoDetail from './AdminCondoDetail';
import GlobalCreditsView from './GlobalCreditsView';
import AdminSettings from './AdminSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDashboard({ 
  profile, 
  activeTab, 
  onTabChange 
}: { 
  profile: UserProfile,
  activeTab: 'condos' | 'credits' | 'settings',
  onTabChange: (tab: 'condos' | 'credits' | 'settings') => void 
}) {
  const [condos, setCondos] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCondo, setEditingCondo] = useState<Condominium | null>(null);
  const [newCondo, setNewCondo] = useState({ name: '', address: '' });
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [condoToDelete, setCondoToDelete] = useState<string | null>(null);

  const visibleCondos = condos.filter(c => c.name !== "Mio Patrimonio Personale");

  useEffect(() => {
    loadCondos();
  }, []);

  const ensurePersonalCondo = async (existingCondos: Condominium[]) => {
    const personalName = "Mio Patrimonio Personale";
    const hasPersonal = existingCondos.some(c => c.name === personalName);
    
    if (!hasPersonal) {
      try {
        const condoId = await createCondo(personalName, "Gestione Privata Admin");
        if (condoId) {
          // Add default unit for the admin in their personal assets condo
          const { addUnit } = await import('../services/condoService');
          await addUnit(condoId, {
            number: "PROPRIETÀ PERSONALE 1",
            millesimi: 1000,
            ownerName: profile.displayName || "Amministratore",
            ownerUid: profile.uid,
            tenantName: ""
          });
        }
        const updated = await getCondosByAdmin() || [];
        setCondos(updated);
      } catch (e) {
        console.error("Failed to create personal condo", e);
      }
    }
  };

  const loadCondos = async () => {
    try {
      const data = await getCondosByAdmin() || [];
      setCondos(data);
      if (data.length >= 0) {
        ensurePersonalCondo(data);
      }
    } catch (error) {
      toast.error("Errore nel caricamento dei condomini");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCondo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCondo.name || !newCondo.address) return;
    
    try {
      if (editingCondo) {
        await updateCondo(editingCondo.id, newCondo.name, newCondo.address);
        toast.success("Condominio aggiornato correttamente");
      } else {
        await createCondo(newCondo.name, newCondo.address);
        toast.success("Condominio creato con successo");
      }
      setNewCondo({ name: '', address: '' });
      setEditingCondo(null);
      setShowAddModal(false);
      loadCondos();
    } catch (error) {
      toast.error("Errore nell'operazione");
    }
  };

  const handleDeleteCondo = async (id: string) => {
    try {
      await deleteCondo(id);
      toast.success("Condominio eliminato");
      setCondoToDelete(null);
      loadCondos();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const startEdit = (e: React.MouseEvent, condo: Condominium) => {
    e.stopPropagation();
    setEditingCondo(condo);
    setNewCondo({ name: condo.name, address: condo.address });
    setShowAddModal(true);
  };

  if (selectedCondo) {
    return <AdminCondoDetail condo={selectedCondo} onBack={() => setSelectedCondo(null)} />;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="condos" value={activeTab} onValueChange={(v) => onTabChange(v as any)} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="hidden md:block">
             <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
               {activeTab === 'condos' ? 'I Miei Condomini' : 
                activeTab === 'credits' ? 'Gestione Crediti' : 
                'Impostazioni Database'}
             </h2>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Pannello di controllo amministrativo</p>
          </div>
        </div>

        <TabsContent value="condos" className="mt-0 outline-none">
          <AnimatePresence>
            {showAddModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 10 }}
                  className="w-full max-w-2xl"
                >
                  <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-none rounded-[2rem] overflow-hidden bg-white">
                    <div className="bg-slate-900 px-10 py-10">
                      <CardTitle className="text-3xl font-black text-white tracking-tighter">
                        {editingCondo ? 'Modifica Stabile' : 'Nuovo Stabile'}
                      </CardTitle>
                      <CardDescription className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em] mt-3">
                        {editingCondo ? 'Aggiornamento Dati Registro' : 'Registrazione Ufficiale Amministrativa'}
                      </CardDescription>
                    </div>
                    <form onSubmit={handleAddCondo}>
                      <CardContent className="space-y-8 p-10 pt-10">
                        <div className="space-y-3">
                          <Label htmlFor="name" className="text-slate-900 font-black text-[11px] uppercase tracking-widest opacity-60">Denominazione Condominio</Label>
                          <Input 
                            id="name" 
                            placeholder="es. Residence Magnolia" 
                            value={newCondo.name}
                            onChange={(e) => setNewCondo({ ...newCondo, name: e.target.value })}
                            className="pro-input h-14 font-bold text-lg"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="address" className="text-slate-900 font-black text-[11px] uppercase tracking-widest opacity-60">Ubicazione / Indirizzo</Label>
                          <Input 
                            id="address" 
                            placeholder="es. Via Roma 12, Milano" 
                            value={newCondo.address}
                            onChange={(e) => setNewCondo({ ...newCondo, address: e.target.value })}
                            className="pro-input h-14 font-bold text-lg"
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-4 p-10 pt-0">
                        <Button variant="ghost" type="button" onClick={() => { setShowAddModal(false); setEditingCondo(null); setNewCondo({name:'',address:''}); }} className="flex-1 h-16 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 uppercase text-[11px] font-black tracking-widest">
                          Annulla
                        </Button>
                        <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700 font-black h-16 rounded-2xl shadow-xl shadow-indigo-100 px-10 transition-all hover:scale-[1.02]">
                          {editingCondo ? 'SALVA MODIFICHE' : 'REGISTRA ORA'}
                        </Button>
                      </CardFooter>
                    </form>
                  </Card>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1,2,3].map(i => <div key={i} className="h-64 rounded-[2.5rem] bg-slate-200 animate-pulse" />)}
            </div>
          ) : visibleCondos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="bg-slate-50 p-10 rounded-full mb-8 border border-slate-100">
                <Building2 className="w-20 h-20 text-slate-300" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Nessuno stabile attivo</h3>
              <p className="text-slate-500 max-w-sm mt-3 font-medium">Inizia aggiungendo il primo condominio che devi amministrare.</p>
              <Button onClick={() => setShowAddModal(true)} className="mt-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-10 h-14 font-bold shadow-lg shadow-indigo-100">
                Aggiungi ora
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visibleCondos.map((condo) => (
                <motion.div
                  layoutId={condo.id}
                  key={condo.id}
                  whileHover={{ y: -10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <Card 
                    className="h-full cursor-pointer transition-all bg-white border-slate-200/60 rounded-[2.5rem] overflow-hidden group shadow-[0_10px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)] hover:border-indigo-200"
                    onClick={() => setSelectedCondo(condo)}
                  >
                    <div className="h-2 w-full bg-slate-100 group-hover:bg-indigo-600 transition-colors" 
                         style={{ backgroundColor: condo.name.includes("Patrimonio Personale") ? "#059669" : undefined }} />
                    <CardHeader className="p-6 pb-4 relative space-y-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                          condo.name.includes("Patrimonio Personale") 
                            ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100" 
                            : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                        }`}>
                          {condo.name.includes("Patrimonio Personale") ? <Wallet className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                        </div>
                        <CardTitle className="text-slate-900 text-xl font-black tracking-tight leading-tight">
                          {condo.name}
                        </CardTitle>
                      </div>
                      
                      <CardDescription className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                        <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <span>{condo.address}</span>
                      </CardDescription>

                      <div className="flex gap-2 pt-1">
                        <Button 
                          variant="outline" 
                          className="flex-1 h-9 rounded-lg bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200 transition-all font-black uppercase text-[8px] tracking-widest"
                          onClick={(e) => startEdit(e, condo)}
                        >
                          <Edit2 className="w-3 h-3 mr-1.5" /> Modifica
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-9 rounded-lg bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200 transition-all font-black uppercase text-[8px] tracking-widest"
                          onClick={(e) => { e.stopPropagation(); setCondoToDelete(condo.id); }}
                        >
                          <Trash2 className="w-3 h-3 mr-1.5" /> Elimina
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 flex-1">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group-hover:bg-indigo-50/50 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Anagrafica</span>
                          <span className="text-lg font-black text-slate-900">Completa</span>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Contabilità</span>
                          <span className="text-lg font-black text-indigo-600">Attiva</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3 p-6 border-t border-slate-50 bg-slate-50/50 mt-3 group-hover:bg-white transition-colors">
                      <Button variant="ghost" className="w-full h-11 justify-between group-hover:bg-indigo-600 group-hover:text-white rounded-xl text-slate-500 font-black uppercase text-[10px] tracking-widest transition-all">
                        PANNELLO DI GESTIONE <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1.5" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'condos' && visibleCondos.length > 0 && (
            <div className="mt-12 flex justify-center pb-12">
              <Button 
                variant="outline" 
                onClick={() => setShowAddModal(true)} 
                className="rounded-2xl h-14 px-10 border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all font-black uppercase text-[10px] tracking-widest border-2 border-dashed"
              >
                <Plus className="w-4 h-4 mr-2 stroke-[3]" /> REGISTRA NUOVO CONDOMINIO
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="credits" className="mt-0 outline-none">
          <GlobalCreditsView />
        </TabsContent>

        <TabsContent value="settings" className="mt-0 outline-none">
          <AdminSettings />
        </TabsContent>
      </Tabs>

      <AnimatePresence>
        {condoToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Elimina Condominio</h3>
                  <p className="text-slate-500 font-medium text-xs leading-relaxed">
                    Sei sicuro? Tutti i dati relativi a <span className="font-black text-slate-900">&quot;{condos.find(c => c.id === condoToDelete)?.name}&quot;</span> (unità, spese, incassi) andranno persi definitivamente.
                  </p>
                  <p className="text-red-500 font-bold text-[9px] uppercase tracking-widest mt-6 bg-red-50 py-2 rounded-lg italic">L&apos;operazione è irreversibile</p>
                </div>
                <div className="flex gap-3 px-8 pb-8">
                  <Button 
                    variant="ghost" 
                    className="flex-1 h-12 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-widest"
                    onClick={() => setCondoToDelete(null)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    className="flex-1 bg-red-600 text-white hover:bg-red-700 h-12 rounded-xl font-black shadow-lg shadow-red-100 uppercase text-[10px] tracking-widest"
                    onClick={() => handleDeleteCondo(condoToDelete)}
                  >
                    Elimina Tutto
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
