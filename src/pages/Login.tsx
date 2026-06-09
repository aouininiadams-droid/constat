import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, googleProvider } from '../lib/firebase';
import { Shield, LogIn } from 'lucide-react';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      
      // Check if user has a profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        navigate('/');
      } else {
        // Rediriger vers l'inscription pour choisir un rôle
        navigate('/register');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-200">
            <Shield className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mission Dispatch</h1>
          <p className="text-slate-400 mt-2 font-medium">Connectez-vous via Google</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-sm font-bold border border-red-100 flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 text-slate-700 font-bold py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-50 group"
        >
          {loading ? (
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
              <span>Se connecter avec Google</span>
            </>
          )}
        </button>

        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
          <p className="text-sm text-slate-400 font-medium">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-blue-600 font-black hover:underline underline-offset-4 decoration-2">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
