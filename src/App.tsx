import React, { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { getLocalProfile } from './services/authService';
import AdminDashboard from './components/AdminDashboard';
import { Building2, Wallet, Settings } from 'lucide-react';

export default function App() {
  const [profile] = useState(getLocalProfile());
  const [activeAdminTab, setActiveAdminTab] = useState<'condos' | 'credits' | 'settings'>('condos');
  const [dashboardKey, setDashboardKey] = useState(0);

  return (
    <div className="min-h-screen text-slate-900 font-sans selection:bg-indigo-600 selection:text-white bg-slate-50">
      <Toaster position="top-right" />

      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-sm">
          <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => {
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

              <nav className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => { setActiveAdminTab('condos'); setDashboardKey(prev => prev + 1); }}
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
                  onClick={() => { setActiveAdminTab('credits'); setDashboardKey(prev => prev + 1); }}
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
                  onClick={() => { setActiveAdminTab('settings'); setDashboardKey(prev => prev + 1); }}
                  className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center active:scale-[0.93] ${
                    activeAdminTab === 'settings'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                  }`}
                  title="Impostazioni"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-slate-900">{profile.displayName}</span>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                  Amministratore
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div key={dashboardKey}>
            <AdminDashboard
              profile={profile}
              activeTab={activeAdminTab}
              onTabChange={setActiveAdminTab}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
