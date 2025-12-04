
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { SAAS_API_URL } from '../config';
import { formatCurrencyNumber } from '../validation';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

interface SystemStatusModalProps {
    onClose: () => void;
    isFirstRun?: boolean;
}

interface Request {
    type: 'extension' | 'upgrade' | 'migrate' | 'monthly';
    status: 'pending' | 'waiting_payment' | 'approved' | 'rejected';
    requestedAt: string;
    amount: number;
    referenceCode: string;
    preferenceId?: string;
}

interface SubscriptionStatus {
    name: string;
    plan: 'trial' | 'single_tenant';
    status: 'active' | 'trial' | 'expired' | 'blocked';
    trialEndsAt: string;
    subscriptionEndsAt?: string;
    extensionCount: number;
    requests: Request[];
    monthlyPaymentDay?: number;
    lastPaymentDate?: string;
    billingDayConfigured?: boolean;
}

const PaymentModal: React.FC<{ request: Request, publicKey: string, onClose: () => void }> = ({ request, publicKey, onClose }) => {
    const [mpReady, setMpReady] = useState(false);

    useEffect(() => {
        if (publicKey) {
            initMercadoPago(publicKey, { locale: 'pt-BR' });
            setMpReady(true);
        }
    }, [publicKey]);

    const initialization = useMemo(() => ({ preferenceId: request.preferenceId! }), [request.preferenceId]);
    const customization = useMemo(() => ({ visual: { buttonBackground: 'default', borderRadius: '16px' } }), []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[130] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 flex flex-col items-center animate-fade-in relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Checkout Seguro</h3>
                <div className="w-full bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6 text-center border border-gray-100 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total a Pagar</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">R$ {formatCurrencyNumber(request.amount)}</p>
                </div>
                <div className="w-full min-h-[50px]">
                    {mpReady && request.preferenceId ? <Wallet initialization={initialization} customization={customization as any} /> : <div className="text-center">Carregando...</div>}
                </div>
            </div>
        </div>
    )
}

const ProvisioningModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[130] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-8 text-center animate-fade-in">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/50 mb-6">
                <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Solicitação Enviada!</h3>
            <p className="text-gray-500 dark:text-gray-300 mb-8 leading-relaxed">
                Aguardando provisionamento do sistema. Enquanto isso, <strong>continue utilizando seu sistema normalmente</strong> no ambiente atual.
            </p>
            <button 
                onClick={onClose}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg"
            >
                Entendi
            </button>
        </div>
    </div>
);

const SystemStatusModal: React.FC<SystemStatusModalProps> = ({ onClose, isFirstRun = false }) => {
    const { token } = useContext(AuthContext);
    const [statusData, setStatusData] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [paymentRequest, setPaymentRequest] = useState<Request | null>(null);
    const [mpPublicKey, setMpPublicKey] = useState<string>('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [showProvisioningSuccess, setShowProvisioningSuccess] = useState(false);
    const pollingRef = useRef<any>(null);
    
    // Single Tenant States
    const [selectedDay, setSelectedDay] = useState(5);
    const [isUpdatingDay, setIsUpdatingDay] = useState(false);

    const fetchStatus = async () => {
        try {
            const response = await fetch(`${SAAS_API_URL}/subscription/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStatusData(data);
                if (data.monthlyPaymentDay) setSelectedDay(data.monthlyPaymentDay);
                
                if (paymentRequest) {
                    // Check if a new approved payment exists in recent requests
                    const reqInStatus = data.requests.find((r: Request) => r.referenceCode === paymentRequest.referenceCode);
                    // For monthly, since we append a new request, if it's marked approved (by webhook logic update), we succeed
                    // Or if status changed to active/date updated.
                    if (reqInStatus && reqInStatus.status === 'approved') {
                        setPaymentRequest(null);
                        setShowSuccess(true);
                    }
                }
            }
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchStatus();
        pollingRef.current = setInterval(fetchStatus, 5000);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [paymentRequest]);

    const handleRequest = async (type: 'extension' | 'upgrade' | 'migrate' | 'monthly') => {
        try {
            const response = await fetch(`${SAAS_API_URL}/subscription/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ type })
            });
            const data = await response.json();
            if (response.ok) {
                if (data.publicKey) setMpPublicKey(data.publicKey);
                
                if (type === 'upgrade') {
                    // Specific logic for Upgrade request: Show Modal
                    setShowProvisioningSuccess(true);
                } else if (data.request && (type === 'extension' || type === 'migrate' || type === 'monthly')) {
                    setPaymentRequest(data.request);
                } else {
                    alert(data.message);
                }
                fetchStatus();
            } else { alert(data.message); }
        } catch (error) { alert('Erro de conexão.'); }
    };

    const handleUpdateDay = async () => {
        setIsUpdatingDay(true);
        try {
            await fetch(`${SAAS_API_URL}/subscription/billing-day`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ day: selectedDay })
            });
            
            // If it was first run, reload to apply changes cleanly and remove this modal state from URL/Session
            if (isFirstRun) {
                window.location.reload();
            } else {
                fetchStatus();
            }
        } catch (e) {
            alert("Erro ao salvar o dia.");
        } finally { setIsUpdatingDay(false); }
    };

    if (isLoading) return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[130] text-white">Carregando...</div>;

    if (showSuccess) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[130] p-4">
                <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
                    <h3 className="text-2xl font-bold text-green-600 mb-2">Sucesso!</h3>
                    <button onClick={onClose} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg">Continuar</button>
                </div>
            </div>
        );
    }

    if (showProvisioningSuccess) {
        return <ProvisioningModal onClose={() => setShowProvisioningSuccess(false)} />;
    }

    if (!statusData) return null;

    // Logic Variables
    const isSingleTenant = statusData.plan === 'single_tenant';
    
    // Trial logic
    const trialDaysRemaining = Math.ceil((new Date(statusData.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    // Single Tenant Logic
    const today = new Date();
    const billingDay = statusData.monthlyPaymentDay || 5;
    
    // Check if paid this month
    const lastPaid = statusData.lastPaymentDate ? new Date(statusData.lastPaymentDate) : null;
    const paidThisMonth = lastPaid && lastPaid.getMonth() === today.getMonth() && lastPaid.getFullYear() === today.getFullYear();
    
    // Check subscription validity (Migration grace period)
    const subEndsAt = statusData.subscriptionEndsAt ? new Date(statusData.subscriptionEndsAt) : null;
    
    // Coverage is active if paid this month OR if subscription date is still in the future
    const isCoverageActive = (subEndsAt && subEndsAt > today) || paidThisMonth;

    // Is Late? (Only if coverage expired AND today > billingDay + tolerance, visually just billingDay)
    const isLate = !isCoverageActive && today.getDate() > billingDay;

    // Calculate Next Due Date for Display
    let displayDueDate = new Date();
    displayDueDate.setDate(billingDay);
    
    // If today is past the billing day, normally next due date is next month.
    // However, if we are late (no coverage), we show THIS month's date (past) to indicate urgency.
    // If we have coverage (e.g. migration credit) and passed the day, we show next month.
    if (today.getDate() > billingDay && isCoverageActive) {
        displayDueDate.setMonth(displayDueDate.getMonth() + 1);
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
            {paymentRequest && mpPublicKey && <PaymentModal request={paymentRequest} publicKey={mpPublicKey} onClose={() => setPaymentRequest(null)} />}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className={`p-6 text-white ${isSingleTenant ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">
                            {isFirstRun ? '🎉 Bem-vindo ao Sistema Premium!' : 'Status do Sistema'}
                        </h2>
                        {!isFirstRun && <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1">✕</button>}
                    </div>
                    
                    {!isFirstRun && (
                        <div className="mt-4 bg-white/10 p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-xs uppercase font-semibold opacity-75">Plano</p>
                                <p className="text-xl font-bold">{isSingleTenant ? 'Single-Tenant Premium' : 'Trial / Teste'}</p>
                            </div>
                            <div className="text-right">
                                {isSingleTenant ? (
                                    <>
                                        <p className="text-xs opacity-75">Status da Mensalidade</p>
                                        <p className={`text-xl font-bold ${isCoverageActive ? 'text-green-300' : (isLate ? 'text-red-300' : 'text-white')}`}>
                                            {isCoverageActive ? 'Em dia' : (isLate ? 'Em Atraso' : 'A Vencer')}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-3xl font-bold">{trialDaysRemaining}d <span className="text-sm font-normal">restantes</span></p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900 space-y-6 overflow-y-auto">
                    {isFirstRun && (
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-200 mb-2">
                            <p>
                                Parabéns pela migração! Seu ambiente exclusivo já está pronto. 
                                Para finalizar, escolha o melhor dia para o vencimento da sua mensalidade.
                            </p>
                        </div>
                    )}

                    {isSingleTenant ? (
                        /* SINGLE TENANT VIEW */
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-lg mb-4">Configuração de Cobrança</h3>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <label className="text-sm whitespace-nowrap">Dia do Vencimento:</label>
                                        <select 
                                            value={selectedDay} 
                                            onChange={(e) => setSelectedDay(Number(e.target.value))}
                                            className="p-2 border rounded bg-gray-50 dark:bg-gray-700 flex-grow"
                                        >
                                            {Array.from({length: 28}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <button 
                                        onClick={handleUpdateDay} 
                                        disabled={isUpdatingDay || (!isFirstRun && selectedDay === statusData.monthlyPaymentDay)}
                                        className={`px-6 py-2 text-white rounded text-sm font-bold shadow-md w-full sm:w-auto ${isFirstRun ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'}`}
                                    >
                                        {isFirstRun ? 'Salvar e Acessar Painel 🚀' : 'Salvar Dia'}
                                    </button>
                                </div>
                            </div>

                            {!isFirstRun && (
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg">Mensalidade Atual</h3>
                                        <p className="text-sm text-gray-500">Vencimento: Dia {displayDueDate.getDate()}/{displayDueDate.getMonth()+1}</p>
                                        <p className="text-2xl font-bold text-green-600 mt-1">R$ 197,00</p>
                                    </div>
                                    {isCoverageActive ? (
                                        <span className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg">Pago / Ativo ✔</span>
                                    ) : (
                                        <button 
                                            onClick={() => handleRequest('monthly')}
                                            className={`px-6 py-3 rounded-lg font-bold text-white shadow-lg ${isLate ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                        >
                                            {isLate ? 'Pagar Agora (Atrasado)' : 'Pagar Mensalidade'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* MULTI TENANT VIEW (Standard) */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Same as before... Migration Logic handled by existing backend status check */}
                            {statusData.requests.some(r => r.type === 'upgrade' && r.status === 'waiting_payment') ? (
                                <div className="col-span-2 bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white text-center">
                                    <h3 className="font-bold text-2xl mb-2">Sistema Pronto!</h3>
                                    <p className="mb-4">Realize a migração para seu ambiente exclusivo.</p>
                                    <button onClick={() => handleRequest('migrate')} className="px-8 py-3 bg-white text-green-700 font-bold rounded-full">Migrar Sistema</button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border flex flex-col justify-between">
                                        <div className="relative">
                                            <h3 className="font-bold">Extensão de Testes</h3>
                                            <p className="text-sm text-gray-500">Mais 30 dias.</p>
                                            <span className="absolute top-0 right-0 bg-gray-200 dark:bg-gray-700 text-xs px-2 py-1 rounded-full">{statusData.extensionCount}/2</span>
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-lg font-bold text-indigo-600">R$ 97,00</p>
                                            <button onClick={() => handleRequest('extension')} disabled={statusData.extensionCount >= 2} className="mt-2 w-full py-2 bg-orange-500 text-white rounded font-bold disabled:bg-gray-300">Solicitar</button>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border flex flex-col justify-between relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-bl-lg">RECOMENDADO</div>
                                        <div>
                                            <h3 className="font-bold">Sistema Single-Tenant</h3>
                                            <p className="text-sm text-gray-500 mt-1">Sistema individual com banco de dados isolado e suporte prioritário.</p>
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-lg font-bold text-green-600">R$ 197,00 <span className="text-xs text-gray-400 font-normal">/ mês</span></p>
                                            <button onClick={() => handleRequest('upgrade')} disabled={statusData.requests.some(r => r.type === 'upgrade' && r.status === 'pending')} className="mt-2 w-full py-2 bg-indigo-600 text-white rounded font-bold disabled:bg-gray-300">
                                                {statusData.requests.some(r => r.type === 'upgrade' && r.status === 'pending') ? 'Aguardando Provisionamento' : 'Solicitar Upgrade'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemStatusModal;
