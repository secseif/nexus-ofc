import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Lock, FileText, Download, Loader2, Check } from 'lucide-react';
import { generateFinancialInsight, generateMonthlyReportAnalysis } from '../services/geminiService';
import { Transaction, UserProfile, TransactionType } from '../types';
import { jsPDF } from 'jspdf';

interface ChatbotProps {
  user: UserProfile;
  transactions: Transaction[];
  onUpgrade: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isReport?: boolean;
}

const NexusLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 25V75" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
    <path d="M68 25V75" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
    <path d="M32 30L68 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
    <circle cx="68" cy="70" r="6" fill="#06b6d4" />
    <circle cx="32" cy="30" r="6" fill="#06b6d4" />
  </svg>
);

const Chatbot: React.FC<ChatbotProps> = ({ user, transactions, onUpgrade }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá. Sou o Nexus AI. Estou pronto para analisar seus dados com precisão. Em que posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [count, setCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MAX_FREE_MESSAGES = 5;
  const isLocked = user.plan === 'FREE' && count >= MAX_FREE_MESSAGES;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLocked) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await generateFinancialInsight(userMsg, transactions, user.plan);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setCount(prev => prev + 1);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Erro ao comunicar com o servidor." }]);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (user.plan === 'FREE') {
        onUpgrade();
        return;
    }
    
    setMessages(prev => [...prev, { role: 'user', content: "Gerar Relatório Completo em PDF" }]);
    setGeneratingPdf(true);

    try {
        const today = new Date();
        const month = today.getMonth();
        const year = today.getFullYear();

        // 1. Get AI Analysis Text
        const analysisText = await generateMonthlyReportAnalysis(transactions, month, year);

        // 2. Calculate Stats for Header
        const monthlyTrans = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
        const income = monthlyTrans.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
        const expense = monthlyTrans.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
        const balance = income - expense;

        // 3. Generate PDF using jsPDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);

        // --- Header ---
        doc.setFillColor(6, 182, 212); // Nexus Cyan
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text("NEXUS", margin, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("FINANCIAL INTELLIGENCE SYSTEM", margin, 26);
        
        doc.text(`RELATÓRIO MENSAL: ${today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}`, pageWidth - margin, 26, { align: 'right' });

        // --- Stats Bar ---
        doc.setFillColor(241, 245, 249); // Slate 100
        doc.rect(margin, 50, contentWidth, 30, 'F');
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.rect(margin, 50, contentWidth, 30, 'S');

        doc.setTextColor(30, 41, 59); // Slate 800
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        
        // Income
        doc.text("ENTRADAS", margin + 10, 60);
        doc.setTextColor(16, 185, 129); // Green
        doc.setFontSize(14);
        doc.text(`R$ ${income.toFixed(2)}`, margin + 10, 70);

        // Expense
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.text("SAÍDAS", margin + 70, 60);
        doc.setTextColor(239, 68, 68); // Red
        doc.setFontSize(14);
        doc.text(`R$ ${expense.toFixed(2)}`, margin + 70, 70);

        // Balance
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.text("RESULTADO", margin + 130, 60);
        doc.setTextColor(balance >= 0 ? 6 : 239, balance >= 0 ? 182 : 68, balance >= 0 ? 212 : 68); // Cyan or Red
        doc.setFontSize(14);
        doc.text(`R$ ${balance.toFixed(2)}`, margin + 130, 70);

        // --- Analysis Body ---
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("ANÁLISE DE INTELIGÊNCIA ARTIFICIAL", margin, 100);
        
        doc.setLineWidth(0.5);
        doc.setDrawColor(6, 182, 212);
        doc.line(margin, 103, margin + 100, 103);

        doc.setFontSize(11);
        doc.setFont('times', 'roman'); // More readable for body text
        doc.setTextColor(51, 65, 85); // Slate 700
        
        const splitText = doc.splitTextToSize(analysisText, contentWidth);
        doc.text(splitText, margin, 115);

        // --- Footer ---
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text("Este documento foi gerado automaticamente pelo Nexus AI.", pageWidth / 2, 280, { align: 'center' });
        doc.text(`${today.toLocaleString()}`, pageWidth / 2, 285, { align: 'center' });

        // Save
        const fileName = `Nexus_Report_${month+1}_${year}.pdf`;
        doc.save(fileName);

        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Relatório Financeiro Consolidado gerado com sucesso. O download deve iniciar automaticamente.",
            isReport: true
        }]);
        setCount(prev => prev + 1);

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'assistant', content: "Houve um erro ao renderizar o PDF. Tente novamente." }]);
    } finally {
        setGeneratingPdf(false);
    }
  };

  const QuickAction = ({ text, onClick, premiumOnly }: { text: string, onClick: () => void, premiumOnly?: boolean }) => (
    <button 
      disabled={isLocked && !premiumOnly} // Premium actions logic handled in handler
      onClick={onClick}
      className={`text-xs border rounded-full px-3 py-1 transition-colors whitespace-nowrap flex items-center gap-1
        ${premiumOnly 
            ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-purple-500/50 text-purple-400 hover:border-purple-400' 
            : 'bg-slate-800 hover:bg-slate-700 text-nexus-accent border-nexus-accent/30'}
      `}
    >
      {premiumOnly && <Lock size={10} />}
      {text}
    </button>
  );

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-nexus-accent hover:bg-nexus-accentDark text-nexus-900 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all duration-300 hover:scale-110"
      >
        {isOpen ? <X className="w-6 h-6" /> : <NexusLogo className="w-8 h-8 text-nexus-900" />}
      </button>

      {/* Chat Interface */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] md:w-[400px] h-[500px] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <h3 className="font-sans font-bold text-nexus-accent tracking-wider">NEXUS AI</h3>
            </div>
            {user.plan === 'FREE' && (
              <span className="text-xs text-slate-500 font-mono">
                {MAX_FREE_MESSAGES - count} créditos
              </span>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-nexus-accent/20 text-nexus-accent border border-nexus-accent/20 rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                }`}>
                  {msg.content}
                  {msg.isReport && (
                      <div className="mt-3 bg-slate-900 p-3 rounded-lg border border-slate-700 flex items-center gap-3 cursor-pointer hover:border-nexus-accent transition-colors">
                          <FileText className="w-8 h-8 text-nexus-accent" />
                          <div className="flex-1">
                              <div className="font-bold text-white">Relatório Consolidado</div>
                              <div className="text-xs text-slate-500">PDF • Inteligente</div>
                          </div>
                          <Check className="w-5 h-5 text-emerald-500" />
                      </div>
                  )}
                </div>
              </div>
            ))}
            {(loading || generatingPdf) && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl p-3 rounded-tl-none border border-slate-700 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-nexus-accent" />
                  <span className="text-xs text-slate-400">
                      {generatingPdf ? "Compilando relatório PDF..." : "Processando..."}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (only if not locked) */}
          {!isLocked && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none mask-linear-fade">
              <QuickAction text="Analisar mês" onClick={() => { setInput("Analisar gastos do mês atual"); }} />
              <QuickAction text="Relatório PDF" onClick={generateReport} premiumOnly={user.plan === 'FREE'} />
              <QuickAction text="Investimentos" onClick={() => { setInput("Como melhorar meus investimentos?"); }} />
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            {isLocked ? (
               <div className="flex flex-col items-center justify-center space-y-3 py-2">
                 <Lock className="w-6 h-6 text-nexus-warning" />
                 <p className="text-sm text-center text-slate-400">Limite Free atingido.</p>
                 <button 
                  onClick={onUpgrade}
                  className="w-full py-2 bg-gradient-to-r from-nexus-accent to-purple-600 rounded text-xs font-bold uppercase tracking-widest text-white"
                 >
                   Ver Planos Premium
                 </button>
               </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Digite sua dúvida..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-nexus-accent transition-colors text-white"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || loading || generatingPdf}
                  className="absolute right-2 top-2 p-1.5 bg-nexus-accent text-nexus-900 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;