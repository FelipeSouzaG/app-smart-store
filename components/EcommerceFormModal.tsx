
import React, { useState, useEffect } from 'react';
import { KpiGoals } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: any) => void;
    goals: KpiGoals;
    isTrial: boolean;
    extensionCount: number;
    trialEndsAt: string;
}

interface DomainOption {
    id: number;
    value: string;
    priority: number;
    isValid: boolean;
}

const EcommerceFormModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, goals, isTrial, extensionCount, trialEndsAt }) => {
    const [domains, setDomains] = useState<DomainOption[]>([]);
    const [agreed, setAgreed] = useState(false);

    // Initial Setup
    useEffect(() => {
        if (isOpen && !isTrial) {
            const baseName = goals.tenantName || goals.companyInfo?.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'minhaloja';
            const cleanBase = baseName.replace(/-/g, '');
            
            // Generate 5 suggestions
            const suggestions = [
                `${cleanBase}.com.br`,
                `${baseName}.com.br`,
                `loja${cleanBase}.com.br`,
                `${cleanBase}oficial.com.br`,
                `${cleanBase}shop.com.br`
            ];

            setDomains(suggestions.map((s, i) => ({
                id: i,
                value: s,
                priority: i + 1,
                isValid: true
            })));
        }
    }, [isOpen, isTrial, goals]);

    const validateDomain = (domain: string) => {
        // Regex simples para domínios (sem http, sem espaços, com extensão)
        return /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}(\.[a-z]{2})?$/.test(domain);
    };

    const handleDomainChange = (id: number, newValue: string) => {
        setDomains(prev => prev.map(d => 
            d.id === id ? { ...d, value: newValue.toLowerCase(), isValid: validateDomain(newValue) } : d
        ));
    };

    const handlePriorityChange = (id: number, newPriority: number) => {
        setDomains(prev => prev.map(d => 
            d.id === id ? { ...d, priority: newPriority } : d
        ).sort((a, b) => a.priority - b.priority));
    };

    const handleSubmit = () => {
        if (!agreed) return;

        const payload = {
            isTrial,
            generatedUrl: isTrial ? `https://${goals.tenantName}-smart-commerce.local.fluxoclean.com.br` : undefined,
            domainPreferences: !isTrial ? domains.map(d => ({ domain: d.value, priority: d.priority })) : [],
            requestedAt: new Date(),
            // Legal Data Injection
            legalAgreement: {
                version: 'v1.1-ecommerce',
                userAgent: navigator.userAgent
            }
        };

        onSubmit(payload);
    };

    // Calculate Trial Logic
    const today = new Date();
    const trialEnd = new Date(trialEndsAt);
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const potentialExtensions = Math.max(0, 2 - extensionCount);
    const totalPotentialDays = daysRemaining + (potentialExtensions * 30);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-180 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className={`p-6 text-white text-center ${isTrial ? 'bg-indigo-600' : 'bg-linear-to-r from-purple-600 to-indigo-600'}`}>
                    <h2 className="text-2xl font-bold mb-1">
                        {isTrial ? 'Ativação de Degustação' : 'Configuração E-commerce Exclusive'}
                    </h2>
                    <p className="text-white/80 text-sm">
                        {isTrial ? 'Seu ambiente de testes está quase pronto.' : 'Definição de domínio e identidade.'}
                    </p>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    
                    {/* SCENARIO 1: TRIAL */}
                    {isTrial && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Resumo do Acesso</h3>
                                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                    <li className="flex justify-between border-b dark:border-gray-700 pb-1">
                                        <span>Dias Restantes Atuais:</span>
                                        <span className="font-bold">{daysRemaining} dias</span>
                                    </li>
                                    <li className="flex justify-between border-b dark:border-gray-700 pb-1">
                                        <span>Renovações Disponíveis:</span>
                                        <span className="font-bold">{potentialExtensions} (+{potentialExtensions * 30} dias)</span>
                                    </li>
                                    <li className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold pt-1">
                                        <span>Potencial Total de Uso:</span>
                                        <span>Até {totalPotentialDays} dias</span>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seu Link de Acesso (Automático)</label>
                                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-all">
                                    https://{goals.tenantName}-smart-commerce.local.fluxoclean.com.br
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Este link é exclusivo para sua degustação e pode ser compartilhado com clientes.</p>
                            </div>

                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-green-800 dark:text-green-300">Taxa de Ativação Única</p>
                                    <p className="text-xs text-green-700 dark:text-green-400">Configuração do ambiente e servidor.</p>
                                </div>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">R$ 97,00</p>
                            </div>
                        </div>
                    )}

                    {/* SCENARIO 2: EXCLUSIVE */}
                    {!isTrial && (
                        <div className="space-y-6">
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 text-sm">
                                <p className="text-purple-800 dark:text-purple-300 font-medium mb-1">Vamos registrar seu Domínio Próprio!</p>
                                <p className="text-purple-700 dark:text-purple-400 text-xs leading-relaxed">
                                    Nossa equipe técnica irá adquirir e configurar o domínio para você. 
                                    Abaixo, listamos sugestões baseadas no nome da sua loja. Você pode editar e reordenar conforme sua preferência.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                                    <span>Endereço do Site (Domínio)</span>
                                    <span>Prioridade</span>
                                </div>
                                {domains.map((d, idx) => (
                                    <div key={d.id} className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                value={d.value}
                                                onChange={(e) => handleDomainChange(d.id, e.target.value)}
                                                className={`w-full p-2 rounded-lg border text-sm ${d.isValid ? 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500' : 'border-red-500 focus:ring-red-500'} dark:bg-gray-700 dark:text-white`}
                                            />
                                            {!d.isValid && <p className="text-[10px] text-red-500 mt-0.5">Formato de domínio inválido</p>}
                                        </div>
                                        <select 
                                            value={d.priority} 
                                            onChange={(e) => handlePriorityChange(d.id, Number(e.target.value))}
                                            className="w-16 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-center"
                                        >
                                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}º</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-100 dark:border-yellow-800">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                                </svg>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M2 2a2 2 0 0 0-2 2v8.01A2 2 0 0 0 2 14h5.5a.5.5 0 0 0 0-1H2a1 1 0 0 1-.966-.741l5.64-3.471L8 9.583l7-4.2V8.5a.5.5 0 0 0 1 0V4a2 2 0 0 0-2-2zm3.708 6.208L1 11.105V5.383zM1 4.217V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v.217l-7 4.2z"/>
                                  <path d="M14.247 14.269c1.01 0 1.587-.857 1.587-2.025v-.21C15.834 10.43 14.64 9 12.52 9h-.035C10.42 9 9 10.36 9 12.432v.214C9 14.82 10.438 16 12.358 16h.044c.594 0 1.018-.074 1.237-.175v-.73c-.245.11-.673.18-1.18.18h-.044c-1.334 0-2.571-.788-2.571-2.655v-.157c0-1.657 1.058-2.724 2.64-2.724h.04c1.535 0 2.484 1.05 2.484 2.326v.118c0 .975-.324 1.39-.639 1.39-.232 0-.41-.148-.41-.42v-2.19h-.906v.569h-.03c-.084-.298-.368-.63-.954-.63-.778 0-1.259.555-1.259 1.4v.528c0 .892.49 1.434 1.26 1.434.471 0 .896-.227 1.014-.643h.043c.118.42.617.648 1.12.648m-2.453-1.588v-.227c0-.546.227-.791.573-.791.297 0 .572.192.572.708v.367c0 .573-.253.744-.564.744-.354 0-.581-.215-.581-.8Z"/>
                                </svg>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M10 3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM6 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
                                  <path d="M8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2M1.599 4.058a.5.5 0 0 1 .208.676A7 7 0 0 0 1 8c0 1.18.292 2.292.807 3.266a.5.5 0 0 1-.884.468A8 8 0 0 1 0 8c0-1.347.334-2.619.923-3.734a.5.5 0 0 1 .676-.208m12.802 0a.5.5 0 0 1 .676.208A8 8 0 0 1 16 8a8 8 0 0 1-.923 3.734.5.5 0 0 1-.884-.468A7 7 0 0 0 15 8c0-1.18-.292-2.292-.807-3.266a.5.5 0 0 1 .208-.676M3.057 5.534a.5.5 0 0 1 .284.648A5 5 0 0 0 3 8c0 .642.12 1.255.34 1.818a.5.5 0 1 1-.93.364A6 6 0 0 1 2 8c0-.769.145-1.505.41-2.182a.5.5 0 0 1 .647-.284m9.886 0a.5.5 0 0 1 .648.284C13.855 6.495 14 7.231 14 8s-.145 1.505-.41 2.182a.5.5 0 0 1-.93-.364C12.88 9.255 13 8.642 13 8s-.12-1.255-.34-1.818a.5.5 0 0 1 .283-.648"/>
                                </svg>
                                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                                    <strong>Importante:</strong> Tentaremos registrar os domínios na ordem de sua prioridade. 
                                    Caso nenhum esteja disponível, nossa equipe entrará em contato por telefone/email antes de prosseguir.
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white">Plano Exclusive + E-commerce</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Mensalidade + Taxa de Adesão/Migração</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">R$ 297,00<span className="text-xs text-gray-400">/mês</span></p>
                                    <p className="text-xs text-gray-500">+ R$ 97,00 adesão</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LEGAL CHECKBOX & CARD */}
                    <div className="pt-2 border-t dark:border-gray-700">
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-3 border border-gray-200 dark:border-gray-600">
                            <h4 className="font-bold text-gray-800 dark:text-white text-sm mb-2">Termos de Responsabilidade e Uso</h4>
                            <ul className="list-disc ml-4 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                <li>Declaro ser o responsável legal pelo conteúdo, ofertas e produtos disponibilizados na loja virtual.</li>
                                {isTrial ? (
                                    <li>Estou ciente que o subdomínio fornecido é de propriedade da FluxoClean e seu uso indevido pode gerar cancelamento.</li>
                                ) : (
                                    <li>Autorizo a FluxoClean a registrar o domínio escolhido em meu nome ou da empresa e configurar a infraestrutura necessária.</li>
                                )}
                                <li>Isento a plataforma de responsabilidade sobre chargebacks, fraudes de terceiros ou entregas não realizadas (Seção 7 dos Termos).</li>
                                {!isTrial && <li>Estou ciente que a taxa de adesão/migração não é reembolsável após o registro do domínio.</li>}
                            </ul>
                            <a 
                                href="https://fluxoclean.com.br/contract" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="block mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                            >
                                Ler Contrato Completo
                            </a>
                        </div>

                        <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                            <input 
                                type="checkbox" 
                                checked={agreed}
                                onChange={e => setAgreed(e.target.checked)}
                                className="mt-1 w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                Li, compreendi e concordo com os Termos de Uso e Responsabilidade específicos para E-commerce.
                            </span>
                        </label>
                    </div>

                </div>

                <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium">Cancelar</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={!agreed || (!isTrial && domains.some(d => !d.isValid))}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md transform transition hover:scale-105 disabled:bg-gray-400 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                        {isTrial ? 'Ativar Degustação' : 'Ir para Pagamento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EcommerceFormModal;
