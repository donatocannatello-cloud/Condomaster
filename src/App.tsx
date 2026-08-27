import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from '@/components/ui/sonner';
import { subscribeToAuth, getUserProfile, UserProfile, logout, updateRole } from './services/authService';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import CondoDashboard from './components/CondoDashboard';
import { Button, playBeep } from '@/components/ui/button';
import { LogOut, Building2, User as UserIcon, Loader2, Wallet, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAdminTab, setActiveAdminTab] = useState<'condos' | 'credits' | 'settings'>('condos');
  const [dashboardKey, setDashboardKey] = useState(0);

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Set a safety timeout for initial loading
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setAuthError("Tempo di caricamento scaduto. Controlla la connessione.");
      }
    }, 15000);

    const unsubscribe = subscribeToAuth(async (firebaseUser) => {
      try {
        setAuthError(null);
        setUser(firebaseUser);
        if (firebaseUser) {
          // Add a minor delay to ensure Firestore is ready
          const userProfile = await getUserProfile(firebaseUser.uid);
          if (userProfile) {
            setProfile(userProfile);
          } else {
            setAuthError("Impossibile caricare il profilo utente.");
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth sync error:", error);
        setAuthError("Errore durante la sincronizzazione dei dati.");
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setAuthError(null);
      setProfile(null);
      setUser(null);
      toast.success("Logout effettuato");
    } catch (error) {
      toast.error("Errore durante il logout");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-400 uppercase text-[10px] tracking-[0.3em] font-bold">Inizializzazione Sistema...</p>
      </div>
    );
  }

  if (authError && !profile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 mb-6">
          <Building2 className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Errore di Connessione</h2>
        <p className="text-slate-500 max-w-sm mb-8">{authError}</p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} className="bg-indigo-600 text-white rounded-xl px-8 hover:bg-indigo-700">Riprova</Button>
          <Button variant="outline" onClick={handleLogout} className="text-slate-600 border-slate-200">Esci</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 font-sans selection:bg-indigo-600 selection:text-white bg-slate-50">
      <Toaster position="top-right" />
      
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center min-h-screen p-4"
          >
            <Login onLoginSuccess={(p) => setProfile(p)} />
          </motion.div>
        ) : !profile ? (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 space-y-6">
            <div className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100 shadow-sm">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-slate-900 font-bold text-xl tracking-tight">Sincronizzazione Account</p>
              <p className="text-slate-400 uppercase text-[10px] tracking-widest font-bold mt-2">Attendere prego...</p>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 uppercase text-[9px] font-bold tracking-widest px-6 h-10 rounded-full"
            >
              Annulla e Esci
            </Button>
          </div>
        ) : (
          <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-sm">
              <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                 <div className="flex items-center gap-6">
                  <button 
                    onClick={() => {
                      playBeep();
                      setActiveAdminTab('condos');
                      setDashboardKey(prev => prev + 1);
                    }}
                    className="flex items-center gap-3 hover:opacity-80 active:scale-[0.97] transition-all cursor-pointer group"
                  >
                    <div className="bg-indigo-600 text-white p-2 rounded-full shadow-indigo-200 shadow-lg group-hover:scale-110 transition-transform">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-black tracking-tight hidden sm:block text-slate-900">
                      CondoMaster <span className="font-bold text-[10px] ml-1 text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-2 py-1 rounded">Pro</span>
                    </h1>
                  </button>

                  {profile?.role === 'admin' && (
                    <nav className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200">
                      <button 
                        onClick={() => {
                          playBeep();
                          setActiveAdminTab('condos');
                          setDashboardKey(prev => prev + 1);
                        }}
                        className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center active:scale-[0.93] ${
                          activeAdminTab === 'condos' 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                        }`}
                        title="I Miei Condomini"
                      >
                        <Building2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          playBeep();
                          setActiveAdminTab('credits');
                          setDashboardKey(prev => prev + 1);
                        }}
                        className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center active:scale-[0.93] ${
                          activeAdminTab === 'credits' 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                        }`}
                        title="Gestione Crediti"
                      >
                        <Wallet className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          playBeep();
                          setActiveAdminTab('settings');
                          setDashboardKey(prev => prev + 1);
                        }}
                        className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center active:scale-[0.93] ${
                          activeAdminTab === 'settings' 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                        }`}
                        title="Impostazioni Database"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    </nav>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-sm font-bold text-slate-900">{profile?.displayName}</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                        {profile?.role === 'admin' ? 'Amministratore' : 'Condomino'}
                      </span>
                      {profile?.role === 'condomino' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 rounded-full"
                          onClick={() => {
                            if (profile) {
                              updateRole(profile.uid, 'admin');
                              setProfile({...profile, role: 'admin'});
                              toast.success("Privilegi amministrativi attivati");
                            }
                          }}
                        >
                          PASS TO ADMIN
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </header>


            <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
              <motion.div
                key={profile?.role}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {profile?.role === 'admin' ? (
                  <div key={dashboardKey}>
                    <AdminDashboard 
                      profile={profile as UserProfile} 
                      activeTab={activeAdminTab as any} 
                      onTabChange={setActiveAdminTab}
                    />
                  </div>
                ) : (
                  <CondoDashboard profile={profile} />
                )}
              </motion.div>
            </main>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
