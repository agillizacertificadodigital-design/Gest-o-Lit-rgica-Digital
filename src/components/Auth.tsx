import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, LogOut, Mail, Lock, User, Loader2 } from 'lucide-react';

interface AuthProps {
  onAuthSuccess?: () => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile name
        await updateProfile(user, { displayName: name });
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          userId: user.uid,
          email: user.email,
          createdAt: new Date().toISOString(),
          categorias: ['Entrada', 'Glória', 'Salmo', 'Aclamação', 'Ofertas', 'Santo', 'Cordeiro', 'Comunhão', 'Pós-Comunhão', 'Final'],
          temposLiturgicos: [] // Can be populated with default seasons
        });
      }
      onAuthSuccess?.();
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = 'Ocorreu um erro na autenticação.';
      if (err.code === 'auth/user-not-found') message = 'Usuário não encontrado.';
      if (err.code === 'auth/wrong-password') message = 'Senha incorreta.';
      if (err.code === 'auth/email-already-in-use') message = 'Este e-mail já está em uso.';
      if (err.code === 'auth/weak-password') message = 'A senha deve ter pelo menos 6 caracteres.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-blue-900 mb-2">
          {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
        </h2>
        <p className="text-slate-500 text-sm">
          {isLogin ? 'Faça login para acessar suas músicas e agenda.' : 'Cadastre-se para começar a gerenciar sua liturgia.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="wait">
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1"
            >
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Nome</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required={!isLogin}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 font-medium">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
          {isLogin ? 'Entrar' : 'Criar Conta'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm font-bold text-blue-600 hover:underline"
        >
          {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
        </button>
      </div>
    </div>
  );
}
