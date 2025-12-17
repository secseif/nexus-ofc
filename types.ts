
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  INVESTMENT = 'INVESTMENT'
}

export enum Recurrence {
  NONE = 'NONE',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export enum Category {
  HOUSING = 'Moradia',
  FOOD = 'Alimentação',
  TRANSPORT = 'Transporte',
  HEALTH = 'Saúde',
  EDUCATION = 'Educação',
  LEISURE = 'Lazer',
  SALARY = 'Salário',
  FREELANCE = 'Renda Extra',
  INVESTMENT = 'Investimentos',
  OTHERS = 'Outros',
  UTILITIES = 'Utilidades (Água/Luz/Net)'
}

export enum InvestmentType {
  CRYPTO = 'Criptomoedas',
  STOCKS = 'Ações',
  ETFS = 'ETFs',
  STOCKS_US = 'Stocks (EUA)',
  FIXED_INCOME = 'Renda Fixa (CDB/Tesouro)',
  FII = 'FIIs'
}

export enum YieldType {
  CDI = 'CDI',
  IPCA = 'IPCA',
  PRE = 'Pré-fixado'
}

export enum Emotion {
  NEUTRAL = 'Neutro',
  HAPPY = 'Empolgado/Feliz',
  ANXIOUS = 'Ansioso',
  BORED = 'Entediado',
  SAD = 'Triste',
  REGRET = 'Arrependido',
  IMPULSIVE = 'Impulsivo',
  PROUD = 'Orgulhoso'
}

export enum Importance {
  NEED = 'Necessidade (Vital)',
  DESIRE = 'Desejo (Supérfluo)'
}

export interface Transaction {
  id: string;
  description: string;
  amount: number; // Total investido ou valor da transação
  
  // Investment Specifics
  ticker?: string; // PETR4, BTC
  quantity?: number; // Número de cotas/moedas
  pricePerUnit?: number; // Preço pago por unidade
  currentValue?: number; // Valor atualizado de mercado (Total)
  
  // Fixed Income Specifics
  yieldType?: YieldType; // CDI, IPCA
  yieldRate?: number; // Ex: 110 (para 110% do CDI) ou 6 (para IPCA + 6%)
  
  purchaseDate?: string; // ISO Date for investments
  type: TransactionType;
  category: Category;
  subcategory?: string; 
  investmentType?: InvestmentType; 
  tags?: string[];
  date: string; // ISO Date string for the record entry
  recurrence: Recurrence;
  installments?: {
    current: number;
    total: number;
  };
  emotion?: Emotion;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO Date
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  icon?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  plan: 'FREE' | 'PREMIUM';
  financialScore: number;
  chatUsage: number;
  theme: 'dark' | 'light';
  language: 'pt-BR' | 'en-US';
  currency: 'BRL' | 'USD';
}

export interface FinancialSnapshot {
  balance: number;
  income: number;
  expenses: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string; // 'Trophy', 'Zap', etc.
  condition: (transactions: Transaction[], goals: Goal[], score: number) => boolean;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
}
