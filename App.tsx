import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Calendar, 
  Target, 
  Brain, 
  CreditCard, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  Download,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Check,
  Trash2,
  Moon,
  Sun,
  DollarSign,
  Globe,
  Flag,
  X,
  Save,
  Repeat,
  Layers,
  CalendarClock,
  Infinity,
  Receipt,
  Heart,
  ShieldCheck,
  AlertTriangle,
  PiggyBank,
  Lightbulb,
  Activity,
  Zap,
  EyeOff,
  Loader2,
  Lock,
  Sparkles,
  Rocket,
  Trophy,
  Medal,
  Crown,
  Award,
  GraduationCap,
  LineChart,
  RefreshCw,
  Percent,
  FileText,
  Shield,
  PartyPopper,
  Home,
  CheckCircle,
  Smartphone
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Transaction, TransactionType, Recurrence, Category, UserProfile, Goal, Emotion, InvestmentType, Badge, YieldType } from './types';
import LandingPage from './components/LandingPage';
import Chatbot from './components/Chatbot';
import DecisionSupport from './components/DecisionSupport';
import LegalDocs from './components/LegalDocs';
import { getRealTimeMarketData } from './services/geminiService';
import { supabase } from './services/supabaseClient';

// --- CONFIGURAÇÃO DE PAGAMENTO ---
const STRIPE_PRICE_ID = 'price_1SfEiaIsrIerydnuNIxOJMJb'; 

const formatCurrency = (value: number, currency: 'BRL' | 'USD' = 'BRL') => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: currency
  }).format(value);
};

// --- DATA MAPPERS (CORRECTED TO SNAKE_CASE FOR DB) ---

// Helper to clean undefined values but KEEP 0 and false
const cleanObject = (obj: any) => {
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') {
      newObj[key] = value;
    }
  });
  return newObj;
};

// 1. From DB to App (Reads snake_case, converts to camelCase)
const mapTransactionFromDB = (t: any): Transaction => ({
    ...t,
    pricePerUnit: t.price_per_unit || t.pricePerUnit,
    investmentType: t.investment_type || t.investmentType,
    yieldType: t.yield_type || t.yieldType,
    yieldRate: t.yield_rate || t.yieldRate,
    currentValue: t.current_value !== undefined ? t.current_value : (t.currentValue !== undefined ? t.currentValue : t.amount),
    purchaseDate: t.purchase_date || t.purchaseDate,
    amount: Number(t.amount)
});

const mapGoalFromDB = (g: any): Goal => ({
    ...g,
    targetAmount: Number(g.target_amount || g.targetAmount || 0),
    currentAmount: Number(g.current_amount || g.currentAmount || 0),
    deadline: g.deadline || new Date().toISOString()
});

// 2. To DB (Converts camelCase to snake_case for Supabase)
const mapTransactionToDB = (t: any) => {
    const base = {
        user_id: t.userId || t.user_id,
        description: t.description?.trim(),
        amount: Number(t.amount),
        type: t.type,
        category: t.category,
        subcategory: t.subcategory,
        date: t.date,
        recurrence: t.recurrence || 'NONE',
    };

    const extras: any = {};

    if (t.installments) extras.installments = t.installments;
    if (t.emotion) extras.emotion = t.emotion;

    if (t.type === 'INVESTMENT') {
        if (t.ticker) extras.ticker = t.ticker;
        if (t.quantity) extras.quantity = Number(t.quantity);
        
        // Use snake_case for DB columns
        if (t.pricePerUnit) extras.price_per_unit = Number(t.pricePerUnit);
        if (t.investmentType) extras.investment_type = t.investmentType;
        if (t.yieldType) extras.yield_type = t.yieldType;
        if (t.yieldRate) extras.yield_rate = Number(t.yieldRate);
        if (t.purchaseDate) extras.purchase_date = t.purchaseDate;
        
        // Current Value mapping
        if (t.currentValue !== undefined) extras.current_value = Number(t.currentValue);
        else extras.current_value = Number(t.amount);
    }

    return cleanObject({ ...base, ...extras });
};

const mapGoalToDB = (g: any) => {
    const base = {
        user_id: g.userId || g.user_id,
        title: g.title?.trim(),
        deadline: g.deadline,
        priority: g.priority,
        // Ensure snake_case for amounts
        target_amount: Number(g.targetAmount),
        current_amount: Number(g.currentAmount)
    };

    if (g.icon) (base as any).icon = g.icon;

    return cleanObject(base);
};

// Mapeamento de Subcategorias
const SUBCATEGORIES: Record<string, string[]> = {
  [Category.HOUSING]: ['Aluguel', 'Condomínio', 'Energia', 'Água', 'Internet', 'Manutenção', 'Mobília', 'IPTU'],
  [Category.FOOD]: ['Supermercado', 'Restaurante', 'Delivery', 'Lanche', 'Feira'],
  [Category.TRANSPORT]: ['Combustível', 'Uber/App', 'Ônibus/Metrô', 'Manutenção', 'IPVA/Seguro', 'Estacionamento'],
  [Category.HEALTH]: ['Farmácia', 'Consulta', 'Exames', 'Plano de Saúde', 'Academia', 'Terapia'],
  [Category.EDUCATION]: ['Faculdade', 'Escola', 'Cursos', 'Livros', 'Material Escolar'],
  [Category.LEISURE]: ['Streaming', 'Cinema', 'Viagem', 'Jogos', 'Bar/Festas', 'Hobbies'],
  [Category.SALARY]: ['Salário Mensal', 'Adiantamento', '13º Salário', 'Férias', 'Bônus'],
  [Category.FREELANCE]: ['Projeto Extra', 'Venda de Item', 'Consultoria', 'Dividendos'],
  [Category.INVESTMENT]: ['Aporte Mensal', 'Reinvestimento'],
  [Category.OTHERS]: ['Presentes', 'Doações', 'Imprevistos', 'Taxas Bancárias'],
  [Category.UTILITIES]: ['Celular', 'Gás', 'Serviços de Assinatura']
};

// --- GAMIFICATION DEFINITIONS ---
const LEVEL_DEFINITIONS = [
    { min: 0, max: 450, title: "Aprendiz Financeiro", color: "text-slate-400", icon: GraduationCap },
    { min: 451, max: 650, title: "Explorador de Renda", color: "text-emerald-400", icon: Search },
    { min: 651, max: 780, title: "Estrategista Nexus", color: "text-purple-400", icon: Brain },
    { min: 781, max: 850, title: "Magnata do Capital", color: "text-amber-400", icon: Crown },
    { min: 851, max: 1000, title: "Lenda do Sistema", color: "text-nexus-accent", icon: Trophy },
];

const BADGES_LIST: Badge[] = [
    {
        id: 'FIRST_STEP',
        title: 'Primeiro Passo',
        description: 'Registre sua primeira transação no sistema.',
        iconName: 'Flag',
        tier: 'BRONZE',
        condition: (t) => t.length > 0
    },
    {
        id: 'SAVER',
        title: 'Poupador Nato',
        description: 'Tenha mais Receitas do que Despesas no mês atual.',
        iconName: 'PiggyBank',
        tier: 'BRONZE',
        condition: (t) => {
            const inc = t.filter(x => x.type === TransactionType.INCOME).reduce((a,b)=>a+b.amount,0);
            const exp = t.filter(x => x.type === TransactionType.EXPENSE).reduce((a,b)=>a+b.amount,0);
            return inc > exp && inc > 0;
        }
    },
    {
        id: 'INVESTOR_INIT',
        title: 'Futuro Garantido',
        description: 'Faça seu primeiro investimento.',
        iconName: 'TrendingUp',
        tier: 'SILVER',
        condition: (t) => t.some(x => x.type === TransactionType.INVESTMENT)
    },
    {
        id: 'GOAL_SETTER',
        title: 'Visionário',
        description: 'Crie pelo menos uma Meta Financeira.',
        iconName: 'Target',
        tier: 'SILVER',
        condition: (t, g) => g.length > 0
    },
    {
        id: 'SCORE_MASTER',
        title: 'Score de Elite',
        description: 'Atinja um Score Financeiro acima de 800.',
        iconName: 'Activity',
        tier: 'GOLD',
        condition: (t, g, s) => s >= 800
    },
    {
        id: 'DIVERSIFIER',
        title: 'Diversificador',
        description: 'Invista em pelo menos 2 tipos diferentes de ativos (ex: Ações e Cripto).',
        iconName: 'PieChart',
        tier: 'GOLD',
        condition: (t) => {
            const types = new Set(t.filter(x => x.type === TransactionType.INVESTMENT).map(x => x.investmentType));
            return types.size >= 2;
        }
    },
    {
        id: 'WHALE',
        title: 'Baleia',
        description: 'Acumule mais de R$ 10.000 em investimentos totais.',
        iconName: 'Crown',
        tier: 'DIAMOND',
        condition: (t) => {
             const total = t.filter(x => x.type === TransactionType.INVESTMENT).reduce((a,b)=>a+b.amount,0);
             return total >= 10000;
        }
    }
];

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDangerModalOpen, setIsDangerModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.INCOME);
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    category: '',
    subcategory: '',
    date: new Date().toISOString().split('T')[0],
    recurrenceType: 'NONE' as 'NONE' | 'FIXED' | 'INSTALLMENTS',
    installments: 2 // Valor padrão para parcelas
  });

  // Goal Deposit State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Payment Simulation State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Legal Docs State
  const [legalDocType, setLegalDocType] = useState<'TERMS' | 'PRIVACY' | null>(null);

  // --- INITIALIZATION & DATA FETCHING ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        initUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        initUser(session.user);
      } else {
        setUser(null);
        setUserId(null);
        setTransactions([]);
        setGoals([]);
      }
    });

    // Check for Stripe success return
    const query = new URLSearchParams(window.location.search);
    if (query.get('success')) {
        setShowPaymentSuccess(true);
        window.history.replaceState({}, document.title, "/"); // Clean URL
    }

    return () => subscription.unsubscribe();
  }, []);

  const initUser = async (sessionUser: any) => {
    setUserId(sessionUser.id);
    
    // Fetch Profile from Supabase to get real Plan status
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

    const planType = profile?.plan_type || 'FREE';

    setUser({
      name: sessionUser.user_metadata.name || profile?.full_name || 'Usuário',
      email: sessionUser.email || '',
      plan: planType as 'FREE' | 'PREMIUM',
      financialScore: 750,
      chatUsage: 0,
      theme: 'dark',
      language: 'pt-BR',
      currency: 'BRL'
    });
    fetchData(sessionUser.id);
  };

  const fetchData = async (uid: string) => {
    setLoadingData(true);
    try {
        // Fetch Transactions
        const { data: transData, error: transError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', uid)
            .order('date', { ascending: true });
        
        if (transError) throw transError;
        if (transData) {
            setTransactions(transData.map(mapTransactionFromDB));
        }

        // Fetch Goals
        const { data: goalsData, error: goalsError } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', uid);
        
        if (goalsError) throw goalsError;
        if (goalsData) {
            setGoals(goalsData.map(mapGoalFromDB));
        }

    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoadingData(false);
    }
  };

  // --- ACTIONS (PERSISTENT) ---

  const handleUpgrade = async () => {
      if(!userId) return;
      setIsProcessingPayment(true);
      
      try {
          if (STRIPE_PRICE_ID.includes('XXXX')) {
              alert('O ID do produto da Stripe não foi configurado no código. Por favor, atualize o arquivo App.tsx.');
              setIsProcessingPayment(false);
              return;
          }

          // Chamada para a Supabase Edge Function (Back-end)
          const { data, error } = await supabase.functions.invoke('create-checkout-session', {
              body: { 
                  priceId: STRIPE_PRICE_ID, 
                  returnUrl: window.location.origin
              }
          });

          if (error) throw error;

          if (data?.url) {
              // Redireciona para o Checkout Seguro da Stripe
              window.location.href = data.url;
          } else {
              throw new Error("URL de pagamento não gerada.");
          }

      } catch (err) {
          console.error("Erro no pagamento:", err);
          alert("Erro ao conectar com o serviço de pagamentos. Verifique se o Back-end (Edge Function) está rodando e as chaves estão configuradas.");
          setIsCheckoutOpen(false);
      } finally {
          setIsProcessingPayment(false);
      }
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) {
        setGoals(prev => prev.filter(g => g.id !== id));
    } else {
        console.error("Error deleting goal:", error);
        alert(`Erro ao deletar meta: ${error.message}`);
    }
  };

  const handleOpenDeposit = (goal: Goal) => {
    setSelectedGoal(goal);
    setDepositAmount('');
    setIsDepositModalOpen(true);
  };

  const handleDepositToGoal = async () => {
    if (!selectedGoal || !depositAmount) return;
    const amount = Number(depositAmount);
    if (amount <= 0) return;

    // Send update in snake_case (DB Standard)
    const newAmount = selectedGoal.currentAmount + amount;

    const { error } = await supabase
        .from('goals')
        .update({ current_amount: newAmount }) 
        .eq('id', selectedGoal.id);

    if (!error) {
        setGoals(prev => prev.map(g => {
            if (g.id === selectedGoal.id) return { ...g, currentAmount: newAmount };
            return g;
        }));
        setIsDepositModalOpen(false);
        setSelectedGoal(null);
        setDepositAmount('');
    } else {
        console.error("Error depositing:", error);
        alert(`Erro ao depositar: ${error.message}`);
    }
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
        setTransactions(prev => prev.filter(t => t.id !== id));
    } else {
        console.error("Error deleting transaction:", error);
        alert(`Erro ao apagar: ${error.message}`);
    }
  };
  
  const handleClearData = async () => {
    if (!userId) return;
    
    // Batch delete
    await supabase.from('transactions').delete().eq('user_id', userId);
    await supabase.from('goals').delete().eq('user_id', userId);
    
    setTransactions([]);
    setGoals([]);
    
    // Optionally reset plan? No, keep plan.
    if (user) {
        setUser({
            ...user,
            financialScore: 750,
            chatUsage: 0,
            currency: 'BRL',
            language: 'pt-BR'
        });
    }
    setIsDangerModalOpen(false);
  };

  const openAddModal = (type: TransactionType) => {
    setModalType(type);
    const defaultCat = type === TransactionType.INCOME ? Category.SALARY : Category.FOOD;
    setNewTransaction({
        description: '',
        amount: '',
        category: defaultCat,
        subcategory: SUBCATEGORIES[defaultCat]?.[0] || '',
        date: new Date().toISOString().split('T')[0],
        recurrenceType: 'NONE',
        installments: 2
    });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (category: string) => {
    setNewTransaction({
      ...newTransaction,
      category,
      subcategory: SUBCATEGORIES[category]?.[0] || ''
    });
  };

  // --- UNIVERSAL ADD FUNCTIONS WITH MAPPING ---

  const handleSaveTransaction = async () => {
      if (!newTransaction.description || !newTransaction.amount || !userId) {
          alert('Por favor, preencha descrição e valor. Se o erro persistir, faça login novamente.');
          return;
      }

      // --- CHECK LIMITS FOR FREE USERS ---
      if (user?.plan === 'FREE') {
        if (modalType === TransactionType.EXPENSE) {
          const count = transactions.filter(t => t.type === TransactionType.EXPENSE).length;
          if (count >= 5) {
            alert('Limite de 5 despesas atingido no plano Gratuito. Faça upgrade para ilimitado.');
            setIsCheckoutOpen(true);
            return;
          }
        }
        if (modalType === TransactionType.INCOME) {
          const count = transactions.filter(t => t.type === TransactionType.INCOME).length;
          if (count >= 2) {
            alert('Limite de 2 rendas atingido no plano Gratuito. Faça upgrade para ilimitado.');
            setIsCheckoutOpen(true);
            return;
          }
        }
        // REMOVIDO BLOQUEIO DE INVESTIMENTOS PARA EXIBIR LAYOUT
        // if (modalType === TransactionType.INVESTMENT) { ... }
      }

      const baseTransaction = {
          userId: userId, 
          description: newTransaction.description,
          amount: Number(newTransaction.amount),
          type: modalType,
          category: newTransaction.category as Category,
          subcategory: newTransaction.subcategory,
          date: new Date(newTransaction.date).toISOString(),
          recurrence: newTransaction.recurrenceType === 'FIXED' ? Recurrence.MONTHLY : Recurrence.NONE,
      };

      const transactionsToInsert: any[] = [];

      if (newTransaction.recurrenceType === 'INSTALLMENTS' && newTransaction.installments > 1) {
          for (let i = 0; i < newTransaction.installments; i++) {
              const nextDate = new Date(newTransaction.date);
              nextDate.setMonth(nextDate.getMonth() + i);
              
              transactionsToInsert.push({
                  ...baseTransaction,
                  date: nextDate.toISOString(),
                  description: `${newTransaction.description} (${i + 1}/${newTransaction.installments})`,
                  recurrence: Recurrence.NONE,
                  installments: { current: i + 1, total: newTransaction.installments }
              });
          }
      } else {
          transactionsToInsert.push(baseTransaction);
      }

      // Map everything to snake_case before insert
      const mappedInserts = transactionsToInsert.map(t => mapTransactionToDB(t));

      console.log("Sending Transaction to DB:", mappedInserts); // DEBUG

      const { data, error } = await supabase
        .from('transactions')
        .insert(mappedInserts)
        .select();

      if (error) {
          console.error("Error saving transaction:", error);
          alert(`Erro ao salvar no banco de dados:\n${error.message}\n${error.details || ''}\nDica: Verifique se as colunas estão em snake_case (ex: user_id).`);
          return;
      }

      // Success
      if (data) {
          setTransactions(prev => [...prev, ...data.map(mapTransactionFromDB)]);
      } else {
          // If select() returns null but insert worked (due to RLS), fetch all again
          fetchData(userId);
      }
      setIsModalOpen(false);
  };

  const quickAddTransaction = async (txData: any) => {
      if(!userId) {
          alert('Erro: Usuário não autenticado. Tente recarregar a página.');
          return;
      }
      // Add userId and map to DB format
      const dbPayload = mapTransactionToDB({ ...txData, userId: userId });
      console.log("Quick Add Payload:", dbPayload); // DEBUG
      
      const { data, error } = await supabase
        .from('transactions')
        .insert([dbPayload])
        .select();
      
      if (error) {
          console.error("Quick Add Error:", error);
          alert(`Erro ao adicionar registro:\n${error.message}\n${error.details || ''}`);
          return;
      }

      if (data) {
          setTransactions(prev => [...prev, ...data.map(mapTransactionFromDB)]);
      } else {
          fetchData(userId);
      }
  };

  const quickAddBatchTransactions = async (txList: any[]) => {
      if(!userId) {
          alert('Erro: Usuário não autenticado.');
          return;
      }
      // Add userId and map ALL items to DB format
      const dbPayloads = txList.map(t => mapTransactionToDB({ ...t, userId: userId }));
      console.log("Batch Add Payload:", dbPayloads); // DEBUG

      const { data, error } = await supabase
        .from('transactions')
        .insert(dbPayloads)
        .select();
      
      if (error) {
          console.error("Batch Add Error:", error);
          alert(`Erro ao adicionar múltiplos registros:\n${error.message}`);
          return;
      }

      if (data) {
          setTransactions(prev => [...prev, ...data.map(mapTransactionFromDB)]);
      } else {
          fetchData(userId);
      }
  };

  // Calculate Score Helper
  const calculateScore = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthlyTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) || (t.recurrence === Recurrence.MONTHLY && tDate <= new Date(currentYear, currentMonth + 1, 0));
    });
    const monthlyIncome = monthlyTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const monthlyExpense = monthlyTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const totalInvested = transactions.filter(t => t.type === TransactionType.INVESTMENT).reduce((acc, t) => acc + t.amount, 0);
    const balance = monthlyIncome - monthlyExpense;

    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
    let score = 400; 
    if (balance > 0) score += 150;
    if (totalInvested > 0) score += 100;
    if (savingsRate > 20) score += 150;
    else if (savingsRate > 0) score += 50;
    if (monthlyExpense > monthlyIncome) score -= 100;
    return Math.min(Math.max(score, 0), 850);
  };
  
  const score = calculateScore();

  // --- SUB-COMPONENTS ---

  const SidebarItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
        activeTab === id 
        ? 'bg-nexus-accent/10 text-nexus-accent border-r-2 border-nexus-accent' 
        : 'text-slate-400 dark:text-slate-400 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  const MobileNavbar = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a] border-t border-slate-800 z-40 md:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        <button 
          onClick={() => setActiveTab('OVERVIEW')} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'OVERVIEW' ? 'text-nexus-accent' : 'text-slate-500'}`}
        >
          <Home size={20} />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('EXPENSES')} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'EXPENSES' ? 'text-nexus-accent' : 'text-slate-500'}`}
        >
          <TrendingDown size={20} />
          <span className="text-[10px] font-bold">Despesas</span>
        </button>
        <div className="relative -top-5">
            <button 
                onClick={() => setIsModalOpen(true)}
                className="w-12 h-12 bg-nexus-accent text-slate-900 rounded-full flex items-center justify-center shadow-lg shadow-nexus-accent/30 border-4 border-[#020617]"
            >
                <Plus size={24} strokeWidth={3} />
            </button>
        </div>
        <button 
          onClick={() => setActiveTab('GOALS')} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'GOALS' ? 'text-nexus-accent' : 'text-slate-500'}`}
        >
          <Target size={20} />
          <span className="text-[10px] font-bold">Metas</span>
        </button>
        <button 
          onClick={() => setActiveTab('PLANNING')} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'PLANNING' ? 'text-nexus-accent' : 'text-slate-500'}`}
        >
          <Calendar size={20} />
          <span className="text-[10px] font-bold">Calendário</span>
        </button>
      </div>
    </div>
  );

  const DashboardView = () => {
    if(loadingData) return <div className="h-full flex items-center justify-center text-nexus-accent"><Loader2 className="animate-spin w-8 h-8" /></div>;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 1. Balance Logic
    const validBalanceTransactions = transactions.filter(t => new Date(t.date) <= today);
    const totalIncome = validBalanceTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = validBalanceTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const totalInvested = validBalanceTransactions.filter(t => t.type === TransactionType.INVESTMENT).reduce((acc, t) => acc + (t.currentValue || t.amount), 0);
    
    const liquidCash = totalIncome - totalExpense - transactions.filter(t => t.type === TransactionType.INVESTMENT).reduce((acc, t) => acc + t.amount, 0); 
    const netWorth = liquidCash + totalInvested;

    // Monthly Logic
    const monthlyTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) || (t.recurrence === Recurrence.MONTHLY && tDate <= new Date(currentYear, currentMonth + 1, 0));
    });
    const monthlyIncome = monthlyTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const monthlyExpense = monthlyTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);

    const isPremium = user?.plan === 'PREMIUM';

    // Simplified Card Component for Mobile Grid
    const KpiCard = ({ label, value, icon: Icon, colorClass, bgClass, iconBgClass }: any) => (
      <div className={`p-4 rounded-2xl border border-slate-800 ${bgClass || 'bg-[#0f172a]'} relative overflow-hidden flex flex-col justify-between h-32`}>
         <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-tight w-2/3">{label}</span>
            <div className={`p-2 rounded-lg ${iconBgClass}`}>
                <Icon size={18} className={colorClass} />
            </div>
         </div>
         <div className={`text-xl font-bold ${colorClass}`}>
            {value}
         </div>
      </div>
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <KpiCard 
                label="Renda Mensal" 
                value={formatCurrency(monthlyIncome, user?.currency)} 
                icon={TrendingUp} 
                colorClass="text-emerald-500" 
                iconBgClass="bg-emerald-500/10"
            />
            <KpiCard 
                label="Despesas Mensais" 
                value={formatCurrency(monthlyExpense, user?.currency)} 
                icon={TrendingDown} 
                colorClass="text-red-500" 
                iconBgClass="bg-red-500/10"
            />
            <KpiCard 
                label="Saldo Total" 
                value={formatCurrency(netWorth, user?.currency)} 
                icon={DollarSign} 
                colorClass="text-blue-400" 
                iconBgClass="bg-blue-500/10"
            />
            {/* Gamification/Goals Slot */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-[#0f172a] relative overflow-hidden flex flex-col justify-between h-32" onClick={() => setActiveTab('GAMIFICATION')}>
                <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider w-2/3">Nível / Metas</span>
                    <div className="p-2 rounded-lg bg-purple-500/10">
                        <Target size={18} className="text-purple-500" />
                    </div>
                </div>
                <div>
                    <div className="text-xl font-bold text-purple-500">{score} pts</div>
                    <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${(score/850)*100}%` }}></div>
                    </div>
                </div>
            </div>
        </div>

        {/* RESTORED SECTION */}
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 font-display">Últimas Transações</h3>
                <div className="space-y-3">
                    {transactions.slice(0, 5).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    t.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 
                                    t.type === TransactionType.EXPENSE ? 'bg-red-500/10 text-red-500' : 'bg-purple-500/10 text-purple-500'
                                }`}>
                                    {t.type === TransactionType.INCOME ? <ArrowUpRight size={18} /> : t.type === TransactionType.EXPENSE ? <ArrowDownRight size={18} /> : <PieChart size={18}/>}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-slate-700 dark:text-white flex items-center gap-2">
                                        {t.description}
                                        {t.recurrence === Recurrence.MONTHLY && <span title="Fixo Mensal" className="flex items-center"><Infinity size={12} className="text-nexus-accent"/></span>}
                                        {t.installments && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white px-1.5 rounded">{t.installments.current}/{t.installments.total}</span>}
                                    </div>
                                    <div className="text-xs text-slate-500">{t.category} {t.subcategory && `• ${t.subcategory}`}</div>
                                </div>
                            </div>
                            <div className={`font-bold text-sm ${
                                t.type === TransactionType.INCOME ? 'text-emerald-500' : t.type === TransactionType.EXPENSE ? 'text-red-500' : 'text-purple-500'
                            }`}>
                                {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount, user?.currency)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                {/* Score Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-nexus-accent" />
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Saúde Financeira</h3>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="text-5xl font-black text-white tracking-tighter">{score}</div>
                        <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide font-bold">Pontuação Nexus</div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500" style={{width: `${(score/850)*100}%`}}></div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  };

  // ... (Other views logic remains, specifically restoring InvestmentView and GoalsView below)

  const IncomeView = () => {
    // ... (IncomeView logic unchanged from previous good state)
    const [localDesc, setLocalDesc] = useState('');
    const [localAmount, setLocalAmount] = useState('');
    const [localDate, setLocalDate] = useState(new Date().toISOString().split('T')[0]);
    const [isFixed, setIsFixed] = useState(false);
    const [duration, setDuration] = useState('');

    const today = new Date();
    const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const incomeTransactions = transactions.filter(t => {
        if (t.type !== TransactionType.INCOME) return false;
        if (t.recurrence === Recurrence.MONTHLY) return true;
        const tDate = new Date(t.date);
        return tDate <= endOfCurrentMonth; 
    });

    const handleAdd = () => {
        if (!localDesc || !localAmount || !userId) {
            alert('Preencha a descrição e o valor da renda.');
            return;
        }

        if (user?.plan === 'FREE' && incomeTransactions.length >= 2) {
            alert('Limite de 2 rendas atingido no plano Gratuito. Assine o Premium para ilimitado.');
            setIsCheckoutOpen(true);
            return;
        }

        const baseTransaction = {
            description: localDesc,
            amount: Number(localAmount),
            type: TransactionType.INCOME,
            category: Category.SALARY, 
            subcategory: 'Salário', 
            date: new Date(localDate).toISOString(),
            recurrence: isFixed ? Recurrence.MONTHLY : Recurrence.NONE,
        };

        const txList = [];
        const installments = duration ? parseInt(duration) : 0;

        if (installments > 1) {
             for (let i = 0; i < installments; i++) {
                const nextDate = new Date(localDate);
                nextDate.setMonth(nextDate.getMonth() + i);
                txList.push({
                    ...baseTransaction,
                    date: nextDate.toISOString(),
                    description: isFixed ? localDesc : `${localDesc} (${i + 1}/${installments})`,
                    recurrence: Recurrence.NONE, 
                });
             }
        } else {
            txList.push(baseTransaction);
        }

        quickAddBatchTransactions(txList);
        
        setLocalDesc('');
        setLocalAmount('');
        setLocalDate(new Date().toISOString().split('T')[0]);
        setIsFixed(false);
        setDuration('');
    };

    const hiddenFutureCount = transactions.filter(t => t.type === TransactionType.INCOME && new Date(t.date) > endOfCurrentMonth).length;

    return (
        <div className="space-y-8 animate-in fade-in max-w-5xl">
            <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wide">GERENCIAR RENDA</h2>
            <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xl">
                {/* Form fields same as before... */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-lg">
                        <DollarSign className="text-nexus-accent w-5 h-5" /> Adicionar Renda
                    </div>
                    {user?.plan === 'FREE' && (
                        <div className="text-xs font-bold text-slate-500 uppercase">
                            {incomeTransactions.length} / 2 Usados (Free)
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                    <div className="md:col-span-6"><input value={localDesc} onChange={e => setLocalDesc(e.target.value)} placeholder="Descrição" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none placeholder:text-slate-400 font-medium"/></div>
                    <div className="md:col-span-3"><input type="number" value={localAmount} onChange={e => setLocalAmount(e.target.value)} placeholder="Valor (R$)" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none font-bold placeholder:text-slate-400"/></div>
                    <div className="md:col-span-3"><input type="date" value={localDate} onChange={e => setLocalDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none [color-scheme:light] dark:[color-scheme:dark] font-medium"/></div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-t border-slate-200 dark:border-slate-800/50 pt-6">
                     <div className="flex flex-wrap items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={isFixed} onChange={e => setIsFixed(e.target.checked)} className="w-5 h-5 accent-nexus-accent bg-slate-50 dark:bg-slate-900 border-slate-700 rounded cursor-pointer"/><span className="text-slate-700 dark:text-white font-bold text-sm">Renda Fixa Mensal?</span></label>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800"><CalendarClock size={16} className="text-slate-500" /><span className="text-slate-500 text-sm">É temporária? (Opcional):</span><div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1"><span className="text-slate-500 text-xs mr-2">Ex:</span><input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="2" className="w-8 bg-transparent text-slate-800 dark:text-white text-sm outline-none font-bold text-center"/><span className="text-slate-500 text-xs ml-2">meses</span></div></div>
                     </div>
                     <button onClick={handleAdd} className="bg-nexus-accent hover:bg-nexus-accentDark text-nexus-900 font-bold px-8 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]">Confirmar</button>
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-end mb-4"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">RENDAS VIGENTES (MÊS ATUAL)</h3>{hiddenFutureCount > 0 && (<div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full"><EyeOff size={14}/> {hiddenFutureCount} lançamentos futuros ocultos (Ver Planejamento)</div>)}</div>
                {incomeTransactions.length === 0 ? (<div className="text-slate-600 text-sm italic">Nenhuma renda cadastrada para este mês.</div>) : (
                    incomeTransactions.map(t => (
                        <div key={t.id} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex justify-between items-center group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                            <div><div className="font-bold text-slate-800 dark:text-white text-base tracking-wide uppercase">{t.description}</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">{t.recurrence === Recurrence.MONTHLY ? 'Mensal' : 'Única'} • {new Date(t.date).toLocaleDateString()}</div></div>
                            <div className="flex items-center gap-6"><span className="font-bold text-emerald-500 text-lg">+ {formatCurrency(t.amount, user?.currency)}</span><button onClick={() => deleteTransaction(t.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Trash2 size={18} /></button></div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
  };

  const ExpenseView = () => {
    // ... (ExpenseView logic unchanged)
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<string>(Category.OTHERS);
    const [sub, setSub] = useState<string>('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [emotion, setEmotion] = useState<string>(Emotion.NEUTRAL);
    const [isFixed, setIsFixed] = useState(false);
    const [installments, setInstallments] = useState('');

    const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE);

    useEffect(() => {
        if (SUBCATEGORIES[category] && SUBCATEGORIES[category].length > 0) {
            setSub(SUBCATEGORIES[category][0]);
        } else {
            setSub('');
        }
    }, [category]);

    const handleAdd = () => {
        if (!desc || !amount || !userId) {
            alert('Preencha a descrição e o valor da despesa.');
            return;
        }
        if (user?.plan === 'FREE' && expenseTransactions.length >= 5) {
            alert('Limite de 5 despesas atingido no plano Gratuito. Assine o Premium para ilimitado.');
            setIsCheckoutOpen(true);
            return;
        }
        const baseTransaction = {
            description: desc,
            amount: Number(amount),
            type: TransactionType.EXPENSE,
            category: category as Category, 
            subcategory: sub, 
            date: new Date(date).toISOString(),
            recurrence: isFixed ? Recurrence.MONTHLY : Recurrence.NONE,
            emotion: emotion as Emotion
        };
        const txList = [];
        const numInstallments = installments ? parseInt(installments) : 1;
        if (numInstallments > 1 && !isFixed) {
             for (let i = 0; i < numInstallments; i++) {
                const nextDate = new Date(date);
                nextDate.setMonth(nextDate.getMonth() + i);
                txList.push({
                    ...baseTransaction,
                    date: nextDate.toISOString(),
                    description: `${desc} (${i + 1}/${numInstallments})`,
                    recurrence: Recurrence.NONE, 
                    installments: { current: i + 1, total: numInstallments }
                });
             }
        } else {
            txList.push(baseTransaction);
        }
        quickAddBatchTransactions(txList);
        setDesc(''); setAmount(''); setIsFixed(false); setInstallments('');
    };
    
    return (
        <div className="space-y-8 animate-in fade-in max-w-5xl">
            <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wide">CONTROLE DE DESPESAS</h2>
            <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xl relative overflow-hidden">
                {/* Form fields same as before... */}
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-lg"><CreditCard className="text-red-500 w-5 h-5" /> Registrar Despesa</div>
                    {user?.plan === 'FREE' && (
                        <div className="text-xs font-bold text-slate-500 uppercase">
                            {expenseTransactions.length} / 5 Usados (Free)
                        </div>
                    )}
                </div>
                <div className="space-y-4 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="O que você comprou?" className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-red-500 outline-none placeholder:text-slate-400 font-medium" />
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-red-500 outline-none font-bold placeholder:text-slate-400" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select value={category} onChange={e => setCategory(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-red-500 outline-none appearance-none">{Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <select value={sub} onChange={e => setSub(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-red-500 outline-none appearance-none">{SUBCATEGORIES[category]?.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-red-500 outline-none [color-scheme:light] dark:[color-scheme:dark]" />
                        <div className="flex flex-col"><label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 flex items-center gap-1"><Heart size={12}/> Sentimento</label><select value={emotion} onChange={e => setEmotion(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-red-500 outline-none appearance-none">{Object.values(Emotion).map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4 mt-2">
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={isFixed} onChange={e => { setIsFixed(e.target.checked); if(e.target.checked) setInstallments(''); }} className="w-5 h-5 accent-red-500 bg-slate-50 dark:bg-slate-900 border-slate-700 rounded cursor-pointer" /><span className="text-slate-700 dark:text-slate-300 font-medium text-sm">Gasto Fixo (Todo mês)?</span></label>
                            <div className={`flex items-center gap-2 transition-opacity ${isFixed ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}><span className="text-slate-500 text-sm">Ou parcelado em:</span><input type="number" value={installments} onChange={e => setInstallments(e.target.value)} placeholder="1x" className="w-16 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-slate-800 dark:text-white text-center text-sm font-bold focus:border-red-500 outline-none" /><span className="text-slate-500 text-sm">vezes</span></div>
                        </div>
                        <button onClick={handleAdd} className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] uppercase tracking-wide text-sm">Lançar Despesa</button>
                    </div>
                </div>
            </div>
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">HISTÓRICO RECENTE</h3>
                {expenseTransactions.length === 0 ? <div className="text-slate-600 text-sm italic">Nenhuma despesa registrada.</div> : expenseTransactions.slice().reverse().map(t => (
                        <div key={t.id} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex justify-between items-center group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                            <div><div className="font-bold text-slate-800 dark:text-white text-base tracking-wide uppercase flex items-center gap-2"><div className="w-1 h-4 bg-slate-500 rounded-full"></div>{t.description}</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-medium ml-3"><span>{new Date(t.date).toLocaleDateString()}</span><span className="w-1 h-1 bg-slate-600 rounded-full"></span><span className="text-nexus-accent">{t.subcategory || t.category}</span>{t.recurrence === Recurrence.MONTHLY && <span className="text-slate-400">• Fixo</span>}{t.installments && <span className="text-slate-400">• Parcela {t.installments.current}/{t.installments.total}</span>}</div></div>
                            <div className="flex items-center gap-6"><span className="font-bold text-red-500 text-lg">- {formatCurrency(t.amount, user?.currency)}</span><button onClick={() => deleteTransaction(t.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Trash2 size={18} /></button></div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
  };

  const PlanningView = () => {
    // ... (PlanningView logic unchanged)
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Limits: Free plan sees max 3 months ahead
    const today = new Date();
    
    const nextMonth = () => {
        const next = new Date(currentDate);
        next.setMonth(next.getMonth() + 1);
        
        if (user?.plan === 'FREE') {
            const diffMonths = (next.getFullYear() - today.getFullYear()) * 12 + (next.getMonth() - today.getMonth());
            if (diffMonths > 3) {
                alert('Planejamento de longo prazo (+3 meses) é exclusivo do Nexus Premium.');
                setIsCheckoutOpen(true);
                return;
            }
        }
        setCurrentDate(next);
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.value) return; const [year, month] = e.target.value.split('-').map(Number); setCurrentDate(new Date(year, month - 1, 1)); };
    const monthYearInputVal = currentDate.toISOString().slice(0, 7);
    const currentMonthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        const isSameMonth = tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
        const isRecurringMonthly = t.recurrence === Recurrence.MONTHLY && tDate <= new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        let isInstallmentActive = false;
        if (t.installments && t.installments.total > 1) {
             const startMonthIndex = tDate.getFullYear() * 12 + tDate.getMonth();
             const currentMonthIndex = currentDate.getFullYear() * 12 + currentDate.getMonth();
             const endMonthIndex = startMonthIndex + t.installments.total;
             isInstallmentActive = currentMonthIndex >= startMonthIndex && currentMonthIndex < endMonthIndex;
        }
        return (t.recurrence === Recurrence.NONE && !t.installments && isSameMonth) || isRecurringMonthly || isInstallmentActive;
    }).sort((a, b) => new Date(a.date).getDate() - new Date(b.date).getDate());
    const income = currentMonthTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = currentMonthTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const invest = currentMonthTransactions.filter(t => t.type === TransactionType.INVESTMENT).reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense - invest;

    return (
        <div className="space-y-8 animate-in fade-in max-w-6xl">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">LINHA DO TEMPO</h2>
            <div className="flex flex-col md:flex-row justify-between items-center bg-[#0b1120] p-4 rounded-xl border border-slate-800 gap-4 shadow-lg">
                <div className="flex items-center gap-6 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800"><button onClick={prevMonth} className="text-nexus-accent hover:text-white transition-colors"><ChevronLeft size={24} /></button><div className="flex flex-col items-center min-w-[140px]"><span className="text-white font-bold text-lg capitalize">{currentDate.toLocaleDateString('pt-BR', { month: 'long' })}</span><span className="text-slate-500 text-xs font-display tracking-widest">{currentDate.getFullYear()}</span></div><button onClick={nextMonth} className="text-nexus-accent hover:text-white transition-colors"><ChevronRight size={24} /></button></div>
                <div className="flex items-center gap-4"><div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800"><Calendar size={16} className="text-slate-400" /><input type="month" value={monthYearInputVal} onChange={handleDateChange} className="bg-transparent text-sm text-white outline-none p-1 [color-scheme:dark] font-medium" /></div><button className="flex items-center gap-2 px-4 py-2 bg-nexus-accent text-nexus-900 font-bold rounded-lg hover:bg-nexus-accentDark hover:text-white transition-colors text-sm uppercase tracking-wide"><Download size={16} /> Baixar PDF</button></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div className="bg-[#0b1120] border border-slate-800 p-6 rounded-xl text-center shadow-lg"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">ENTRADAS</p><h3 className="text-xl font-bold text-emerald-500">{formatCurrency(income, user?.currency)}</h3></div><div className="bg-[#0b1120] border border-slate-800 p-6 rounded-xl text-center shadow-lg"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">DESPESAS</p><h3 className="text-xl font-bold text-red-500">{formatCurrency(expense, user?.currency)}</h3></div><div className="bg-[#0b1120] border border-slate-800 p-6 rounded-xl text-center shadow-lg"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">INVESTIMENTOS</p><h3 className="text-xl font-bold text-purple-500">{formatCurrency(invest, user?.currency)}</h3></div><div className="bg-[#0b1120] border border-slate-800 p-6 rounded-xl text-center shadow-lg"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">SALDO FINAL</p><h3 className="text-xl font-bold text-nexus-accent">{formatCurrency(balance, user?.currency)}</h3></div></div>
            <div className="bg-[#0b1120] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800"><tr><th className="p-5 w-24">DIA</th><th className="p-5">DESCRIÇÃO</th><th className="p-5">CATEGORIA</th><th className="p-5 text-right">VALOR</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {currentMonthTransactions.length === 0 ? (<tr><td colSpan={4} className="p-8 text-center text-slate-500 italic">Nenhum registro para este período.</td></tr>) : (currentMonthTransactions.map(t => { let installmentText = ""; if (t.installments) { const startMonthIndex = new Date(t.date).getFullYear() * 12 + new Date(t.date).getMonth(); const currentMonthIndex = currentDate.getFullYear() * 12 + currentDate.getMonth(); const currentInstallment = (currentMonthIndex - startMonthIndex) + 1; installmentText = `${currentInstallment}/${t.installments.total}`; } return (<tr key={t.id} className="hover:bg-slate-900/50 transition-colors group"><td className="p-5 text-slate-500 font-mono text-xs">{new Date(t.date).getDate().toString().padStart(2, '0')}</td><td className="p-5"><div className="flex items-center gap-3"><span className="text-white font-bold uppercase text-xs tracking-wide">{t.description}</span>{installmentText && (<span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{installmentText}</span>)}{t.recurrence === Recurrence.MONTHLY && (<span className="text-[9px] bg-slate-800 text-nexus-accent px-1.5 py-0.5 rounded border border-slate-700 uppercase">Fixo</span>)}</div></td><td className="p-5"><div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">{t.category}</span><span className="text-[10px] text-nexus-accent uppercase mt-0.5">{t.subcategory || '-'}</span></div></td><td className={`p-5 text-right font-bold text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-500' : t.type === TransactionType.EXPENSE ? 'text-white' : 'text-purple-500'}`}>{t.type === TransactionType.EXPENSE ? '- ' : t.type === TransactionType.INCOME ? '+ ' : ''} {formatCurrency(t.amount, user?.currency)}</td></tr>); }))}
                    </tbody>
                </table>
            </div>
        </div>
    )
  }

  const InvestmentView = () => {
    // --- RESTORED FULL INVESTMENT LOGIC ---
    // REMOVIDO BLOQUEIO PREMIUM PARA EXIBIR LAYOUT
    const [invMode, setInvMode] = useState<'VARIABLE' | 'FIXED'>('VARIABLE');
    const [desc, setDesc] = useState('');
    const [ticker, setTicker] = useState('');
    const [amount, setAmount] = useState(''); // Total
    const [quantity, setQuantity] = useState('');
    const [pricePerUnit, setPricePerUnit] = useState('');
    
    // Fixed Income States
    const [yieldType, setYieldType] = useState<YieldType>(YieldType.CDI);
    const [yieldRate, setYieldRate] = useState('100'); // % do CDI ou Taxa Fixa

    const [invType, setInvType] = useState<InvestmentType>(InvestmentType.STOCKS);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [updatingQuotes, setUpdatingQuotes] = useState(false);
    const [marketRates, setMarketRates] = useState<{SELIC: number, CDI: number, IPCA: number} | null>(null);

    const handleAdd = () => {
       if (!desc) { alert("Preencha a descrição do ativo."); return; }
       
       let finalAmount = 0;
       if (invMode === 'VARIABLE') {
           finalAmount = Number(quantity) * Number(pricePerUnit);
       } else {
           finalAmount = Number(amount);
       }

       if (finalAmount <= 0) { alert("O valor do investimento deve ser maior que zero."); return; }

       const newInv: any = { 
           description: desc, 
           amount: finalAmount, 
           type: TransactionType.INVESTMENT, 
           category: Category.INVESTMENT, 
           subcategory: 'Aporte', 
           date: new Date(date).toISOString(), 
           recurrence: Recurrence.NONE,
           currentValue: finalAmount
       };

       if (invMode === 'VARIABLE') {
           newInv.ticker = ticker.toUpperCase();
           newInv.quantity = Number(quantity);
           newInv.pricePerUnit = Number(pricePerUnit);
           newInv.investmentType = invType;
       } else {
           newInv.investmentType = InvestmentType.FIXED_INCOME;
           newInv.yieldType = yieldType;
           newInv.yieldRate = Number(yieldRate);
       }

       quickAddTransaction(newInv); 
       setDesc(''); setTicker(''); setAmount(''); setQuantity(''); setPricePerUnit('');
    };

    const refreshQuotes = async () => {
        setUpdatingQuotes(true);
        const investmentTransactions = transactions.filter(t => t.type === TransactionType.INVESTMENT);
        const tickersToFetch = investmentTransactions.filter(t => t.ticker && t.ticker.length > 0).map(t => t.ticker!);

        const marketData = await getRealTimeMarketData(tickersToFetch);
        setMarketRates(marketData.rates);

        const updatedTransactions = investmentTransactions.map(t => {
            let newVal = t.currentValue || t.amount;
            if (t.ticker && t.quantity && marketData.prices[t.ticker]) {
                const currentPrice = marketData.prices[t.ticker];
                newVal = currentPrice * t.quantity;
            } 
            else if (t.yieldType && t.yieldRate && marketData.rates) {
                const purchaseDate = new Date(t.date);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - purchaseDate.getTime());
                const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
                
                let rate = 0;
                if (t.yieldType === YieldType.CDI) rate = marketData.rates.CDI;
                if (t.yieldType === YieldType.IPCA) rate = marketData.rates.IPCA;
                if (t.yieldType === YieldType.PRE) rate = t.yieldRate / 100;

                const adjustedRate = (t.yieldType === YieldType.PRE) ? rate : (rate * (t.yieldRate / 100));
                newVal = t.amount * Math.pow((1 + adjustedRate), diffYears);
            }
            return { ...t, currentValue: newVal };
        });

        const otherTrans = transactions.filter(t => t.type !== TransactionType.INVESTMENT);
        setTransactions([...otherTrans, ...updatedTransactions]);
        setUpdatingQuotes(false);
    };

    const investmentTransactions = transactions.filter(t => t.type === TransactionType.INVESTMENT);
    const totalInvested = investmentTransactions.reduce((acc, t) => acc + t.amount, 0);
    const currentTotal = investmentTransactions.reduce((acc, t) => acc + (t.currentValue || t.amount), 0);
    const profit = currentTotal - totalInvested;
    const profitPerc = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    const data = investmentTransactions.reduce((acc, t) => {
        const existing = acc.find(i => i.name === (t.investmentType || 'Outros'));
        if(existing) { existing.value += (t.currentValue || t.amount); } else { acc.push({ name: t.investmentType || 'Outros', value: t.currentValue || t.amount }) }
        return acc;
    }, [] as {name: string, value: number}[]);
    const COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#8b5cf6', '#ef4444'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in max-w-7xl">
            <h2 className="lg:col-span-3 text-2xl font-display font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-wide">CARTEIRA DE ATIVOS</h2>
            
            {/* LEFT COLUMN: CHARTS & STATS */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl relative flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">Alocação</h3>
                        <button onClick={refreshQuotes} disabled={updatingQuotes} className="text-xs flex items-center gap-1 text-nexus-accent border border-nexus-accent/30 px-3 py-1.5 rounded-lg hover:bg-nexus-accent/10 transition-colors disabled:opacity-50">
                            <RefreshCw size={12} className={updatingQuotes ? "animate-spin" : ""} /> {updatingQuotes ? "Buscando..." : "Atualizar"}
                        </button>
                    </div>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                                <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                    {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} formatter={(value: number) => formatCurrency(value, user?.currency)} />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                    {marketRates && (
                        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs grid grid-cols-3 gap-2 text-center">
                            <div><div className="text-slate-500 font-bold">SELIC</div><div className="text-nexus-accent font-bold">{(marketRates.SELIC * 100).toFixed(2)}%</div></div>
                            <div><div className="text-slate-500 font-bold">CDI</div><div className="text-nexus-accent font-bold">{(marketRates.CDI * 100).toFixed(2)}%</div></div>
                            <div><div className="text-slate-500 font-bold">IPCA</div><div className="text-nexus-accent font-bold">{(marketRates.IPCA * 100).toFixed(2)}%</div></div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                     <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                         <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">VALOR ATUAL</div>
                         <div className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(currentTotal, user?.currency)}</div>
                     </div>
                     <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                         <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">LUCRO / PREJUÍZO</div>
                         <div className={`text-2xl font-bold flex items-center gap-2 ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                             {profit >= 0 ? <ArrowUpRight size={24}/> : <ArrowDownRight size={24}/>}
                             {formatCurrency(profit, user?.currency)}
                         </div>
                         <div className={`text-xs font-bold mt-1 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                             {profitPerc.toFixed(2)}% de rentabilidade
                         </div>
                     </div>
                </div>
            </div>

            {/* RIGHT COLUMN: ADD & HISTORY */}
            <div className="lg:col-span-2 space-y-6">
                 {/* Add Form */}
                 <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl">
                    <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                        <button onClick={() => setInvMode('VARIABLE')} className={`text-sm font-bold pb-2 transition-colors ${invMode === 'VARIABLE' ? 'text-nexus-accent border-b-2 border-nexus-accent' : 'text-slate-500'}`}>Renda Variável</button>
                        <button onClick={() => setInvMode('FIXED')} className={`text-sm font-bold pb-2 transition-colors ${invMode === 'FIXED' ? 'text-nexus-accent border-b-2 border-nexus-accent' : 'text-slate-500'}`}>Renda Fixa</button>
                    </div>

                    <div className="space-y-4">
                        {/* Common Fields */}
                        <div className="grid grid-cols-[1fr_140px] gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Ativo / Descrição</label>
                                <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={invMode === 'VARIABLE' ? "Ex: Bitcoin, Petrobras" : "Ex: CDB Banco Inter"} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Data</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none [color-scheme:light] dark:[color-scheme:dark] font-bold text-sm" />
                            </div>
                        </div>

                        {/* Variable Mode Inputs */}
                        {invMode === 'VARIABLE' && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-left-2">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Ticker</label>
                                    <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="BTC" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none font-mono uppercase text-center" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Qtd</label>
                                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none font-bold" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Preço (Unit)</label>
                                    <input type="number" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none font-bold" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Tipo</label>
                                    <select value={invType} onChange={e => setInvType(e.target.value as InvestmentType)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none text-xs">
                                        <option value={InvestmentType.STOCKS}>Ações</option>
                                        <option value={InvestmentType.CRYPTO}>Cripto</option>
                                        <option value={InvestmentType.FII}>FIIs</option>
                                        <option value={InvestmentType.STOCKS_US}>Stocks EUA</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Fixed Mode Inputs */}
                        {invMode === 'FIXED' && (
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-right-2">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Valor Total</label>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none font-bold" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Indexador</label>
                                    <select value={yieldType} onChange={e => setYieldType(e.target.value as YieldType)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none">
                                        <option value={YieldType.CDI}>CDI</option>
                                        <option value={YieldType.IPCA}>IPCA</option>
                                        <option value={YieldType.PRE}>Pré</option>
                                    </select>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1 flex items-center gap-1">Taxa {yieldType === YieldType.PRE ? '% a.a.' : '%'}</label>
                                    <input type="number" value={yieldRate} onChange={e => setYieldRate(e.target.value)} placeholder={yieldType === YieldType.CDI ? "100" : "6"} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-slate-800 dark:text-white focus:border-nexus-accent outline-none font-bold" />
                                </div>
                                <div className="md:col-span-1 flex items-end">
                                    <div className="text-xs text-slate-500 mb-4 px-2">
                                        {yieldType === YieldType.CDI ? `${yieldRate}% do CDI` : yieldType === YieldType.IPCA ? `IPCA + ${yieldRate}%` : `${yieldRate}% ao ano`}
                                    </div>
                                </div>
                             </div>
                        )}

                        <button onClick={handleAdd} className="w-full bg-nexus-accent hover:bg-nexus-accentDark text-nexus-900 font-bold py-3.5 rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] mt-2 uppercase tracking-wider text-sm">
                            Confirmar Aporte
                        </button>
                    </div>
                 </div>

                 {/* History List */}
                 <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">ATIVOS EM CARTEIRA</h3>
                    <div className="space-y-3">
                        {investmentTransactions.length === 0 ? <div className="text-slate-600 text-sm italic">Nenhum aporte registrado.</div> : investmentTransactions.slice().reverse().map(t => {
                            const isProfit = (t.currentValue || t.amount) >= t.amount;
                            return (
                                <div key={t.id} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-nexus-accent/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-bold text-nexus-accent text-xs font-mono">
                                            {t.ticker || (t.investmentType === InvestmentType.FIXED_INCOME ? 'RF' : 'ATIVO')}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-white">{t.description}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                {t.quantity ? `${t.quantity} un @ ${formatCurrency(t.pricePerUnit || 0)}` : t.yieldType ? `${t.yieldRate}% ${t.yieldType}` : 'Manual'} 
                                                • {new Date(t.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-800 dark:text-white text-lg">{formatCurrency(t.currentValue || t.amount, user?.currency)}</div>
                                        {t.currentValue && t.currentValue !== t.amount && (
                                            <div className={`text-[10px] font-bold ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {isProfit ? '+' : ''}{formatCurrency(t.currentValue - t.amount)}
                                            </div>
                                        )}
                                        <button onClick={() => deleteTransaction(t.id)} className="absolute top-2 right-2 p-1 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 </div>
            </div>
        </div>
    )
  }

  const GoalsView = () => {
     // --- RESTORED FULL GOALS LOGIC (Emergency Fund Wizard) ---
     const [title, setTitle] = useState('');
     const [target, setTarget] = useState('');
     const [deadline, setDeadline] = useState('');
     
     // Emergency logic
     const [coverageMonths, setCoverageMonths] = useState(6);
     const calculateMonthlyExpense = () => { const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE); if (expenses.length === 0) return 0; const uniqueMonths = new Set(expenses.map(t => t.date.substring(0, 7))).size; const total = expenses.reduce((acc, t) => acc + t.amount, 0); return total / (uniqueMonths || 1); };
     const monthlyExpense = calculateMonthlyExpense();
     const emergencyTarget = monthlyExpense * coverageMonths;
     const hasEmergencyGoal = goals.some(g => g.title === 'Reserva de Emergência');
     const [localGoal, setLocalGoal] = useState({ title: '', amount: '', deadline: '', priority: 'MEDIUM' });

     const handleCreateGoal = async (isEmergency = false) => {
         if(!userId) {
             alert('Erro: Usuário não identificado. Recarregue a página.');
             return;
         }
         
         if (isEmergency) { 
            const newG = { 
                userId: userId, 
                title: 'Reserva de Emergência', 
                targetAmount: emergencyTarget, 
                currentAmount: 0, 
                deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), 
                priority: 'HIGH' 
            }; 
            const dbPayload = mapGoalToDB(newG);
            
            const { data, error } = await supabase.from('goals').insert([dbPayload]).select();
            if(error) {
                console.error("Error creating emergency goal:", error);
                alert(`Erro ao criar meta de emergência: ${error.message}`);
                return;
            }
            if(data) setGoals(prev => [...prev, mapGoalFromDB(data[0])]);
            else fetchData(userId);
            return; 
         }
         
         // Custom Goal Logic
         if (!localGoal.title || !localGoal.amount) {
             alert('Preencha o título e o valor da meta.');
             return;
         }
         const newG = { 
             userId: userId, 
             title: localGoal.title, 
             targetAmount: Number(localGoal.amount), 
             currentAmount: 0, 
             deadline: localGoal.deadline || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), 
             priority: localGoal.priority 
         };
         const dbPayload = mapGoalToDB(newG);

         const { data, error } = await supabase.from('goals').insert([dbPayload]).select();
         
         if (error) {
             console.error("Error creating goal:", error);
             alert(`Erro ao criar meta: ${error.message}`);
             return;
         }

         if (data) {
             setGoals(prev => [...prev, ...data.map(mapGoalFromDB)]);
             setLocalGoal({ title: '', amount: '', deadline: '', priority: 'MEDIUM' });
         } else {
             fetchData(userId);
             setLocalGoal({ title: '', amount: '', deadline: '', priority: 'MEDIUM' });
         }
     };

     return (
        <div className="space-y-8 animate-in fade-in max-w-5xl">
            <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wide">METAS E SONHOS</h2>
            {!hasEmergencyGoal && (<div className="bg-white dark:bg-[#0b1120] border border-nexus-accent/30 rounded-xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.05)]"><div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><ShieldCheck size={180} className="text-nexus-accent" /></div><div className="relative z-10"><div className="flex items-center gap-3 mb-4"><ShieldCheck className="text-nexus-accent w-6 h-6" /><h3 className="text-xl font-bold text-slate-800 dark:text-white">Sugestão Inteligente: Reserva de Emergência</h3></div><p className="text-slate-500 dark:text-slate-400 mb-8 max-w-2xl">Analisamos suas despesas fixas e variáveis. Sua média de gastos é de <strong className="text-slate-800 dark:text-white">{formatCurrency(monthlyExpense, user?.currency)}</strong>. Para sua segurança financeira, escolha quantos meses deseja cobrir:</p><div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 rounded-xl p-6 mb-8"><h4 className="flex items-center gap-2 text-nexus-accent text-xs font-bold uppercase tracking-wider mb-4"><Lightbulb size={14} /> Por que ter uma reserva?</h4><ul className="grid md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300"><li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>Evita endividamento com juros altos em imprevistos.</span></li><li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>Garante tranquilidade em caso de perda de emprego ou redução de renda.</span></li></ul></div><div className="flex flex-col md:flex-row md:items-end gap-8"><div><label className="block text-xs font-bold text-nexus-accent uppercase mb-3">Cobertura (Meses)</label><div className="flex flex-wrap gap-2">{[3, 6, 10, 12, 18].map(m => (<button key={m} onClick={() => setCoverageMonths(m)} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${coverageMonths === m ? 'bg-nexus-accent text-nexus-900 border-nexus-accent' : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-nexus-accent/50'}`}>{m} meses</button>))}</div></div><div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-3 min-w-[200px]"><div className="text-xs text-slate-500 font-bold uppercase mb-1">Meta Calculada</div><div className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(emergencyTarget, user?.currency)}</div></div><button onClick={() => handleCreateGoal(true)} className="bg-nexus-accent hover:bg-nexus-accentDark text-nexus-900 font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] uppercase tracking-wide text-sm flex-1 md:flex-none text-center">Criar Meta Agora</button></div></div></div>)}
            <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xl"><div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white font-bold text-lg"><Target className="text-nexus-accent w-6 h-6" /> Definir Nova Meta</div><div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6"><div><input value={localGoal.title} onChange={e => setLocalGoal({...localGoal, title: e.target.value})} placeholder="Objetivo (ex: Viagem, Carro)" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-slate-800 dark:text-white focus:border-nexus-accent outline-none font-medium placeholder:text-slate-400" /></div><div><input type="number" value={localGoal.amount} onChange={e => setLocalGoal({...localGoal, amount: e.target.value})} placeholder="0" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-slate-800 dark:text-white focus:border-nexus-accent outline-none font-bold placeholder:text-slate-400" /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Prazo Estimado</label><input type="date" value={localGoal.deadline} onChange={e => setLocalGoal({...localGoal, deadline: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-slate-800 dark:text-white focus:border-nexus-accent outline-none [color-scheme:light] dark:[color-scheme:dark]" /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Prioridade</label><select value={localGoal.priority} onChange={e => setLocalGoal({...localGoal, priority: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-slate-800 dark:text-white focus:border-nexus-accent outline-none appearance-none"><option value="HIGH">Alta Prioridade</option><option value="MEDIUM">Média</option><option value="LOW">Baixa</option></select></div></div><div className="pt-4 flex justify-end"><button onClick={() => handleCreateGoal(false)} className="bg-slate-800 hover:bg-nexus-accent hover:text-nexus-900 text-white font-bold px-10 py-4 rounded-xl transition-all border border-slate-700 hover:border-nexus-accent uppercase tracking-wide text-sm">Salvar Objetivo</button></div></div></div>
            <div><h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">METAS EM ANDAMENTO</h3><div className="grid md:grid-cols-2 gap-6">{goals.map(goal => { const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100); return (<div key={goal.id} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl relative group hover:border-slate-300 dark:hover:border-slate-600 transition-colors"><div className="absolute top-4 right-4 flex gap-2"><button onClick={() => handleOpenDeposit(goal)} className="p-2 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors flex items-center justify-center" title="Adicionar Valor"><Plus size={18} /></button><button onClick={() => deleteGoal(goal.id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir Meta"><Trash2 size={18} /></button></div><div className="flex justify-between items-start mb-4 pr-24"><div><h3 className="text-lg font-bold text-slate-800 dark:text-white">{goal.title}</h3><p className="text-xs text-slate-500 uppercase mt-1">Prazo: {new Date(goal.deadline).toLocaleDateString()}</p></div><div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${goal.priority === 'HIGH' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>{goal.priority === 'HIGH' ? 'Alta' : 'Normal'}</div></div><div className="flex justify-between text-sm mb-2 font-medium"><span className="text-emerald-500">{formatCurrency(goal.currentAmount, user?.currency)}</span><span className="text-slate-500">de {formatCurrency(goal.targetAmount, user?.currency)}</span></div><div className="w-full bg-slate-100 dark:bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 relative"><div className="h-full bg-gradient-to-r from-nexus-accent to-blue-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div></div><div className="text-right text-[10px] text-slate-500 mt-1 font-mono">{progress.toFixed(1)}% Concluído</div></div>)})}</div></div>
        </div>
     );
  };

  const GamificationView = () => {
       const userScore = score;
       const currentLevel = LEVEL_DEFINITIONS.find(l => userScore >= l.min && userScore <= l.max) || LEVEL_DEFINITIONS[0];
       const nextLevel = LEVEL_DEFINITIONS[LEVEL_DEFINITIONS.indexOf(currentLevel) + 1];

       return (
           <div className="space-y-8 animate-in fade-in max-w-5xl">
               <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 p-8 rounded-3xl relative overflow-hidden">
                   <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                       <div className="w-32 h-32 rounded-full bg-slate-950 border-4 border-nexus-accent flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                           <currentLevel.icon size={48} className={currentLevel.color} />
                       </div>
                       <div className="text-center md:text-left flex-1">
                           <h2 className="text-3xl font-display font-bold text-white mb-1">{currentLevel.title}</h2>
                           <p className="text-slate-400 mb-4">Mantenha bons hábitos para evoluir sua patente financeira.</p>
                           <div className="w-full bg-slate-950 h-4 rounded-full overflow-hidden border border-slate-700">
                               <div className="h-full bg-nexus-accent" style={{ width: `${(userScore / 1000) * 100}%` }}></div>
                           </div>
                           <div className="flex justify-between mt-2 text-xs font-bold text-slate-500 uppercase">
                               <span>{userScore} XP</span>
                               <span>{nextLevel ? nextLevel.min : 1000} XP</span>
                           </div>
                       </div>
                   </div>
               </div>

               <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wider">Conquistas & Medalhas</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {BADGES_LIST.map(badge => {
                       const isUnlocked = badge.condition(transactions, goals, userScore);
                       const Icon = {
                           'Flag': Flag, 'PiggyBank': PiggyBank, 'TrendingUp': TrendingUp, 
                           'Target': Target, 'Activity': Activity, 'PieChart': PieChart, 'Crown': Crown
                       }[badge.iconName] || Trophy;

                       return (
                           <div key={badge.id} className={`p-6 rounded-2xl border flex flex-col items-center text-center transition-all ${
                               isUnlocked 
                               ? 'bg-white dark:bg-[#0b1120] border-nexus-accent/50 shadow-lg shadow-nexus-accent/10' 
                               : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-50 grayscale'
                           }`}>
                               <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                                   badge.tier === 'GOLD' ? 'bg-yellow-500/20 text-yellow-500' :
                                   badge.tier === 'SILVER' ? 'bg-slate-400/20 text-slate-400' :
                                   badge.tier === 'DIAMOND' ? 'bg-cyan-500/20 text-cyan-500' :
                                   'bg-amber-700/20 text-amber-700'
                               }`}>
                                   <Icon size={24} />
                               </div>
                               <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{badge.title}</h4>
                               <p className="text-xs text-slate-500">{badge.description}</p>
                           </div>
                       );
                   })}
               </div>
           </div>
       );
  };

  const PlansView = () => (
      <div className="space-y-8 animate-in fade-in max-w-5xl">
          <div className="text-center mb-10">
              <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-white mb-3">Escolha seu Poder</h2>
              <p className="text-slate-500">Desbloqueie a inteligência artificial completa do Nexus.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col">
                  <div className="mb-6">
                      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider">Iniciante</span>
                  </div>
                  <h3 className="text-4xl font-bold text-slate-800 dark:text-white mb-2">Gratuito</h3>
                  <p className="text-slate-500 mb-8">Para quem está começando a se organizar.</p>
                  <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300"><Check size={16} className="text-emerald-500" /> Até 2 Rendas / 5 Despesas mensais</li>
                      <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300"><Check size={16} className="text-emerald-500" /> Dashboard Básico</li>
                      <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300"><Check size={16} className="text-emerald-500" /> 5 Interações com IA (Gemini Flash)</li>
                      <li className="flex items-center gap-3 text-sm text-slate-400"><X size={16} /> Sem Metas e Planejamento Futuro</li>
                      <li className="flex items-center gap-3 text-sm text-slate-400"><X size={16} /> Sem Relatórios PDF</li>
                  </ul>
                  <button className="w-full py-4 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-500 cursor-default">Plano Atual</button>
              </div>

              {/* Premium Plan */}
              <div className="bg-slate-900 border border-nexus-accent rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-2xl shadow-nexus-accent/20">
                  <div className="absolute top-0 right-0 p-3 bg-nexus-accent text-nexus-900 text-xs font-bold uppercase rounded-bl-2xl">Recomendado</div>
                  <div className="mb-6">
                      <span className="px-3 py-1 rounded-full bg-nexus-accent/20 text-nexus-accent text-xs font-bold uppercase tracking-wider">Pro</span>
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-2">R$ 29,90 <span className="text-lg text-slate-400 font-normal">/mês</span></h3>
                  <p className="text-slate-400 mb-8">Inteligência total sem limites.</p>
                  <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-sm text-white"><Check size={16} className="text-nexus-accent" /> <strong>Ilimitado:</strong> Rendas, Despesas e Metas</li>
                      <li className="flex items-center gap-3 text-sm text-white"><Check size={16} className="text-nexus-accent" /> <strong>Gemini 3.0 Pro:</strong> IA mais inteligente</li>
                      <li className="flex items-center gap-3 text-sm text-white"><Check size={16} className="text-nexus-accent" /> Relatórios PDF Profissionais</li>
                      <li className="flex items-center gap-3 text-sm text-white"><Check size={16} className="text-nexus-accent" /> Assistente de Decisão de Compra</li>
                      <li className="flex items-center gap-3 text-sm text-white"><Check size={16} className="text-nexus-accent" /> Planejamento Futuro Ilimitado</li>
                  </ul>
                  {user?.plan === 'PREMIUM' ? (
                      <button className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl cursor-default flex items-center justify-center gap-2"><CheckCircle size={20} /> ATIVO</button>
                  ) : (
                      <button onClick={() => setIsCheckoutOpen(true)} className="w-full py-4 bg-nexus-accent text-nexus-900 font-bold rounded-xl hover:bg-white transition-colors shadow-lg shadow-nexus-accent/20">QUERO SER PREMIUM</button>
                  )}
              </div>
          </div>
      </div>
  );

  const SettingsView = () => (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
          <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-6">Configurações</h2>
          
          <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-1">Perfil</h3>
                  <p className="text-sm text-slate-500">Informações da sua conta.</p>
              </div>
              <div className="p-6 space-y-4">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                      <div className="text-slate-800 dark:text-white font-medium">{user?.name}</div>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                      <div className="text-slate-800 dark:text-white font-medium">{user?.email}</div>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Plano Atual</label>
                      <div className={`font-bold ${user?.plan === 'PREMIUM' ? 'text-nexus-accent' : 'text-slate-500'}`}>{user?.plan}</div>
                  </div>
              </div>
          </div>

          <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-1">Personalização</h3>
                  <p className="text-sm text-slate-500">Adapte o sistema ao seu gosto.</p>
              </div>
              
              <div className="p-6 space-y-6">
                  {/* Theme Selector */}
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><Moon size={18} className="text-slate-600 dark:text-slate-300" /></div>
                          <span className="text-slate-800 dark:text-white font-medium text-sm">Tema Escuro / Claro</span>
                      </div>
                      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                          <button onClick={() => setUser(prev => prev ? ({ ...prev, theme: 'light' }) : null)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${user?.theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Claro</button>
                          <button onClick={() => setUser(prev => prev ? ({ ...prev, theme: 'dark' }) : null)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${user?.theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}>Escuro</button>
                      </div>
                  </div>

                  {/* Currency Selector */}
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><DollarSign size={18} className="text-slate-600 dark:text-slate-300" /></div>
                          <span className="text-slate-800 dark:text-white font-medium text-sm">Moeda Principal</span>
                      </div>
                      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                          <button onClick={() => setUser(prev => prev ? ({ ...prev, currency: 'BRL' }) : null)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${user?.currency === 'BRL' ? 'bg-white dark:bg-slate-700 text-nexus-accent shadow-sm' : 'text-slate-500'}`}>R$ Real</button>
                          <button onClick={() => setUser(prev => prev ? ({ ...prev, currency: 'USD' }) : null)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${user?.currency === 'USD' ? 'bg-white dark:bg-slate-700 text-nexus-accent shadow-sm' : 'text-slate-500'}`}>$ USD</button>
                      </div>
                  </div>

                  {/* Language Selector (Visual only for now) */}
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><Globe size={18} className="text-slate-600 dark:text-slate-300" /></div>
                          <span className="text-slate-800 dark:text-white font-medium text-sm">Idioma</span>
                      </div>
                      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                          <button onClick={() => setUser(prev => prev ? ({ ...prev, language: 'pt-BR' }) : null)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${user?.language === 'pt-BR' ? 'bg-white dark:bg-slate-700 text-nexus-accent shadow-sm' : 'text-slate-500'}`}>Português</button>
                          <button onClick={() => setUser(prev => prev ? ({ ...prev, language: 'en-US' }) : null)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${user?.language === 'en-US' ? 'bg-white dark:bg-slate-700 text-nexus-accent shadow-sm' : 'text-slate-500'}`}>English</button>
                      </div>
                  </div>
              </div>
          </div>

          <div className="border border-red-500/30 bg-red-500/5 rounded-xl overflow-hidden">
              <div className="p-6">
                  <h3 className="font-bold text-red-500 mb-2">Zona de Perigo</h3>
                  <p className="text-sm text-slate-500 mb-6">Ações irreversíveis que afetam seus dados.</p>
                  <button onClick={() => setIsDangerModalOpen(true)} className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors text-sm">
                      Apagar Todos os Dados
                  </button>
              </div>
          </div>
      </div>
  );

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className={`flex min-h-screen font-sans transition-colors duration-300 ${user.theme === 'dark' ? 'bg-[#020617] text-slate-200 dark' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Legal Docs Overlay (Always available if triggered) */}
      <LegalDocs type={legalDocType} onClose={() => setLegalDocType(null)} />

      {/* Payment Success Overlay */}
      {showPaymentSuccess && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
              <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-nexus-accent p-8 text-center relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.3)]">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-nexus-accent via-purple-500 to-emerald-500"></div>
                  <div className="mx-auto w-24 h-24 bg-nexus-accent/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                      <PartyPopper size={48} className="text-nexus-accent" />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-white mb-2">Parabéns!</h2>
                  <p className="text-slate-400 mb-8">Sua assinatura <strong>Premium</strong> foi ativada. Você desbloqueou todos os poderes da IA.</p>
                  <button 
                    onClick={() => setShowPaymentSuccess(false)}
                    className="w-full py-4 bg-nexus-accent text-nexus-900 font-bold rounded-xl hover:bg-white transition-all uppercase tracking-widest shadow-lg shadow-cyan-500/20"
                  >
                      Acessar Sistema
                  </button>
              </div>
          </div>
      )}

      {/* SIDEBAR (HIDDEN ON MOBILE) */}
      <aside className={`hidden md:flex w-64 fixed inset-y-0 left-0 border-r z-50 flex-col transition-colors duration-300 ${user.theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`h-20 flex items-center px-6 gap-3 border-b ${user.theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
           <div className="w-8 h-8 rounded bg-nexus-accent flex items-center justify-center text-[#020617] font-bold">N</div>
           <span className={`text-xl font-display font-bold tracking-widest ${user.theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>NEXUS</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem id="OVERVIEW" icon={LayoutDashboard} label="Visão Geral" />
          <SidebarItem id="INCOME" icon={TrendingUp} label="Rendas" />
          <SidebarItem id="EXPENSES" icon={TrendingDown} label="Despesas" />
          <SidebarItem id="INVESTMENTS" icon={PieChart} label="Investimentos" />
          <SidebarItem id="PLANNING" icon={Calendar} label="Planejamento" />
          <SidebarItem id="GOALS" icon={Target} label="Metas" />
          <SidebarItem id="GAMIFICATION" icon={Trophy} label="Conquistas" />
          <SidebarItem id="DECISION" icon={Brain} label="Decisão (IA)" />
          <SidebarItem id="PLANS" icon={CreditCard} label="Planos" />
          <SidebarItem id="SETTINGS" icon={Settings} label="Configurações" />
        </nav>

        <div className={`p-4 border-t ${user.theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
            <button 
                onClick={() => supabase.auth.signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
            >
                <LogOut size={18} /> Sair
            </button>
        </div>
      </aside>

      {/* MOBILE NAVBAR (SHOWN ON MOBILE) */}
      <MobileNavbar />

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 relative mb-20 md:mb-0">
         <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className={`text-2xl font-display font-bold capitalize ${user.theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {activeTab === 'OVERVIEW' ? 'Visão Geral' : 
                     activeTab === 'PLANNING' ? 'Planejamento Financeiro' :
                     activeTab === 'DECISION' ? 'Inteligência Artificial' :
                     activeTab === 'INCOME' ? 'Minhas Rendas' :
                     activeTab === 'EXPENSES' ? 'Minhas Despesas' :
                     activeTab === 'INVESTMENTS' ? 'Carteira de Ativos' :
                     activeTab === 'GOALS' ? 'Metas e Sonhos' :
                     activeTab === 'GAMIFICATION' ? 'Conquistas & Ranking' :
                     activeTab === 'PLANS' ? 'Assinatura' : 'Configurações'}
                </h1>
                <p className="text-slate-400 text-sm">Bem-vindo ao futuro do seu dinheiro, {user.name.split(' ')[0]}.</p>
            </div>
            <div className="flex items-center gap-4">
                {user.plan === 'PREMIUM' ? (
                    <div className="bg-gradient-to-r from-nexus-accent to-purple-600 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg shadow-purple-500/20">
                        <Sparkles size={14} className="text-white fill-white" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">PRO</span>
                    </div>
                ) : (
                    <button 
                        onClick={() => setActiveTab('PLANS')}
                        className={`border rounded-full px-4 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${user.theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                    >
                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${user.theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>FREE</span>
                    </button>
                )}
            </div>
         </header>

         {/* DYNAMIC CONTENT */}
         {activeTab === 'OVERVIEW' && <DashboardView />}
         {activeTab === 'PLANNING' && <PlanningView />}
         {activeTab === 'DECISION' && <DecisionSupport transactions={transactions} />}
         {activeTab === 'INCOME' && <IncomeView />}
         {activeTab === 'EXPENSES' && <ExpenseView />}
         {activeTab === 'INVESTMENTS' && <InvestmentView />}
         {activeTab === 'GOALS' && <GoalsView />}
         {activeTab === 'GAMIFICATION' && <GamificationView />}
         {activeTab === 'PLANS' && <PlansView />}
         {activeTab === 'SETTINGS' && <SettingsView />}
      </main>

      {/* CHECKOUT MODAL (Simulation) */}
      {isCheckoutOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
                  <div className="bg-slate-100 dark:bg-slate-950 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <Lock size={18} className="text-purple-500" />
                          <h3 className="font-bold text-slate-800 dark:text-white">Checkout Seguro</h3>
                      </div>
                      <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-500 hover:text-red-500">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                          <div>
                              <div className="text-sm text-slate-500">Assinatura Mensal</div>
                              <div className="text-lg font-bold text-slate-800 dark:text-white">Nexus Premium</div>
                          </div>
                          <div className="text-2xl font-bold text-purple-500">R$ 29,90</div>
                      </div>

                      <div className="space-y-4 mb-8">
                          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 cursor-pointer bg-slate-50 dark:bg-slate-800/50 border-nexus-accent ring-1 ring-nexus-accent">
                              <CreditCard className="text-nexus-accent" />
                              <div className="flex-1">
                                  <div className="font-bold text-sm text-slate-800 dark:text-white">Cartão de Crédito</div>
                                  <div className="text-xs text-slate-500">Via Stripe (Seguro)</div>
                              </div>
                              <div className="w-4 h-4 rounded-full bg-nexus-accent border-2 border-white"></div>
                          </div>
                      </div>

                      <button 
                          onClick={handleUpgrade}
                          disabled={isProcessingPayment}
                          className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                      >
                          {isProcessingPayment ? (
                              <>
                                <Loader2 className="animate-spin" /> Processando...
                              </>
                          ) : (
                              <>
                                <Lock size={16} /> Pagar e Ativar Agora
                              </>
                          )}
                      </button>
                      <p className="text-center text-[10px] text-slate-400 mt-4 flex items-center justify-center gap-1">
                          <ShieldCheck size={12} /> Pagamento 100% seguro pela Stripe
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* EXISTING MODALS */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                  
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                      {modalType === TransactionType.INCOME ? <TrendingUp size={120} /> : <TrendingDown size={120} />}
                  </div>

                  <div className="flex justify-between items-center mb-6 relative z-10">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          {modalType === TransactionType.INCOME ? <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><TrendingUp size={20}/></div> : <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><TrendingDown size={20}/></div>}
                          {modalType === TransactionType.INCOME ? 'Nova Renda' : modalType === TransactionType.EXPENSE ? 'Nova Despesa' : 'Novo Investimento'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-red-500 transition-colors bg-slate-800 p-2 rounded-full">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="space-y-5 relative z-10">
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Descrição</label>
                          <input 
                              type="text" 
                              value={newTransaction.description}
                              onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                              placeholder={modalType === TransactionType.INCOME ? "Ex: Salário, Freelance..." : "Ex: Mercado, Aluguel..."}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent transition-all font-medium"
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Valor (R$)</label>
                              <div className="relative">
                                  <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold">R$</span>
                                  <input 
                                      type="number" 
                                      value={newTransaction.amount}
                                      onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})}
                                      placeholder="0.00" 
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 pl-10 text-white outline-none focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent transition-all font-bold"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Data</label>
                              <input 
                                  type="date" 
                                  value={newTransaction.date}
                                  onChange={e => setNewTransaction({...newTransaction, date: e.target.value})}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent transition-all [color-scheme:dark]"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Categoria</label>
                              <div className="relative">
                                  <select 
                                      value={newTransaction.category}
                                      onChange={e => handleCategoryChange(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent transition-all appearance-none"
                                  >
                                      {Object.values(Category).map(c => (
                                          <option key={c} value={c}>{c}</option>
                                      ))}
                                  </select>
                                  <Layers size={16} className="absolute right-3.5 top-4 text-slate-500 pointer-events-none"/>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Subcategoria</label>
                              <div className="relative">
                                  <select 
                                      value={newTransaction.subcategory}
                                      onChange={e => setNewTransaction({...newTransaction, subcategory: e.target.value})}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent transition-all appearance-none"
                                      disabled={!newTransaction.category}
                                  >
                                      <option value="">Selecione...</option>
                                      {SUBCATEGORIES[newTransaction.category]?.map(sub => (
                                          <option key={sub} value={sub}>{sub}</option>
                                      ))}
                                  </select>
                                  <Layers size={16} className="absolute right-3.5 top-4 text-slate-500 pointer-events-none"/>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-950 rounded-xl p-1.5 flex border border-slate-800">
                          <button 
                            onClick={() => setNewTransaction({...newTransaction, recurrenceType: 'NONE'})}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${newTransaction.recurrenceType === 'NONE' ? 'bg-slate-800 text-nexus-accent shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                             <Check size={14} /> Única
                          </button>
                          <button 
                            onClick={() => setNewTransaction({...newTransaction, recurrenceType: 'FIXED'})}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${newTransaction.recurrenceType === 'FIXED' ? 'bg-slate-800 text-nexus-accent shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                             <Infinity size={14} /> Fixa
                          </button>
                          <button 
                            onClick={() => setNewTransaction({...newTransaction, recurrenceType: 'INSTALLMENTS'})}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${newTransaction.recurrenceType === 'INSTALLMENTS' ? 'bg-slate-800 text-nexus-accent shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                             <CalendarClock size={14} /> {modalType === TransactionType.INCOME ? 'Período' : 'Parcelado'}
                          </button>
                      </div>

                      {newTransaction.recurrenceType === 'INSTALLMENTS' && (
                          <div className="animate-in slide-in-from-top-2 fade-in">
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">
                                  {modalType === TransactionType.INCOME ? 'Receber por quantos meses?' : 'Número de Parcelas'}
                              </label>
                              <div className="flex items-center gap-3">
                                  <input 
                                      type="number" 
                                      min="2"
                                      max="60"
                                      value={newTransaction.installments}
                                      onChange={e => setNewTransaction({...newTransaction, installments: Number(e.target.value)})}
                                      className="w-24 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center text-white outline-none focus:border-nexus-accent font-bold"
                                  />
                                  <div className="text-xs text-slate-500 leading-tight flex-1">
                                      O sistema criará automaticamente <strong>{newTransaction.installments} lançamentos</strong> futuros para você.
                                  </div>
                              </div>
                          </div>
                      )}

                      <button 
                          onClick={handleSaveTransaction}
                          className="w-full py-4 bg-nexus-accent text-nexus-900 font-bold font-display uppercase tracking-widest rounded-xl hover:bg-nexus-accentDark hover:text-white transition-all flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                      >
                          <Save size={18} /> Confirmar Lançamento
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      {/* DEPOSIT TO GOAL MODAL */}
      {isDepositModalOpen && selectedGoal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-[#0f172a] w-full max-w-sm rounded-2xl border border-nexus-accent/30 p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                  <button 
                      onClick={() => setIsDepositModalOpen(false)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-white"
                  >
                      <X size={20} />
                  </button>

                  <div className="flex flex-col items-center mb-6 text-center">
                      <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                          <PiggyBank size={32} className="text-emerald-500" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">Guardar Dinheiro</h3>
                      <p className="text-sm text-slate-400">Adicionar valor à meta <br/><span className="text-nexus-accent font-bold">{selectedGoal.title}</span></p>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-center">Valor do Aporte</label>
                          <div className="relative">
                              <span className="absolute left-4 top-4 text-white font-bold text-lg">R$</span>
                              <input 
                                  type="number"
                                  autoFocus
                                  value={depositAmount}
                                  onChange={e => setDepositAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-12 text-white text-2xl font-bold outline-none focus:border-emerald-500 text-center"
                              />
                          </div>
                      </div>

                      <button 
                          onClick={handleDepositToGoal}
                          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] mt-2 uppercase tracking-wide text-sm"
                      >
                          Confirmar Depósito
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* DANGER ZONE MODAL */}
      {isDangerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] w-full max-w-md rounded-2xl border border-red-500/20 p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 text-center">
            
            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={32} className="text-red-500" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Atenção! Zona de Perigo</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                Você está prestes a apagar <strong className="text-white">TODOS</strong> os dados financeiros do sistema. 
                Esta ação é irreversível e excluirá histórico de transações, metas e configurações.
            </p>

            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => setIsDangerModalOpen(false)}
                    className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleClearData}
                    className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                >
                    Sim, Apagar Tudo
                </button>
            </div>
          </div>
        </div>
      )}

      <Chatbot user={user} transactions={transactions} onUpgrade={() => {
          // If locked inside Chatbot, open the Plans Tab OR directly the Checkout
          setActiveTab('PLANS');
      }} />
    </div>
  );
};

export default App;