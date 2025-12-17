import { GoogleGenAI } from "@google/genai";
import { Transaction, TransactionType } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFinancialInsight = async (
  message: string, 
  transactions: Transaction[],
  plan: 'FREE' | 'PREMIUM'
): Promise<string> => {
  
  // Calculate basic context to feed the AI
  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalExpense = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => acc + t.amount, 0);

  const contextPrompt = `
    Você é o NEXUS AI, um consultor financeiro de elite. 
    Sua personalidade é lúcida, direta, analítica e extremamente clara. Evite jargões desnecessários, mas mantenha a sofisticação.
    
    Dados atuais do usuário:
    - Renda Total Registrada: R$ ${totalIncome.toFixed(2)}
    - Despesa Total Registrada: R$ ${totalExpense.toFixed(2)}
    - Saldo Líquido: R$ ${(totalIncome - totalExpense).toFixed(2)}
    
    Diretrizes:
    1. Se o usuário pedir um relatório, forneça um resumo estruturado em texto dos principais pontos de atenção.
    2. Se o usuário perguntar sobre investimentos, explique os conceitos com clareza (FIIs, Ações, Cripto).
    3. Analise padrões. Se o saldo for negativo, sugira cortes imediatos em categorias supérfluas.
    4. Mantenha o tom profissional, porém acessível.
    
    Responda à pergunta do usuário: "${message}"
  `;

  try {
    const modelId = plan === 'PREMIUM' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: contextPrompt,
    });
    
    return response.text || "Meus sistemas estão recalibrando. Por favor, reformule sua pergunta.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Falha na conexão neural. Tente novamente em instantes.";
  }
};

export const getRealTimeMarketData = async (
    tickers: string[]
): Promise<{
    prices: Record<string, number>,
    rates: { SELIC: number, CDI: number, IPCA: number }
}> => {
    
    const uniqueTickers = [...new Set(tickers)].filter(t => t && t.length > 0).join(', ');
    
    const prompt = `
        Aja como uma API de mercado financeiro em tempo real.
        
        Tarefa 1: Estime/Busque o PREÇO ATUAL unitário (em Reais BRL) para os seguintes ativos: [${uniqueTickers}]. 
        Para Criptomoedas (BTC, ETH), converta para BRL.
        
        Tarefa 2: Forneça a taxa anual atualizada do Brasil para:
        - SELIC
        - CDI (Geralmente Selic - 0.10)
        - IPCA (Acumulado 12 meses)
        
        Regras Críticas:
        1. Retorne APENAS um JSON válido.
        2. Não use markdown.
        3. Se não souber o ativo exato, estime com base no fechamento anterior.
        
        Formato de Saída Esperado:
        {
            "prices": {
                "PETR4": 38.50,
                "BTC": 350000.00,
                "VALE3": 62.10
            },
            "rates": {
                "SELIC": 0.1075,  // Exemplo para 10.75%
                "CDI": 0.1065,
                "IPCA": 0.045
            }
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        const jsonText = response.text || "{}";
        const data = JSON.parse(jsonText);
        
        // Fallback safety
        if (!data.rates) {
            data.rates = { SELIC: 0.1125, CDI: 0.1115, IPCA: 0.045 };
        }
        
        return data;
    } catch (error) {
        console.error("Market Data Error:", error);
        return { 
            prices: {}, 
            rates: { SELIC: 0.1125, CDI: 0.1115, IPCA: 0.045 } // Fallback values
        };
    }
}

export const generateMonthlyReportAnalysis = async (
    transactions: Transaction[],
    month: number,
    year: number
): Promise<string> => {
    // 1. Prepare Data Context for the month
    const monthlyTrans = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    const income = monthlyTrans.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expenses = monthlyTrans.filter(t => t.type === TransactionType.EXPENSE);
    const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);
    const balance = income - totalExpense;
    
    // Group expenses by category
    const catMap: Record<string, number> = {};
    expenses.forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const topCategories = Object.entries(catMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([k,v]) => `${k}: R$ ${v.toFixed(2)}`)
        .join(', ');

    const prompt = `
        Aja como um analista financeiro sênior da NEXUS.
        Gere um relatório analítico para o mês ${month + 1}/${year}.
        
        Dados:
        - Receita: R$ ${income.toFixed(2)}
        - Despesas: R$ ${totalExpense.toFixed(2)}
        - Saldo: R$ ${balance.toFixed(2)}
        - Top Gastos: ${topCategories}
        
        Instruções de Saída:
        Escreva um texto corrido de aproximadamente 3 a 4 parágrafos, formatado para ser lido em um documento PDF formal.
        Não use markdown, use texto puro com pontuação adequada.
        
        Estrutura do Texto:
        1. Resumo Executivo: Visão geral da saúde financeira do mês. Use tom profissional.
        2. Análise de Gastos: Comente sobre as categorias onde o dinheiro mais saiu. Se o saldo for negativo, seja firme no alerta. Se for positivo, parabenize.
        3. Comportamento: Analise brevemente se houve equilíbrio entre receita e despesa.
        4. Recomendação: Uma dica tática única para o próximo mês baseada nestes números (ex: reduzir gastos supérfluos, investir o excedente).
        
        Seja direto, perspicaz e focado em inteligência financeira.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Use superior model for report generation
            contents: prompt,
        });
        return response.text || "Relatório indisponível no momento.";
    } catch (error) {
        console.error("Report Generation Error:", error);
        return "Não foi possível processar a análise detalhada devido a uma instabilidade momentânea na rede neural.";
    }
};