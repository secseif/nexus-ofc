import React, { useState } from 'react';
import { Calculator, CheckCircle, AlertTriangle, Brain, AlertOctagon, Heart } from 'lucide-react';
import { Transaction, TransactionType, Importance, Emotion } from '../types';

interface DecisionSupportProps {
  transactions: Transaction[];
}

const DecisionSupport: React.FC<DecisionSupportProps> = ({ transactions }) => {
  const [amount, setAmount] = useState<number>(0);
  const [importance, setImportance] = useState<Importance | ''>('');
  const [emotion, setEmotion] = useState<Emotion | ''>('');
  const [result, setResult] = useState<any>(null);

  const analyzePurchase = () => {
    if (amount <= 0 || !importance || !emotion) return;

    // 1. Calculate Financial Health
    const today = new Date();
    const currentMonth = today.getMonth();
    const monthlyIncome = transactions
      .filter(t => t.type === TransactionType.INCOME && new Date(t.date).getMonth() === currentMonth)
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE && new Date(t.date).getMonth() === currentMonth)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const freeBalance = Math.max(0, monthlyIncome - monthlyExpense);
    const impactPercentage = freeBalance > 0 ? (amount / freeBalance) * 100 : 100;

    // 2. Self-Sabotage Check (Pattern Recognition)
    const similarBadPurchases = transactions.filter(t => 
        t.type === TransactionType.EXPENSE && 
        t.emotion === emotion && 
        [Emotion.IMPULSIVE, Emotion.ANXIOUS, Emotion.SAD, Emotion.BORED].includes(emotion as Emotion)
    ).length;

    // 3. Determine Risk Logic
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let emotionalAlert = '';
    let realImpact = '';
    let alternative = '';

    // High Risk Triggers
    if (similarBadPurchases >= 3) {
        riskLevel = 'HIGH';
        emotionalAlert = `ALERTA DE AUTOSSABOTAGEM: Você já fez ${similarBadPurchases} compras motivadas por ${emotion}. Esse padrão costuma gerar arrependimento.`;
        alternative = "Pausa obrigatória: Espere 48 horas. Se for autossabotagem, a vontade vai passar.";
    } 
    else if (importance === Importance.DESIRE && [Emotion.IMPULSIVE, Emotion.ANXIOUS, Emotion.BORED, Emotion.SAD].includes(emotion as Emotion)) {
        riskLevel = 'HIGH';
        emotionalAlert = `Cuidado! Detectamos um padrão de compensação emocional. Você está comprando porque se sente ${emotion}, não porque precisa.`;
        alternative = "Regra das 24h: Adie essa compra para amanhã. Se a vontade passar, era apenas uma emoção passageira.";
    } 
    else if (importance === Importance.DESIRE && impactPercentage > 30) {
        riskLevel = 'MEDIUM';
        emotionalAlert = "A empolgação pode estar mascarando o impacto financeiro real.";
        alternative = "Que tal esperar o próximo fechamento do cartão ou juntar o valor para pagar à vista com desconto?";
    }
    else if (importance === Importance.NEED) {
        riskLevel = 'LOW';
        emotionalAlert = "Compra racional alinhada com necessidades vitais.";
        alternative = freeBalance >= amount ? "Pode comprar à vista." : "Se necessário, parcele no menor número de vezes possível.";
    }
    else {
        riskLevel = 'MEDIUM';
        emotionalAlert = "Analise se este gasto trará satisfação duradoura ou momentânea.";
        alternative = "Verifique se há itens semelhantes que você já possui e não usa.";
    }

    if (freeBalance < amount) {
        realImpact = `ALERTA VERMELHO: Você não tem saldo livre. Essa compra aumentará sua dívida ou consumirá reservas.`;
    } else {
        realImpact = `Essa compra consome ${impactPercentage.toFixed(1)}% do seu saldo livre deste mês.`;
    }

    setResult({ riskLevel, emotionalAlert, realImpact, alternative });
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-4xl">
      
      {/* HEADER */}
      <div className="mb-2">
        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-white uppercase tracking-wide">Inteligência Artificial</h2>
        <p className="text-slate-500 text-sm">Ferramentas avançadas para tomada de decisão.</p>
      </div>

      <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5"><Brain size={150} className="text-slate-900 dark:text-white" /></div>
            
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10 text-slate-800 dark:text-white">
            <Brain className="text-nexus-accent" />
            Assistente de Decisão de Compra
            </h3>

            <div className="grid grid-cols-1 gap-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">Valor (R$)</label>
                        <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none text-lg font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-2 flex items-center gap-1"><AlertOctagon size={12}/> Importância</label>
                        <select 
                        value={importance}
                        onChange={(e) => setImportance(e.target.value as Importance)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none"
                        >
                        <option value="">Selecione...</option>
                        <option value={Importance.NEED}>Necessidade (Vital)</option>
                        <option value={Importance.DESIRE}>Desejo (Supérfluo)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-2 flex items-center gap-1"><Heart size={12}/> O que você está sentindo agora?</label>
                    <select 
                    value={emotion}
                    onChange={(e) => setEmotion(e.target.value as Emotion)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none"
                    >
                    <option value="">Selecione a emoção...</option>
                    {Object.values(Emotion).map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
            </div>

            <button 
            onClick={analyzePurchase}
            disabled={amount <= 0 || !importance || !emotion}
            className="w-full mt-8 py-4 bg-nexus-accent text-nexus-900 font-bold font-display rounded-xl hover:bg-nexus-accentDark hover:text-white transition-all uppercase tracking-widest disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.3)] relative z-10"
            >
            Analisar Impacto
            </button>

            {result && (
                <div className="mt-8 space-y-4 animate-in slide-in-from-bottom-4 relative z-10">
                    <div className={`p-5 rounded-xl border-l-4 ${
                        result.riskLevel === 'HIGH' ? 'bg-red-100 dark:bg-red-900/20 border-red-500' : 
                        result.riskLevel === 'MEDIUM' ? 'bg-amber-100 dark:bg-amber-900/20 border-amber-500' : 
                        'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-500'
                    }`}>
                        <h3 className={`font-bold uppercase text-xs mb-2 flex items-center gap-2 ${
                            result.riskLevel === 'HIGH' ? 'text-red-600 dark:text-red-400' : 
                            result.riskLevel === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400' : 
                            'text-emerald-600 dark:text-emerald-400'
                        }`}>
                            {result.riskLevel === 'HIGH' ? <AlertTriangle size={16}/> : result.riskLevel === 'MEDIUM' ? <AlertTriangle size={16}/> : <CheckCircle size={16}/>}
                            Diagnóstico da IA
                        </h3>
                        <p className="text-slate-800 dark:text-white font-medium text-lg leading-tight">{result.emotionalAlert}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold uppercase text-xs text-blue-500 dark:text-blue-400 mb-2 flex items-center gap-2"><Calculator size={14}/> Impacto Financeiro</h3>
                            <p className="text-slate-700 dark:text-slate-300 text-sm">{result.realImpact}</p>
                        </div>
                        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold uppercase text-xs text-nexus-accent mb-2 flex items-center gap-2"><Brain size={14}/> Sugestão</h3>
                            <p className="text-slate-700 dark:text-slate-300 text-sm italic">"{result.alternative}"</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default DecisionSupport;