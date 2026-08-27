import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loginWithGoogle, UserProfile, updateRole } from '@/src/services/authService';
import { Building2, LogIn, ShieldCheck, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [needsRole, setNeedsRole] = useState<{ profile: UserProfile } | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const profile = await loginWithGoogle();
      onLoginSuccess(profile);
      toast.success(`Benvenuto, ${profile.displayName}`);
    } catch (error) {
      console.error(error);
      toast.error("Accesso fallito. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-none shadow-[0_30px_90px_rgba(0,0,0,0.12)] bg-white rounded-[3rem] overflow-hidden">
      <CardHeader className="space-y-4 text-center pb-12 pt-16 bg-slate-50 border-b border-slate-100">
        <div className="mx-auto bg-white p-5 rounded-[2rem] w-fit mb-2 shadow-2xl shadow-slate-200 border border-slate-100">
          <Building2 className="w-12 h-12 text-indigo-600" />
        </div>
        <div>
          <CardTitle className="text-4xl font-black tracking-tighter text-slate-900 uppercase">CondoMaster <span className="text-indigo-600">Pro</span></CardTitle>
          <CardDescription className="text-slate-400 font-black uppercase text-[10px] tracking-[0.25em] mt-3">
            Amministrazione Certificata Stabili
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-8 p-12">
        <Button 
          onClick={handleLogin} 
          disabled={loading}
          className="w-full h-16 text-lg font-black rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 border-none transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-indigo-100 uppercase tracking-widest"
        >
          {loading ? (
            "AUTENTICAZIONE..."
          ) : (
            <>
              <LogIn className="mr-3 h-6 w-6 stroke-[3]" /> ACCEDI CON GOOGLE
            </>
          )}
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black">
            <span className="bg-white text-slate-300 px-4">Standard Sicurezza</span>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-400 px-4 leading-relaxed uppercase font-black tracking-widest opacity-60">
          Google Identity Services • Criptaggio End-to-End
        </p>
      </CardContent>
    </Card>
  );
}
