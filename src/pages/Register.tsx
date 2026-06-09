import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserRole } from '../types';
import { Shield, Briefcase, Bike } from 'lucide-react';

export default function Register() {
  const [role, setRole] = useState<UserRole>('agent');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      // Always update/create user doc with the selected role during registration flow
      await setDoc(doc(db, 'users', user.uid), {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        role,
        isOnline: false,
        createdAt: new Date().toISOString(),
      });

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to register with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-200">
            <Shield className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Créer un compte</h1>
          <p className="text-slate-400 mt-2 font-medium">Rejoignez le réseau de dispatching</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-xs font-bold border border-red-100 flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
            {error}
          </div>
        )}

        <div className="space-y-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Choisissez votre rôle</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('dispatch')}
                className={`flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all duration-300 ${
                  role === 'dispatch' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-xl shadow-blue-100 scale-105' 
                    : 'border-slate-100 text-slate-300 hover:border-slate-200 hover:translate-y-[-2px]'
                }`}
              >
                <div className={`p-3 rounded-xl mb-3 ${role === 'dispatch' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-300'}`}>
                    <Briefcase className="w-6 h-6" />
                </div>
                <span className="font-bold text-xs uppercase tracking-tight">Dispatching</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('agent')}
                className={`flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all duration-300 ${
                  role === 'agent' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-xl shadow-blue-100 scale-105' 
                    : 'border-slate-100 text-slate-300 hover:border-slate-200 hover:translate-y-[-2px]'
                }`}
              >
                <div className={`p-3 rounded-xl mb-3 ${role === 'agent' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-300'}`}>
                    <Bike className="w-6 h-6" />
                </div>
                <span className="font-bold text-xs uppercase tracking-tight">Agent Terrain</span>
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleGoogleRegister}
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-0 invert" alt="Google" />
                  <span>S'inscrire avec Google</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
          <p className="text-sm text-slate-400 font-medium">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-blue-600 font-black hover:underline underline-offset-4 decoration-2">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
