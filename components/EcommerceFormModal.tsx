
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
                                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Resumo da Degustação</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                    Você poderá testar todas as funcionalidades da Loja Virtual durante o período restante do seu teste.
                                </p>
                                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                    <li className="flex justify-between border-b dark:border-gray-700 pb-1">
                                        <span>Dias Restantes:</span>
                                        <span className="font-bold">{daysRemaining} dias</span>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seu Link de Acesso (Automático)</label>
                                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-all">
                                    https://{goals.tenantName}.fluxoclean.com.br
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Este link é exclusivo para sua degustação e pode ser compartilhado com clientes.</p>
                            </div>

                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-green-800 dark:text-green-300">Custo de Ativação</p>
                                    <p className="text-xs text-green-700 dark:text-green-400">Durante o período de teste.</p>
                                </div>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">GRÁTIS</p>
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
                                <li>Isento a plataforma de responsabilidade sobre chargebacks, fraudes de terceiros ou entregas não realizadas.</li>
                            </ul>
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
