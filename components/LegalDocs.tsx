import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

interface LegalDocsProps {
  type: 'TERMS' | 'PRIVACY' | null;
  onClose: () => void;
}

const LegalDocs: React.FC<LegalDocsProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            {type === 'TERMS' ? <FileText className="text-nexus-accent" /> : <Shield className="text-emerald-500" />}
            <h2 className="text-xl font-display font-bold text-white">
              {type === 'TERMS' ? 'Termos de Uso' : 'Política de Privacidade'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 text-slate-300 space-y-6 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
          
          {type === 'TERMS' ? (
            <>
              <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Última atualização: {new Date().toLocaleDateString()}</p>
              
              <section>
                <h3 className="text-lg font-bold text-white mb-2">1. Aceitação dos Termos</h3>
                <p>Ao acessar e usar a plataforma NEXUS, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este site.</p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">2. Isenção de Responsabilidade Financeira</h3>
                <p>O NEXUS é uma ferramenta de gestão e organização financeira que utiliza Inteligência Artificial para fornecer insights. <strong>Nós não somos consultores financeiros certificados.</strong></p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                  <li>Nenhuma informação contida no sistema deve ser interpretada como aconselhamento de investimento vinculativo.</li>
                  <li>Você é o único responsável por suas decisões financeiras.</li>
                  <li>O NEXUS não se responsabiliza por perdas financeiras decorrentes do uso das ferramentas de IA ou sugestões automáticas.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">3. Uso da Licença</h3>
                <p>É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site NEXUS, apenas para visualização transitória pessoal e não comercial.</p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">4. Assinaturas e Pagamentos</h3>
                <p>O plano "Premium" é cobrado mensalmente. Ao assinar, você concorda que sua assinatura será renovada automaticamente, a menos que seja cancelada pelo menos 24 horas antes do final do período atual. O NEXUS não oferece reembolsos para meses parciais de serviço.</p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">5. Modificações</h3>
                <p>O NEXUS pode revisar estes termos de serviço a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.</p>
              </section>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Em conformidade com a LGPD (Lei Geral de Proteção de Dados)</p>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">1. Coleta de Dados</h3>
                <p>Para fornecer nossos serviços, coletamos as seguintes informações:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                  <li><strong>Dados Pessoais:</strong> Nome, e-mail e dados de autenticação.</li>
                  <li><strong>Dados Financeiros:</strong> Transações, saldos, metas e histórico de navegação na plataforma.</li>
                  <li><strong>Dados de Uso:</strong> Interações com a IA e logs de sistema para melhoria do serviço.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">2. Uso das Informações</h3>
                <p>Utilizamos seus dados para:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                  <li>Operar e manter o serviço NEXUS.</li>
                  <li>Personalizar os insights gerados pela Inteligência Artificial.</li>
                  <li>Processar pagamentos e enviar notificações importantes.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">3. Segurança dos Dados</h3>
                <p>Valorizamos sua confiança em nos fornecer suas informações pessoais e financeiras. Utilizamos meios comercialmente aceitáveis de proteção (criptografia em repouso e em trânsito via Supabase), mas lembramos que nenhum método de transmissão pela internet é 100% seguro.</p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">4. Integração com IA (Google Gemini)</h3>
                <p>Para fornecer funcionalidades inteligentes, dados anonimizados ou contextuais de suas transações podem ser processados pela API do Google Gemini. Estes dados não são usados para treinar os modelos públicos do Google.</p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">5. Seus Direitos (LGPD)</h3>
                <p>Você tem o direito de:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                  <li>Solicitar acesso aos dados que temos sobre você.</li>
                  <li>Solicitar a correção ou exclusão de seus dados pessoais ("Direito ao Esquecimento").</li>
                  <li>Revogar seu consentimento a qualquer momento excluindo sua conta nas configurações.</li>
                </ul>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-nexus-accent text-nexus-900 font-bold rounded-lg hover:bg-white transition-colors uppercase tracking-wider text-sm"
          >
            Entendi e Concordo
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalDocs;
