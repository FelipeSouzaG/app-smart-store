
import React, { useState, useEffect } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: any) => void;
    tenantName: string;
}

interface DomainOption {
    id: number;
    value: string;
    priority: number;
    isValid: boolean;
}

const BundleMigrationModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, tenantName }) => {
    const [domains, setDomains] = useState<DomainOption[]>([]);
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const cleanBase = tenantName.replace(/-/g, '');
            // Sugestões de domínios
            const suggestions = [
                `${cleanBase}.com.br`,
                `loja${cleanBase}.com.br`,
                `${cleanBase}oficial.com.br`,
                `${cleanBase}shop.com.br`,
                `compre${cleanBase}.com.br`
            ];

            setDomains(suggestions.map((s, i) => ({
                id: i,
                value: s,
                priority: i + 1,
                isValid: true
            })));
        }
    }, [isOpen, tenantName]);

    const validateDomain = (domain: string) => {
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
            plan: 'bundle', // Identifica o plano no backend
            domainPreferences: domains.map(d => ({ domain: d.value, priority: d.priority })),
            requestedAt: new Date(),
            // Legal Data Injection
            legalAgreement: {
                version: 'v1.1-bundle',
                userAgent: navigator.userAgent
            }
        };

        onSubmit(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-180 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header Promocional */}
                <div className="p-6 text-white text-center bg-linear-to-r from-indigo-900 to-purple-800 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-yellow-400 text-indigo-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                            <span className="animate-pulse">★</span> Plano Completo
                        </div>
                        <h2 className="text-2xl font-bold mb-1">Assinatura Smart Commerce</h2>
                        <p className="text-indigo-200 text-sm">
                            Sistema de Gestão Completo + E-commerce Profissional
                        </p>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    
                    <div className="flex gap-4 items-stretch">
                        <div className="flex-1 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                            <h4 className="font-bold text-green-800 dark:text-green-300 text-sm mb-1">Benefício Ativado</h4>
                            <p className="text-xs text-green-700 dark:text-green-400">
                                Domínio próprio grátis (R$ 40/ano incluso) e configuração completa da loja.
                            </p>
                        </div>
                        <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 text-right">
                             <p className="text-xs text-indigo-800 dark:text-indigo-300 uppercase font-bold">Valor Mensal do Combo</p>
                             <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">R$ 297,00</p>
                             <p className="text-[10px] text-gray-500">Cobrado via Boleto/Pix/Cartão</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">1</div>
                             <h3 className="font-bold text-gray-800 dark:text-white">Escolha seu Domínio Profissional</h3>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 ml-10">
                            Nossa equipe técnica registrará o domínio (www.suaempresa.com.br) para sua loja. Edite as sugestões abaixo conforme sua preferência:
                        </p>

                        <div className="space-y-3 ml-10">
                            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                                <span>Endereço do Site</span>
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
                                        {!d.isValid && <p className="text-[10px] text-red-500 mt-0.5">Formato inválido</p>}
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
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 italic">
                                * Tentaremos registrar na ordem de prioridade. Se nenhum estiver disponível, entraremos em contato.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t dark:border-gray-700">
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-3 border border-gray-200 dark:border-gray-600">
                            <h4 className="font-bold text-gray-800 dark:text-white text-sm mb-2">Termos de Responsabilidade e Mandato</h4>
                            <ul className="list-disc ml-4 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                <li><strong>Mandato:</strong> Autorizo a FluxoClean a registrar o domínio escolhido em meu nome junto ao Registro.br e demais órgãos competentes.</li>
                                <li><strong>Responsabilidade:</strong> Declaro ser o único responsável pelo conteúdo publicado no site.</li>
                                <li><strong>Cancelamento:</strong> Estou ciente que a taxa de registro do domínio (inclusa no valor) não é reembolsável em caso de desistência imediata.</li>
                                <li><strong>Uso Indevido:</strong> A venda de produtos ilegais resultará no bloqueio imediato da conta.</li>
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
                                Li, compreendi e concordo com os Termos e autorizo a assinatura do plano Smart Commerce.
                            </span>
                        </label>
                    </div>

                </div>

                <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium">Cancelar</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={!agreed || domains.some(d => !d.isValid)}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md transform transition hover:scale-105 disabled:bg-gray-400 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <span>Confirmar e Assinar</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BundleMigrationModal;
