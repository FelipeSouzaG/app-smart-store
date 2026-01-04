
import React from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onRequestUpgrade: () => void; // Apenas plano sistema (Layout decide se mostra warning)
    onRequestBundle: () => void; // Sistema + Ecommerce (Abre o BundleMigrationModal)
}

const SingleTenantDetailModal: React.FC<Props> = ({ isOpen, onClose, onRequestUpgrade, onRequestBundle }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-170 p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
                
                {/* Lado Esquerdo: Visual e Benefícios */}
                <div className="md:w-2/5 bg-linear-to-br from-indigo-900 to-purple-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 transform rotate-12 scale-150 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="inline-block px-3 py-1 bg-yellow-400 text-indigo-900 text-xs font-black rounded-full mb-4 uppercase tracking-wider">
                            Recomendado
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Ambiente Exclusive</h2>
                        <p className="text-indigo-200 text-sm mb-8">Performance máxima e isolamento total para o seu negócio escalar.</p>
                        
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <span className="bg-indigo-700 p-1 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></span>
                                <div>
                                    <strong className="block text-sm">Banco de Dados Isolado</strong>
                                    <span className="text-xs text-indigo-300">Seus dados não se misturam. Maior segurança e velocidade.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="bg-indigo-700 p-1 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></span>
                                <div>
                                    <strong className="block text-sm">Domínio Próprio</strong>
                                    <span className="text-xs text-indigo-300">Seu sistema em <i>app.suaempresa.com.br</i> (Configuração inclusa).</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="bg-indigo-700 p-1 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></span>
                                <div>
                                    <strong className="block text-sm">Prioridade no Suporte</strong>
                                    <span className="text-xs text-indigo-300">Atendimento preferencial via WhatsApp.</span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="relative z-10 mt-8 text-center text-xs opacity-60">
                        Infraestrutura gerenciada por FluxoClean SaaS
                    </div>
                </div>

                {/* Lado Direito: Planos */}
                <div className="md:w-3/5 bg-gray-50 dark:bg-gray-900 p-8 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Escolha seu Plano</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                    </div>

                    <div className="space-y-4">
                        {/* Opção 1: Só Sistema */}
                        <div className="border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl p-5 cursor-pointer transition-all bg-white dark:bg-gray-800 relative group">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">Apenas Sistema de Gestão</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Migração para ambiente Single-Tenant.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ 197<span className="text-sm font-normal">/mês</span></p>
                                </div>
                            </div>
                            <button 
                                onClick={onRequestUpgrade}
                                className="mt-4 w-full py-2 border border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                                Selecionar Plano Básico
                            </button>
                        </div>

                        {/* Opção 2: Bundle (Sistema + Ecommerce) */}
                        <div className="border-2 border-indigo-500 rounded-xl p-5 cursor-pointer transition-all bg-white dark:bg-gray-800 relative shadow-lg transform scale-105 z-10">
                            <div className="flex items-center justify-center gap-2 bg-linear-to-r from-pink-500 to-orange-500 text-white text-[12px] font-bold px-3 py-1 mb-5 rounded-full uppercase tracking-wide shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16m0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15"/>
                                </svg>
                                <span>Melhor Oferta</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                        Sistema + Loja Virtual
                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Integrado</span>
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">+ Ambiente exclusivo</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">+ E-commerce com domínio próprio</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-red-400 line-through">R$ 346/mês</p>
                                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">R$ 297<span className="text-sm font-normal text-gray-500">/mês</span></p>
                                </div>
                            </div>
                            <div className="my-4 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded text-xs text-indigo-800 dark:text-indigo-200">
                                ✓ Inclui taxa de adesão isenta (Economia de R$ 97,00)<br/>
                                ✓ Configuração de domínio (www.suaempresa.com.br)<br/>
                                ✓ Certificado SSL incluso
                            </div>
                            <button 
                                onClick={onRequestBundle}
                                className="flex items-center justify-center gap-3 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-transform hover:scale-[1.02]"
                            >
                                <span>Migrar com Loja Completa</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M9.752 6.193c.599.6 1.73.437 2.528-.362s.96-1.932.362-2.531c-.599-.6-1.73-.438-2.528.361-.798.8-.96 1.933-.362 2.532"/>
                                  <path d="M15.811 3.312c-.363 1.534-1.334 3.626-3.64 6.218l-.24 2.408a2.56 2.56 0 0 1-.732 1.526L8.817 15.85a.51.51 0 0 1-.867-.434l.27-1.899c.04-.28-.013-.593-.131-.956a9 9 0 0 0-.249-.657l-.082-.202c-.815-.197-1.578-.662-2.191-1.277-.614-.615-1.079-1.379-1.275-2.195l-.203-.083a10 10 0 0 0-.655-.248c-.363-.119-.675-.172-.955-.132l-1.896.27A.51.51 0 0 1 .15 7.17l2.382-2.386c.41-.41.947-.67 1.524-.734h.006l2.4-.238C9.005 1.55 11.087.582 12.623.208c.89-.217 1.59-.232 2.08-.188.244.023.435.06.57.093q.1.026.16.045c.184.06.279.13.351.295l.029.073a3.5 3.5 0 0 1 .157.721c.055.485.051 1.178-.159 2.065m-4.828 7.475.04-.04-.107 1.081a1.54 1.54 0 0 1-.44.913l-1.298 1.3.054-.38c.072-.506-.034-.993-.172-1.418a9 9 0 0 0-.164-.45c.738-.065 1.462-.38 2.087-1.006M5.205 5c-.625.626-.94 1.351-1.004 2.09a9 9 0 0 0-.45-.164c-.424-.138-.91-.244-1.416-.172l-.38.054 1.3-1.3c.245-.246.566-.401.91-.44l1.08-.107zm9.406-3.961c-.38-.034-.967-.027-1.746.163-1.558.38-3.917 1.496-6.937 4.521-.62.62-.799 1.34-.687 2.051.107.676.483 1.362 1.048 1.928.564.565 1.25.941 1.924 1.049.71.112 1.429-.067 2.048-.688 3.079-3.083 4.192-5.444 4.556-6.987.183-.771.18-1.345.138-1.713a3 3 0 0 0-.045-.283 3 3 0 0 0-.3-.041Z"/>
                                  <path d="M7.009 12.139a7.6 7.6 0 0 1-1.804-1.352A7.6 7.6 0 0 1 3.794 8.86c-1.102.992-1.965 5.054-1.839 5.18.125.126 3.936-.896 5.054-1.902Z"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SingleTenantDetailModal;
