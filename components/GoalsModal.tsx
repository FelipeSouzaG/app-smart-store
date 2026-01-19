
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { KpiGoals } from '../types';
import { formatRegister, formatPhone } from '../validation';
import { AuthContext } from '../contexts/AuthContext';
import { SAAS_LOGIN_URL } from '../config';

interface GoalsModalProps {
    currentGoals: KpiGoals;
    onSave: (newGoals: KpiGoals) => Promise<void>;
    onClose: () => void;
    forceSetup?: boolean; // If true, prevents closing without saving (First Run Wizard)
}

const Tooltip: React.FC<{ text: React.ReactNode }> = ({ text }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Handlers blindados para evitar propagação (especialmente dentro de labels)
    const handleOpen = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsModalOpen(true);
    };

    const handleClose = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsModalOpen(false);
    };

    const handleContentClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <>
            {/* Wrapper com group para o hover CSS desktop */}
            <span className="group relative inline-flex items-center justify-center ml-2 align-middle">
                {/* Botão Gatilho - Semanticamente correto para mobile/touch */}
                <button
                    type="button"
                    onClick={handleOpen}
                    className="text-gray-400 hover:text-indigo-500 transition-colors focus:outline-none cursor-help p-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                      <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
                    </svg>
                </button>

                {/* Desktop Hover Tooltip (Controlado via CSS puro para confiabilidade) */}
                <div className="hidden md:group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none text-center leading-relaxed">
                    {text}
                    <svg className="absolute text-gray-900 h-2 w-full left-1/2 -translate-x-1/2 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                    </svg>
                </div>
            </span>

            {/* Mobile/Tablet Modal (Centralizado e Fixo) */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm md:hidden"
                    onClick={handleClose}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-xs w-full text-center relative border border-gray-200 dark:border-gray-700 animate-fade-in"
                        onClick={handleContentClick}
                    >
                        <div className="mb-4 text-indigo-600 dark:text-indigo-400 flex justify-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
                              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
                            </svg>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Informação</h4>
                        </div>
                        <div className="text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                            {text}
                        </div>
                        <button 
                            type="button"
                            onClick={handleClose}
                            className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md active:scale-95 transform"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

const GoalsModal: React.FC<GoalsModalProps> = ({ currentGoals, onSave, onClose, forceSetup = false }) => {
    const { apiCall } = useContext(AuthContext);
    const [goals, setGoals] = useState(currentGoals);
    const [currentStep, setCurrentStep] = useState(0); 
    // Steps: 0: Company, 1: Goals, 2: Pricing, 3: Financial, 4: Contract
    const [cepLoading, setCepLoading] = useState(false);
    const [cepStatus, setCepStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const [cepMessage, setCepMessage] = useState('');
    
    // Initialize with existing value if present
    const [acceptedTerms, setAcceptedTerms] = useState(!!currentGoals.legalAgreement?.accepted);
    
    // Ensure form updates if parent props change (e.g. async fetch)
    useEffect(() => {
        setGoals(currentGoals);
        // Sync accepted terms state from DB
        if (currentGoals.legalAgreement?.accepted) {
            setAcceptedTerms(true);
        }
    }, [currentGoals]);

    // Check pre-filled data on mount to auto-skip to contract if needed
    useEffect(() => {
        if (forceSetup) {
            const hasCompany = !!currentGoals.companyInfo?.name && !!currentGoals.companyInfo?.address?.cep;
            const hasGoals = currentGoals.netProfit > 0 && currentGoals.predictedAvgMargin > 0;
            const hasContract = !!currentGoals.legalAgreement?.accepted;

            if (hasCompany && hasGoals && !hasContract) {
                // Auto-jump to Contract Step (Index 4)
                setCurrentStep(4);
            }
        }
    }, [forceSetup]); // Run only on mount or when forceSetup changes

    // Define steps for the wizard
    const steps = [
        { title: 'Empresa', description: 'Dados cadastrais' },
        { title: 'Metas', description: 'Objetivos financeiros' },
        { title: 'Regras', description: 'Precificação e estoque' },
        { title: 'Pagamento', description: 'Contas e Cartão' },
        { title: 'Contrato', description: 'Termos legais' }
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
        if (goals.autoApplyDiscount === undefined) {
            setGoals(prev => ({ ...prev, autoApplyDiscount: true }));
        }
        if (!goals.financialSettings) {
            setGoals(prev => ({
                ...prev,
                financialSettings: {
                    useBank: false,
                    useCredit: false,
                    cardClosingDay: 1,
                    cardDueDay: 10
                }
            }));
        }
    }, [goals]);

    // Auto-validate CEP on mount or step change if data exists
    useEffect(() => {
        if (currentStep === 0 && goals.companyInfo?.address?.cep) {
            const cleanCep = goals.companyInfo.address.cep.replace(/\D/g, '');
            if (cleanCep.length === 8) {
                if (goals.companyInfo.address.street && goals.companyInfo.address.city) {
                    setCepStatus('valid');
                } else {
                    handleCepBlur({ target: { value: goals.companyInfo.address.cep } } as any);
                }
            }
        }
    }, [currentStep, goals.companyInfo?.address?.cep]);

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

    const handleFinancialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        // Basic sanitization for days
        let val = parseInt(value) || 0;
        if (type === 'number') {
             // Just sanitizing negative, limits checked in validation
             if (val < 0) val = 1;
        }

        setGoals(prev => ({
            ...prev,
            financialSettings: {
                ...prev.financialSettings!,
                [name]: type === 'checkbox' ? checked : val
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
        let formattedValue = value;

        if (name === 'cep') {
            formattedValue = value.replace(/\D/g, '').substring(0, 8);
            formattedValue = formattedValue.replace(/^(\d{2})(\d)/, '$1.$2').replace(/\.(\d{3})(\d)/, '.$1-$2');
            
            if (cepStatus !== 'idle') {
                setCepStatus('idle');
                setCepMessage('');
            }
        }

        if (name === 'number') {
            formattedValue = value.replace(/\D/g, '');
        }

        setGoals(prev => ({
            ...prev,
            companyInfo: {
                ...prev.companyInfo!,
                address: {
                    ...prev.companyInfo!.address,
                    [name]: formattedValue
                }
            }
        }));
    };

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const rawCep = e.target.value.replace(/\D/g, '');
        
        if (rawCep.length !== 8) {
            if (rawCep.length > 0) {
                setCepStatus('invalid');
                setCepMessage('CEP incompleto.');
            }
            return;
        }

        setCepLoading(true);
        setCepStatus('idle');
        setCepMessage('');

        try {
            const data = await apiCall(`settings/cep/${rawCep}`, 'GET');

            if (!data || data.erro) {
                setCepStatus('invalid');
                setCepMessage('CEP não encontrado.');
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
            setCepStatus('valid');
            setCepMessage(`CEP Encontrado: ${data.localidade}/${data.uf}`);
        } catch (err: any) {
            setCepStatus('invalid');
            const msg = err.message || 'Erro ao buscar CEP.';
            setCepMessage(msg);
        } finally {
            setCepLoading(false);
        }
    };

    const isStepValid = useMemo(() => {
        switch (currentStep) {
            case 0: // Company
                return (
                    !!goals.companyInfo?.name &&
                    !!goals.companyInfo?.cnpjCpf &&
                    !!goals.companyInfo?.phone &&
                    !!goals.companyInfo?.email &&
                    !!goals.companyInfo?.address?.cep &&
                    (cepStatus === 'valid' || (!!goals.companyInfo.address.city && !!goals.companyInfo.address.street)) &&
                    !!goals.companyInfo?.address?.street &&
                    !!goals.companyInfo?.address?.number &&
                    !!goals.companyInfo?.address?.neighborhood &&
                    !!goals.companyInfo?.address?.city &&
                    !!goals.companyInfo?.address?.state
                );
            case 1: // Goals
                return (
                    goals.netProfit > 0 &&
                    goals.inventoryTurnoverGoal > 0 &&
                    goals.predictedAvgMargin > 0
                );
            case 2: // Pricing & Rules
                return (
                    goals.effectiveTaxRate >= 0 &&
                    goals.minContributionMargin >= 0
                );
            case 3: // Financial
                if (goals.financialSettings?.useCredit) {
                    return (
                        goals.financialSettings.cardClosingDay >= 1 && goals.financialSettings.cardClosingDay <= 31 &&
                        goals.financialSettings.cardDueDay >= 1 && goals.financialSettings.cardDueDay <= 31
                    );
                }
                return true;
            case 4: // Contract
                return acceptedTerms;
            default:
                return false;
        }
    }, [goals, currentStep, cepStatus, acceptedTerms]);

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
        
        // Include Legal Agreement Payload
        // IMPORTANT: Only set isSetupComplete to true here, when finishing the wizard
        const finalGoals = { 
            ...goals, 
            isSetupComplete: true,
            legalAgreement: {
                accepted: true,
                // Timestamp and version will be handled/enriched by backend
            }
        };
        
        await onSave(finalGoals);
        // Force close after save, regardless of forceSetup, because the process is complete
        onClose(); 
    };

    // Calculate URL for contract link
    // Assuming app-fluxoclean is hosting the landing page and auth logic
    const contractUrl = SAAS_LOGIN_URL.replace('/login', '/contract');

    // Validation helper for financial day inputs
    const isDayValid = (day: number) => day >= 1 && day <= 31;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl my-8 flex flex-col max-h-[95vh] transition-all duration-300 ${forceSetup ? 'border-4 border-indigo-500' : ''}`}>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {forceSetup ? 
                                  <div className="flex items-center space-x-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                                      <path d="M9.752 6.193c.599.6 1.73.437 2.528-.362s.96-1.932.362-2.531c-.599-.6-1.73-.438-2.528.361-.798.8-.96 1.933-.362 2.532"/>
                                      <path d="M15.811 3.312c-.363 1.534-1.334 3.626-3.64 6.218l-.24 2.408a2.56 2.56 0 0 1-.732 1.526L8.817 15.85a.51.51 0 0 1-.867-.434l.27-1.899c.04-.28-.013-.593-.131-.956a9 9 0 0 0-.249-.657l-.082-.202c-.815-.197-1.578-.662-2.191-1.277-.614-.615-1.079-1.379-1.275-2.195l-.203-.083a10 10 0 0 0-.655-.248c-.363-.119-.675-.172-.955-.132l-1.896.27A.51.51 0 0 1 .15 7.17l2.382-2.386c.41-.41.947-.67 1.524-.734h.006l2.4-.238C9.005 1.55 11.087.582 12.623.208c.89-.217 1.59-.232 2.08-.188.244.023.435.06.57.093q.1.026.16.045c.184.06.279.13.351.295l.029.073a3.5 3.5 0 0 1 .157.721c.055.485.051 1.178-.159 2.065m-4.828 7.475.04-.04-.107 1.081a1.54 1.54 0 0 1-.44.913l-1.298 1.3.054-.38c.072-.506-.034-.993-.172-1.418a9 9 0 0 0-.164-.45c.738-.065 1.462-.38 2.087-1.006M5.205 5c-.625.626-.94 1.351-1.004 2.09a9 9 0 0 0-.45-.164c-.424-.138-.91-.244-1.416-.172l-.38.054 1.3-1.3c.245-.246.566-.401.91-.44l1.08-.107zm9.406-3.961c-.38-.034-.967-.027-1.746.163-1.558.38-3.917 1.496-6.937 4.521-.62.62-.799 1.34-.687 2.051.107.676.483 1.362 1.048 1.928.564.565 1.25.941 1.924 1.049.71.112 1.429-.067 2.048-.688 3.079-3.083 4.192-5.444 4.556-6.987.183-.771.18-1.345.138-1.713a3 3 0 0 0-.045-.283 3 3 0 0 0-.3-.041Z"/>
                                      <path d="M7.009 12.139a7.6 7.6 0 0 1-1.804-1.352A7.6 7.6 0 0 1 3.794 8.86c-1.102.992-1.965 5.054-1.839 5.18.125.126 3.936-.896 5.054-1.902Z"/>
                                    </svg>
                                    <p>Configuração Inicial</p>
                                  </div>
                                :
                                  <div className="flex items-center space-x-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                                      <path fill-rule="evenodd" d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1z"/>
                                    </svg>
                                    <p>Configurações Globais</p>
                                  </div>
                                }
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {forceSetup 
                                    ? 'Para começar, precisamos completar alguns dados importantes.' 
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
                    <div className="flex items-center justify-between relative px-4 overflow-x-auto">
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 hidden sm:block"></div>
                        {steps.map((step, index) => {
                            const isCompleted = index < currentStep;
                            const isCurrent = index === currentStep;
                            
                            return (
                                <div key={index} className="flex flex-col items-center bg-white dark:bg-gray-800 px-2 z-10 min-w-14 py-1">
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${
                                        isCompleted 
                                            ? 'bg-green-500 border-green-500 text-white' 
                                            : isCurrent 
                                                ? 'bg-indigo-600 border-indigo-600 text-white scale-110' 
                                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                                    }`}>
                                        {isCompleted ? (
                                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    <span className={`text-[10px] sm:text-xs mt-2 font-medium ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content Body */}
                <form className="flex-1 overflow-y-auto p-6 pb-2">
                    
                    {/* Steps 0 to 3 are same as before... (omitted for brevity, assume they are rendered correctly) */}
                    
                    {currentStep === 0 && (
                         <div className="space-y-6 animate-fade-in">
                            {/* ... Company Info Fields (Same as original) ... */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    Esses dados aparecerão nos recibos e ordens de serviço gerados pelo sistema.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nome da Empresa / Razão Social <span className="text-red-500">*</span></label>
                                    <input type="text" name="name" value={goals.companyInfo?.name || ''} onChange={handleCompanyChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Tech Soluções"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">CPF / CNPJ <span className="text-red-500">*</span></label>
                                    <input type="text" name="cnpjCpf" value={goals.companyInfo?.cnpjCpf || ''} onChange={handleCompanyChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 focus:ring-2 focus:ring-indigo-500" placeholder="00.000.000/0000-00"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Telefone <span className="text-red-500">*</span></label>
                                    <input type="text" name="phone" value={goals.companyInfo?.phone || ''} onChange={handleCompanyChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 focus:ring-2 focus:ring-indigo-500" placeholder="(00) 00000-0000"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">E-mail <span className="text-red-500">*</span></label>
                                    <input type="email" name="email" value={goals.companyInfo?.email || ''} onChange={handleCompanyChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 focus:ring-2 focus:ring-indigo-500" placeholder="contato@empresa.com"/>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-md font-semibold mb-3 text-indigo-600 dark:text-indigo-400">Endereço</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">CEP (Somente Números) <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                name="cep" 
                                                value={goals.companyInfo?.address.cep || ''} 
                                                onChange={handleAddressChange} 
                                                onBlur={handleCepBlur}
                                                className={`w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 focus:ring-2 focus:ring-indigo-500 ${cepStatus === 'invalid' ? 'border-red-500 focus:ring-red-500' : cepStatus === 'valid' ? 'border-green-500 focus:ring-green-500' : ''}`}
                                                placeholder="00.000-000"
                                            />
                                            {cepLoading && <span className="absolute right-3 top-3 text-xs text-indigo-500 animate-pulse">Buscando...</span>}
                                        </div>
                                        {cepMessage && (
                                            <p className={`text-xs mt-1 font-medium ${cepStatus === 'valid' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                                {cepMessage}
                                            </p>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium mb-1 text-gray-500 flex items-center">Rua (Logradouro) <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            name="street" 
                                            value={goals.companyInfo?.address.street || ''} 
                                            onChange={handleAddressChange}
                                            className="w-full rounded-lg bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 p-2 text-gray-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Número <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            name="number" 
                                            value={goals.companyInfo?.address.number || ''} 
                                            onChange={handleAddressChange} 
                                            className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 focus:ring-2 focus:ring-indigo-500"
                                            placeholder="123"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Complemento</label>
                                        <input 
                                            type="text" 
                                            name="complement" 
                                            value={goals.companyInfo?.address.complement || ''} 
                                            onChange={handleAddressChange} 
                                            className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Apto, Sala, Bloco..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1 text-gray-500 flex items-center">Bairro <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            name="neighborhood" 
                                            value={goals.companyInfo?.address.neighborhood || ''} 
                                            onChange={handleAddressChange}
                                            className="w-full rounded-lg bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 p-2 text-gray-800 dark:text-white"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium mb-1 text-gray-500 flex items-center">Cidade / UF <span className="text-red-500">*</span></label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                name="city" 
                                                value={goals.companyInfo?.address.city || ''} 
                                                onChange={handleAddressChange}
                                                className="flex-1 rounded-lg bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 p-2 text-gray-800 dark:text-white" 
                                            />
                                            <input 
                                                type="text" 
                                                name="state" 
                                                value={goals.companyInfo?.address.state || ''} 
                                                onChange={handleAddressChange}
                                                className="w-16 rounded-lg bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 p-2 text-gray-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
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
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center mb-2">
                                        Estimativa de Faturamento Líquido (R$) <span className="text-red-500 ml-1">*</span>
                                        <Tooltip text="Estimativa de resultado líquido após dedução de custos, despesas e impostos." />
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500">R$</span>
                                        <input type="number" name="netProfit" value={goals.netProfit} onChange={handleChange} className="w-full pl-10 rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 text-lg font-semibold focus:ring-2 focus:ring-indigo-500"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center mb-2">
                                        Giro de Estoque (Vezes/Mês) <span className="text-red-500 ml-1">*</span>
                                        <Tooltip text="Indica a frequência com que o inventário é renovado dentro do mês. (Ex: 1.0 = estoque renovado integralmente)." />
                                    </label>
                                    <input type="number" step="0.1" name="inventoryTurnoverGoal" value={goals.inventoryTurnoverGoal} onChange={handleChange} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 text-lg font-semibold focus:ring-2 focus:ring-indigo-500"/>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center mb-2">
                                    Margem de Contribuição Média (%) <span className="text-red-500 ml-1">*</span>
                                    <Tooltip text="Percentual da receita destinado a cobrir custos fixos e gerar lucro, após descontar os custos variáveis." />
                                </label>
                                <div className="relative">
                                    <input type="number" step="0.1" name="predictedAvgMargin" value={goals.predictedAvgMargin} onChange={handleChange} className="w-full pr-10 rounded-lg bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 p-2 text-lg font-semibold focus:ring-2 focus:ring-indigo-500"/>
                                    <span className="absolute right-4 top-3 text-gray-500 font-bold">%</span>
                                </div>
                            </div>
                        </div>
                    )}

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
                                        <label className="text-sm font-medium flex items-center mb-1">
                                            Imposto Médio (%) <span className="text-red-500 ml-1">*</span>
                                            <Tooltip text="Alíquota média estimada de impostos sobre vendas (Ex: DAS, ICMS)." />
                                        </label>
                                        <input type="number" step="0.1" name="effectiveTaxRate" value={goals.effectiveTaxRate} onChange={handleChange} className="w-full rounded-md border-gray-300 dark:border-gray-600 p-2 dark:bg-gray-700"/>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium flex items-center mb-1">
                                            Margem Mínima Aceitável (%) <span className="text-red-500 ml-1">*</span>
                                            <Tooltip text="Limite inferior de rentabilidade para garantir a viabilidade da operação." />
                                        </label>
                                        <input type="number" step="0.1" name="minContributionMargin" value={goals.minContributionMargin} onChange={handleChange} className="w-full rounded-md border-gray-300 dark:border-gray-600 p-2 dark:bg-gray-700"/>
                                    </div>
                                </div>
                            </div>

                            {/* Section B: Fees */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">2</span>
                                    Taxas de Meios de Pagamento a Receber
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
                                    <p className="mt-2 text-base text-gray-500 dark:text-gray-400 ml-8">
                                        {goals.autoApplyDiscount
                                            ? "O sistema calculará e aplicará automaticamente os descontos baseados na diferença entre a taxa máxima (Crédito Parc.) e a forma de pagamento selecionada."
                                            : "O desconto não será aplicado automaticamente. Um botão 'Aplicar Desconto' será exibido no checkout para aplicação manual caso desejado."}
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

                    {currentStep === 3 && (
                         <div className="space-y-6 animate-fade-in">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500 mb-6">
                                <h4 className="font-bold text-yellow-800 dark:text-yellow-300 mb-1">
                                    Atenção: Simulação de Contas
                                </h4>
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                    Nenhum dado bancário real é utilizado. Os nomes e configurações servem apenas para sua organização e controle interno do fluxo de caixa.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-transparent mt-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                                            <path fillRule="evenodd" d="M11 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8m5-4a5 5 0 1 1-10 0 5 5 0 0 1 10 0"/>
                                            <path d="M9.438 11.944c.047.596.518 1.06 1.363 1.116v.44h.375v-.443c.875-.061 1.386-.529 1.386-1.207 0-.618-.39-.936-1.09-1.1l-.296-.07v-1.2c.376.043.614.248.671.532h.658c-.047-.575-.54-1.024-1.329-1.073V8.5h-.375v.45c-.747.073-1.255.522-1.255 1.158 0 .562.378.92 1.007 1.066l.248.061v1.272c-.384-.058-.639-.27-.696-.563h-.668zm1.36-1.354c-.369-.085-.569-.26-.569-.522 0-.294.216-.514.572-.578v1.1zm.432.746c.449.104.655.272.655.569 0 .339-.257.571-.709.614v-1.195z"/>
                                            <path d="M1 0a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4.083q.088-.517.258-1H3a2 2 0 0 0-2-2V3a2 2 0 0 0 2-2h10a2 2 0 0 0 2 2v3.528c.38.34.717.728 1 1.154V1a1 1 0 0 0-1-1z"/>
                                            <path d="M9.998 5.083 10 5a2 2 0 1 0-3.132 1.65 6 6 0 0 1 3.13-1.567"/>
                                          </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Dinheiro do Caixa</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Sempre ativo por padrão.</p>
                                        </div>
                                    </div>
                                    <input type="checkbox" checked disabled className="h-5 w-5 text-indigo-600 bg-gray-100 border-gray-300 rounded opacity-50 cursor-not-allowed"/>
                                </div>

                                <div className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-transparent">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M8.277.084a.5.5 0 0 0-.554 0l-7.5 5A.5.5 0 0 0 .5 6h1.875v7H1.5a.5.5 0 0 0 0 1h13a.5.5 0 1 0 0-1h-.875V6H15.5a.5.5 0 0 0 .277-.916zM12.375 6v7h-1.25V6zm-2.5 0v7h-1.25V6zm-2.5 0v7h-1.25V6zm-2.5 0v7h-1.25V6zm-2.5 0v7h-1.25V6zM8 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2M.5 15a.5.5 0 0 0 0 1h15a.5.5 0 1 0 0-1z"/>
                                          </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Conta Bancária (Pix/Débito)</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Para pagamentos a vista de contas utilizando Pix ou Débito de uma conta.</p>
                                        </div>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        name="useBank"
                                        checked={goals.financialSettings?.useBank || false} 
                                        onChange={handleFinancialChange}
                                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                    />
                                </div>

                                <div className={`p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all duration-300 ${goals.financialSettings?.useCredit ? 'ring-2 ring-indigo-500' : ''}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-transparent mt-0.5">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M11 5.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5z"/>
                                                <path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm13 2v5H1V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1m-1 9H2a1 1 0 0 1-1-1v-1h14v1a1 1 0 0 1-1 1"/>
                                              </svg>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Cartão de Crédito</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Para controle de faturas e compras com o cartão de crédito.</p>
                                            </div>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            name="useCredit"
                                            checked={goals.financialSettings?.useCredit || false} 
                                            onChange={handleFinancialChange}
                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                        />
                                    </div>

                                    {goals.financialSettings?.useCredit && (
                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t dark:border-gray-600 animate-fade-in">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dia do Fechamento da Fatura</label>
                                                <input 
                                                    type="number" 
                                                    name="cardClosingDay"
                                                    min="1" max="31"
                                                    value={goals.financialSettings.cardClosingDay} 
                                                    onChange={handleFinancialChange}
                                                    className={`w-full rounded-md border p-2 text-center dark:bg-gray-600 ${!isDayValid(goals.financialSettings.cardClosingDay) ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-500'}`}
                                                />
                                                {!isDayValid(goals.financialSettings.cardClosingDay) && <p className="text-[10px] text-red-500 mt-1">Inválido (1-31)</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dia do Vencimento da Fatura</label>
                                                <input 
                                                    type="number" 
                                                    name="cardDueDay"
                                                    min="1" max="31"
                                                    value={goals.financialSettings.cardDueDay} 
                                                    onChange={handleFinancialChange}
                                                    className={`w-full rounded-md border p-2 text-center dark:bg-gray-600 ${!isDayValid(goals.financialSettings.cardDueDay) ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-500'}`}
                                                />
                                                {!isDayValid(goals.financialSettings.cardDueDay) && <p className="text-[10px] text-red-500 mt-1">Inválido (1-31)</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Contract (NEW) */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 h-64 overflow-y-auto custom-scrollbar">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Termos de Serviço e Responsabilidade</h4>
                                
                                <ul className="list-disc pl-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                    <li><strong>1. Sua Responsabilidade:</strong> Você é o único responsável pelos produtos, preços e imagens cadastrados na sua loja. A FluxoClean fornece a tecnologia, mas não responde pelas ofertas publicadas.</li>
                                    <li><strong>2. Bloqueio por Inadimplência:</strong> O sistema funciona no modelo pré-pago/assinatura. A falta de pagamento ou não renovação do plano causará o bloqueio imediato do acesso ao sistema e a retirada do seu site do ar.</li>
                                    <li><strong>3. Natureza do Serviço:</strong> O sistema é uma ferramenta de gestão e não substitui sua assessoria contábil ou fiscal. Os cálculos são estimativos.</li>
                                    <li><strong>4. Dados e Privacidade:</strong> Nós protegemos a infraestrutura. Você é dono dos dados dos seus clientes e deve usá-los conforme a LGPD.</li>
                                    <li><strong>5. Integrações:</strong> Não nos responsabilizamos por falhas, banimentos ou instabilidades em serviços de terceiros (WhatsApp, Google, Mercado Pago).</li>
                                    <li><strong>6. Propriedade:</strong> A licença de uso é intransferível. É proibido copiar ou tentar fazer engenharia reversa do sistema.</li>
                                    <li><strong>7. Google Maps:</strong> Ao solicitar a gestão do perfil, você nos autoriza a editar seus dados em seu nome. A aprovação e permanência da ficha dependem das regras do Google.</li>
                                </ul>
                            </div>

                            <div className="text-center">
                                <a 
                                    href={contractUrl}
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                                >
                                    Ler Contrato Completo
                                </a>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                <input 
                                    type="checkbox" 
                                    id="terms" 
                                    checked={acceptedTerms} 
                                    onChange={(e) => setAcceptedTerms(e.target.checked)} 
                                    className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                />
                                <label htmlFor="terms" className="text-sm font-medium text-gray-800 dark:text-white cursor-pointer select-none">
                                    Li, compreendi e concordo com os Termos de Uso e Política de Privacidade da FluxoClean.
                                </label>
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
                                {forceSetup ? 'Concluir e Acessar' : 'Salvar Alterações'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
};

export default GoalsModal;
