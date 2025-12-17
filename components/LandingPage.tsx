import React, { useState } from 'react';
import { ArrowRight, Shield, TrendingUp, Cpu, Lock, X, Loader2, AlertCircle, Settings, Save, Brain, MessageSquare, CheckCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import LegalDocs from './LegalDocs';

// Logo Component
const NexusLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 25V75" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
    <path d="M68 25V75" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
    <path d="M32 30L68 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
    <circle cx="68" cy="70" r="6" fill="#06b6d4" />
    <circle cx="32" cy="30" r="6" fill="#06b6d4" />
  </svg>
);

const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalDocType, setLegalDocType] = useState<'TERMS' | 'PRIVACY' | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === 'REGISTER') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name
            }
          }
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Ocorreu um erro. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans relative">
      
      <LegalDocs type={legalDocType} onClose={() => setLegalDocType(null)} />

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-8 relative shadow-2xl">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center mb-6">
              <NexusLogo className="w-12 h-12 text-nexus-accent mb-2" />
              <h2 className="text-2xl font-display font-bold text-white">
                {authMode === 'LOGIN' ? 'Acessar Sistema' : 'Criar Conta'}
              </h2>
              <p className="text-slate-400 text-sm">
                {authMode === 'LOGIN' ? 'Bem-vindo de volta ao Nexus.' : 'Inicie sua jornada financeira.'}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-xs flex items-start gap-2 mb-4">
                <AlertCircle size={16} className="shrink-0 mt-0.5" /> 
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'REGISTER' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-nexus-accent outline-none transition-colors"
                    placeholder="Ex: Ana Silva"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-nexus-accent outline-none transition-colors"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-nexus-accent outline-none transition-colors"
                  placeholder="******"
                />
              </div>

              <div className="text-xs text-slate-500 text-center px-4">
                Ao continuar, você concorda com nossos <button type="button" onClick={() => setLegalDocType('TERMS')} className="text-nexus-accent hover:underline">Termos de Uso</button> e <button type="button" onClick={() => setLegalDocType('PRIVACY')} className="text-nexus-accent hover:underline">Política de Privacidade</button>.
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-nexus-accent text-nexus-900 font-bold font-display uppercase tracking-widest rounded-lg hover:bg-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {authMode === 'LOGIN' ? 'Entrar' : 'Cadastrar'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {authMode === 'LOGIN' ? (
                <>
                  Ainda não tem conta?{' '}
                  <button onClick={() => setAuthMode('REGISTER')} className="text-nexus-accent hover:underline font-bold">
                    Criar gratuitamente
                  </button>
                </>
              ) : (
                <>
                  Já tem uma conta?{' '}
                  <button onClick={() => setAuthMode('LOGIN')} className="text-nexus-accent hover:underline font-bold">
                    Fazer Login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed w-full z-50 bg-[#020617]/80 backdrop-blur-md border-b border-slate-800">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NexusLogo className="w-10 h-10 text-white" />
            <span className="text-2xl font-display font-bold tracking-widest text-white">NEXUS</span>
          </div>
          <div className="flex gap-4 items-center">
             <button 
              onClick={() => { setAuthMode('LOGIN'); setShowAuthModal(true); }}
              className="px-6 py-2 rounded-full border border-nexus-accent text-nexus-accent hover:bg-nexus-accent/10 transition-all text-sm font-medium uppercase tracking-wider hidden md:block"
            >
              Entrar
            </button>
            <button 
              onClick={() => { setAuthMode('REGISTER'); setShowAuthModal(true); }}
              className="px-6 py-2 rounded-full bg-nexus-accent text-[#020617] hover:bg-nexus-accentDark transition-all text-sm font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              Começar Agora
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col pt-20">
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          {/* Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>
          
          <div className="container mx-auto px-6 text-center relative z-10">
            <h1 className="text-4xl md:text-7xl font-display font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-300 to-nexus-accent leading-tight">
              Inteligência Emocional<br />Aplicada ao Dinheiro
            </h1>
            
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-10">
               <div className="flex items-center gap-2 text-slate-300"><MessageSquare size={18} className="text-nexus-accent"/> <span>IA que conversa</span></div>
               <div className="flex items-center gap-2 text-slate-300"><Brain size={18} className="text-nexus-accent"/> <span>Analisa contexto</span></div>
               <div className="flex items-center gap-2 text-slate-300"><TrendingUp size={18} className="text-nexus-accent"/> <span>Orienta decisões</span></div>
               <div className="flex items-center gap-2 text-slate-300"><Shield size={18} className="text-nexus-accent"/> <span>Coach financeiro digital</span></div>
               <div className="flex items-center gap-2 text-slate-300"><CheckCircle size={18} className="text-nexus-accent"/> <span>Assistente de decisões</span></div>
            </div>

            <button 
              onClick={() => { setAuthMode('REGISTER'); setShowAuthModal(true); }}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-nexus-900 transition-all duration-200 bg-nexus-accent font-display rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nexus-accent hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
            >
              INICIAR SISTEMA
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-slate-900/50">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-nexus-accent/50 transition-colors group">
                <Cpu className="w-12 h-12 text-nexus-accent mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-3 font-display">Histórico Emocional</h3>
                <p className="text-slate-400">Descubra como ansiedade, tédio ou empolgação afetam seu bolso. A NEXUS mapeia seus gatilhos.</p>
              </div>
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-nexus-accent/50 transition-colors group">
                <TrendingUp className="w-12 h-12 text-purple-500 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-3 font-display">Simulador de Futuro</h3>
                <p className="text-slate-400">"Se eu continuar gastando assim, onde estarei em 6 meses?" Visualize o impacto real das suas escolhas.</p>
              </div>
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-nexus-accent/50 transition-colors group">
                <Shield className="w-12 h-12 text-emerald-500 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-3 font-display">Alerta de Autossabotagem</h3>
                <p className="text-slate-400">A IA detecta padrões de compras impulsivas e te avisa antes que você cometa o mesmo erro.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-8 border-t border-slate-800 bg-[#020617] text-center text-slate-500 text-sm">
        <div className="flex justify-center gap-6 mb-4">
          <button onClick={() => setLegalDocType('TERMS')} className="hover:text-nexus-accent transition-colors">Termos de Uso</button>
          <button onClick={() => setLegalDocType('PRIVACY')} className="hover:text-nexus-accent transition-colors">Política de Privacidade</button>
        </div>
        <p>&copy; 2024 NEXUS Financial Systems. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;