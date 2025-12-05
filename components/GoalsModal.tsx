
import React, { useState, useEffect, useMemo } from 'react';
import { KpiGoals } from '../types';
import { formatRegister, formatPhone } from '../validation';

interface GoalsModalProps {
    currentGoals: KpiGoals;
    onSave: (newGoals: KpiGoals) => Promise<void>;
    onClose: () => void;
    forceSetup?: boolean; // If true, prevents closing without saving (First Run Wizard)
}

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="group relative inline-block ml-2">
        <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 transition-opacity duration-200 pointer-events-none text-center">
            {text}
            <svg className="absolute text-gray-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
            </svg>
        </div>
    </div>
);

const GoalsModal: React.FC<GoalsModalProps> = ({ currentGoals, onSave, onClose, forceSetup = false }) => {
    const [goals, setGoals] = useState(currentGoals);
    const [currentStep, setCurrentStep] = useState(0); // 0: Company, 1: Goals, 2: Pricing
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState('');
    
    // Define steps for the wizard
    const steps = [
        { title: 'Empresa', description: 'Dados cadastrais' },
        { title: 'Metas', description: 'Objetivos financeiros' },
        { title: 'Regras', description: 'Precificação e estoque' }
    ];

    // Initialize default structure if missing
    useEffect(() => {
        if (!goals.companyInfo) {
            setGoals(prev => ({
                ...prev,
                companyInfo: {
                    name: '',
                    cnpjCpf: '',
                    phone: '',
                    email: '',
                    address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' }
                }
            }));
        }
        // Ensure default for new field if undefined
        if (goals.autoApplyDiscount === undefined) {
            setGoals(prev => ({ ...prev, autoApplyDiscount: true }));
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setGoals(prev => ({ 
            ...prev, 
            [name]: (name === 'turnoverPeriod') ? value : (parseFloat(value) || 0) 
        }));
    };

    const handleStockThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setGoals(prev => ({
            ...prev,
            stockThresholds: {
                ...prev.stockThresholds,
                [name]: parseFloat(value) || 0
            }
        }));
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;
        if (name === 'cnpjCpf') formattedValue = formatRegister(value);
        if (name === 'phone') formattedValue = formatPhone(value);

        setGoals(prev => ({
            ...prev,
            companyInfo: {
                ...prev.companyInfo!,
                [name]: formattedValue
            }
        }));
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setGoals(prev => ({
            ...prev,
            companyInfo: {
                ...prev.companyInfo!,
                address: {
                    ...prev.companyInfo!.address,
                    [name]: value
                }
            }
        }));
    };

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length !== 8) return;

        setCepLoading(true);
        setCepError('');

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                setCepError('CEP não encontrado.');
                return;
            }

            setGoals(prev => ({
                ...prev,
                companyInfo: {
                    ...prev.companyInfo!,
                    address: {
                        ...prev.companyInfo!.address,
                        street: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    }
                }
            }));
        } catch (err) {
            setCepError('Erro ao buscar CEP.');
        } finally {
            setCepLoading(false);
        }
    };

    // Validation per step
    const isStepValid = useMemo(() => {
        switch (currentStep) {
            case 0: // Company
                return (
                    !!goals.companyInfo?.name &&
                    !!goals.companyInfo?.cnpjCpf &&
                    !!goals.companyInfo?.phone &&
                    !!goals.companyInfo?.address?.street &&
                    !!goals.companyInfo?.address?.number
                );
            case 1: // Goals
                return (
                    goals.netProfit > 0 &&
                    goals.inventoryTurnoverGoal > 0 &&
                    goals.predictedAvgMargin > 0
                );
            case 2: // Pricing & Rules (Assuming defaults are valid numbers, mostly check negative logic if needed)
                return (
                    goals.effectiveTaxRate >= 0 &&
                    goals.minContributionMargin >= 0
                );
            default:
                return false;
        }
    }, [goals, currentStep]);

    const handleNext = () => {
        if (currentStep < steps.length - 1 && isStepValid) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (!isStepValid) return;
        
        // Mark setup as complete
        const finalGoals = { ...goals, isSetupComplete: true };
        await onSave(finalGoals);
        if (!forceSetup) onClose();
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl my-8 flex flex-col max-h-[95vh] transition-all duration-300 ${forceSetup ? 'border-4 border-indigo-500' : ''}`}>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {forceSetup ? '🚀 Configuração Inicial' : 'Configurações Globais'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {forceSetup 
                                    ? 'Vamos configurar sua loja em 3 passos simples.' 
                                    : 'Ajuste os parâmetros do sistema.'}
                            </p>
                        </div>
                        {!forceSetup && (
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center justify-between relative px-4">
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10"></div>
                        {steps.map((step, index) => {
                            const isCompleted = index < currentStep;
                            const isCurrent = index === currentStep;
                            
                            return (
                                <div key={index} className="flex flex-col items-center bg-white dark:bg-gray-800 px-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${
                                        isCompleted 
                                            ? 'bg-green-500 border-green-500 text-white' 
                                            : isCurrent 
                                                ? 'bg-indigo-600 border-indigo-600 text-white scale-110' 
                                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                                    }`}>
                                        {isCompleted ? (
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content Body */}
                <form className="flex-1 overflow-y-auto p-6 pb-2">
                    {/* Step 0: Company Info */}
                    {currentStep === 0 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    Esses dados aparecerão nos recibos e ordens de serviço gerados pelo sistema.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nome da Empresa / Razão Social <span className="text-red-500">*</span></label>
                                    <input type="text" name="name" value={goals.companyInfo?.name} onChange={handleCompanyChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Tech Soluções"/>
                                    {goals.tenantName && (
                                        <p className="text-xs text-gray-400 mt-1 font-mono">{goals.tenantName}.fluxoclean.com.br</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">CPF / CNPJ <span className="text-red-500">*</span></label>
                                    <input type="text" name="cnpjCpf" value={goals.companyInfo?.cnpjCpf} onChange={handleCompanyChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="00.000.000/0000-00"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Telefone <span className="text-red-500">*</span></label>
                                    <input type="text" name="phone" value={goals.companyInfo?.phone} onChange={handleCompanyChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="(00) 00000-0000"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">E-mail</label>
                                    <input type="email" name="email" value={goals.companyInfo?.email} onChange={handleCompanyChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="contato@empresa.com"/>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-md font-semibold mb-3 text-indigo-600 dark:text-indigo-400">Endereço</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">CEP <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                name="cep" 
                                                value={goals.companyInfo?.address.cep} 
                                                onChange={handleAddressChange} 
                                                onBlur={handleCepBlur}
                                                className={`w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500 ${cepError ? 'border-red-500' : ''}`}
                                                placeholder="00000-000"
                                            />
                                            {cepLoading && <span className="absolute right-3 top-3 text-xs text-indigo-500 animate-pulse">Buscando...</span>}
                                        </div>
                                        {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1 text-gray-500">Rua (Logradouro)</label>
                                        <input 
                                            type="text" 
                                            name="street" 
                                            value={goals.companyInfo?.address.street} 
                                            readOnly
                                            disabled
                                            className="w-full rounded-lg bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 p-2.5 text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Número <span className="text-red-500">*</span></label>
                                        <input type="text" name="number" value={goals.companyInfo?.address.number} onChange={handleAddressChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500"/>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Complemento</label>
                                        <input 
                                            type="text" 
                                            name="complement" 
                                            value={goals.companyInfo?.address.complement} 
                                            onChange={handleAddressChange} 
                                            className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Apto, Sala, Bloco..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-500">Bairro</label>
                                        <input 
                                            type="text" 
                                            name="neighborhood" 
                                            value={goals.companyInfo?.address.neighborhood} 
                                            readOnly
                                            disabled
                                            className="w-full rounded-lg bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 p-2.5 text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1 text-gray-500">Cidade / UF</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                name="city" 
                                                value={goals.companyInfo?.address.city} 
                                                readOnly
                                                disabled
                                                className="flex-1 rounded-lg bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 p-2.5 text-gray-500 cursor-not-allowed" 
                                            />
                                            <input 
                                                type="text" 
                                                name="state" 
                                                value={goals.companyInfo?.address.state} 
                                                readOnly
                                                disabled
                                                className="w-16 rounded-lg bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 p-2.5 text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Goals */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border-l-4 border-indigo-500">
                                <h4 className="font-bold text-indigo-800 dark:text-indigo-300 mb-1">
                                    Defina o sucesso do seu negócio
                                </h4>
                                <p className="text-sm text-indigo-700 dark:text-indigo-400">
                                    O sistema usará esses valores para calcular metas, projeções e alertar se você estiver fora do caminho.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center mb-2">
                                        Estimativa de Faturamento Líquido (R$) <span className="text-red-500 ml-1">*</span>
                                        <Tooltip text="Estimativa de resultado líquido após dedução de custos, despesas e impostos." />
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500">R$</span>
                                        <input type="number" name="netProfit" value={goals.netProfit} onChange={handleChange} className="w-full pl-10 rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-3 text-lg font-semibold focus:ring-2 focus:ring-indigo-500"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center mb-2">
                                        Giro de Estoque (Vezes/Mês) <span className="text-red-500 ml-1">*</span>
                                        <Tooltip text="Indica a frequência com que o inventário é renovado dentro do mês. (Ex: 1.0 = estoque renovado integralmente)." />
                                    </label>
                                    <input type="number" step="0.1" name="inventoryTurnoverGoal" value={goals.inventoryTurnoverGoal} onChange={handleChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-3 text-lg font-semibold focus:ring-2 focus:ring-indigo-500"/>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center mb-2">
                                    Margem de Contribuição Média (%) <span className="text-red-500 ml-1">*</span>
                                    <Tooltip text="Percentual da receita destinado a cobrir custos fixos e gerar lucro, após descontar os custos variáveis." />
                                </label>
                                <div className="relative">
                                    <input type="number" step="0.1" name="predictedAvgMargin" value={goals.predictedAvgMargin} onChange={handleChange} className="w-full pr-10 rounded-lg bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 p-3 text-lg font-semibold focus:ring-2 focus:ring-indigo-500"/>
                                    <span className="absolute right-4 top-3 text-gray-500 font-bold">%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Rules & Pricing */}
                    {currentStep === 2 && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Section A: Taxation & Margin */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">1</span> 
                                    Impostos e Travas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium flex items-center mb-1">
                                            Imposto Médio (%) <span className="text-red-500 ml-1">*</span>
                                            <Tooltip text="Alíquota média estimada de impostos sobre vendas (Ex: DAS, ICMS)." />
                                        </label>
                                        <input type="number" step="0.1" name="effectiveTaxRate" value={goals.effectiveTaxRate} onChange={handleChange} className="w-full rounded-md border-gray-300 dark:border-gray-600 p-2.5 dark:bg-gray-700"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium flex items-center mb-1">
                                            Margem Mínima Aceitável (%) <span className="text-red-500 ml-1">*</span>
                                            <Tooltip text="Limite inferior de rentabilidade para garantir a viabilidade da operação." />
                                        </label>
                                        <input type="number" step="0.1" name="minContributionMargin" value={goals.minContributionMargin} onChange={handleChange} className="w-full rounded-md border-gray-300 dark:border-gray-600 p-2.5 dark:bg-gray-700"/>
                                    </div>
                                </div>
                            </div>

                            {/* Section B: Fees */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">2</span>
                                    Taxas de Meios de Pagamento
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">Pix/Dinheiro (%)</label>
                                        <input type="number" step="0.01" name="feePix" value={goals.feePix} onChange={handleChange} className="w-full rounded-md border-gray-300 dark:border-gray-600 p-2 text-center dark:bg-gray-700"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">Débito (%)</label>
                                        <input type="number" step="0.01" name="feeDebit" value={goals.feeDebit} onChange={handleChange} className="w-full rounded-md border-gray-300 dark:border-gray-600 p-2 text-center dark:bg-gray-700"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">Crédito à Vista (%)</label>
                                        <input type="number" step="0.01" name="feeCreditSight" value={goals.feeCreditSight} onChange={handleChange} className="w-full rounded-md border-gray-300 dark:border-gray-600 p-2 text-center dark:bg-gray-700"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-indigo-600 dark:text-indigo-400">Crédito Parc. (%)</label>
                                        <input type="number" step="0.01" name="feeCreditInstallment" value={goals.feeCreditInstallment} onChange={handleChange} className="w-full rounded-md border-indigo-300 dark:border-indigo-600 p-2 text-center bg-indigo-50 dark:bg-indigo-900/20 font-bold"/>
                                    </div>
                                </div>

                                {/* New Auto Discount Toggle */}
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="autoApplyDiscount"
                                            checked={goals.autoApplyDiscount}
                                            onChange={(e) => setGoals(prev => ({ ...prev, autoApplyDiscount: e.target.checked }))}
                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Aplicar desconto automático em Vendas e Serviços conforme taxas acima?
                                        </span>
                                    </label>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 ml-8">
                                        {goals.autoApplyDiscount
                                            ? "ℹ️ O sistema calculará e aplicará automaticamente os descontos baseados na diferença entre a taxa máxima (Crédito Parc.) e a forma de pagamento selecionada."
                                            : "ℹ️ O desconto não será aplicado automaticamente. Um botão 'Aplicar Desconto' será exibido no checkout para aplicação manual caso desejado."}
                                    </p>
                                </div>
                            </div>

                            {/* Section C: Inventory Rules */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">3</span>
                                    Parâmetros de Estoque
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <label className="block text-xs font-medium text-red-500 mb-1">Crítico (Dias)</label>
                                        <input type="number" name="riskMin" value={goals.stockThresholds.riskMin} onChange={handleStockThresholdChange} className="w-full rounded-md border-red-200 dark:border-red-900 p-2 text-center bg-red-50 dark:bg-red-900/20"/>
                                    </div>
                                    <div className="text-center">
                                        <label className="block text-xs font-medium text-green-600 mb-1">Ideal (Dias)</label>
                                        <input type="number" name="riskMax" value={goals.stockThresholds.riskMax} onChange={handleStockThresholdChange} className="w-full rounded-md border-green-200 dark:border-green-900 p-2 text-center bg-green-50 dark:bg-green-900/20"/>
                                    </div>
                                    <div className="text-center">
                                        <label className="block text-xs font-medium text-yellow-500 mb-1">Excesso (Dias)</label>
                                        <input type="number" name="safetyMax" value={goals.stockThresholds.safetyMax} onChange={handleStockThresholdChange} className="w-full rounded-md border-yellow-200 dark:border-yellow-900 p-2 text-center bg-yellow-50 dark:bg-yellow-900/20"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex justify-between items-center">
                    <div>
                        {!forceSetup && (
                            <button 
                                onClick={onClose} 
                                className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                    
                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <button 
                                onClick={handleBack}
                                className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                Voltar
                            </button>
                        )}

                        {currentStep < steps.length - 1 ? (
                            <button 
                                onClick={handleNext}
                                disabled={!isStepValid}
                                className="px-8 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                            >
                                Próximo
                            </button>
                        ) : (
                            <button 
                                onClick={handleSubmit}
                                disabled={!isStepValid}
                                className={`px-8 py-2.5 rounded-lg text-white font-bold shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${forceSetup ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {forceSetup ? 'Concluir e Acessar 🚀' : 'Salvar Alterações'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
};

export default GoalsModal;
