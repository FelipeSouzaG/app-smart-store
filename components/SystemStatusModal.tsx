
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { SAAS_API_URL } from '../config';
import { formatCurrencyNumber } from '../validation';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { KpiGoals } from '../types';

interface SystemStatusModalProps {
    onClose: () => void;
    isFirstRun?: boolean;
    initialPaymentRequest?: Request | null; 
    initialPublicKey?: string; 
    pendingServicePayload?: { type: string, payload: any } | null;
    onClearPendingPayload?: () => void;
    onOpenGoogleVerification?: () => void;
    onOpenGoogleForm?: () => void;
    onOpenEcommerceDetails?: () => void;
    onOpenEcommerceForm?: () => void;
    onOpenEcommercePolicies?: () => void; // Novo Handler
    onRefreshData?: () => Promise<void>;
}

interface Request {
    type: 'extension' | 'upgrade' | 'migrate' | 'monthly' | 'google_maps' | 'ecommerce';
    status: 'pending' | 'waiting_payment' | 'approved' | 'rejected' | 'completed';
    requestedAt: string;
    amount: number;
    referenceCode: string;
    preferenceId?: string;
}

interface SubscriptionStatus {
    name: string;
    plan: 'trial' | 'single_tenant';
    status: 'active' | 'trial' | 'expired' | 'blocked';
    createdAt: string; 
    trialEndsAt: string;
    subscriptionEndsAt?: string;
    extensionCount: number;
    requests: Request[];
    monthlyPaymentDay?: number;
    lastPaymentDate?: string;
    billingDayConfigured?: boolean;
}

const NotificationModal: React.FC<{ isOpen: boolean; type: 'success' | 'error' | 'info'; message: string; onClose: () => void }> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;
    let iconColor = 'text-gray-500';
    let bgColor = 'bg-gray-100';
    if (type === 'success') { iconColor = 'text-green-600'; bgColor = 'bg-green-100'; }
    if (type === 'error') { iconColor = 'text-red-600'; bgColor = 'bg-red-100'; }
    if (type === 'info') { iconColor = 'text-blue-600'; bgColor = 'bg-blue-100'; }
    return (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${bgColor} dark:bg-opacity-20`}>
                    <svg className={`h-6 w-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {type === 'success' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> :
                         type === 'error' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> :
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    </svg>
                </div>
                <h3 className="text-lg leading-6 font-bold text-center mb-2 text-gray-900 dark:text-white">{type === 'success' ? 'Sucesso!' : type === 'error' ? 'Atenção' : 'Informação'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 text-center mb-6">{message}</p>
                <button onClick={onClose} className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-colors">Entendi</button>
            </div>
        </div>
    );
};

const PaymentModal: React.FC<{ request: Request, publicKey: string, onClose: () => void }> = ({ request, publicKey, onClose }) => {
    const [mpReady, setMpReady] = useState(false);
    useEffect(() => { if (publicKey) { initMercadoPago(publicKey, { locale: 'pt-BR' }); setMpReady(true); } }, [publicKey]);
    const initialization = useMemo(() => ({ preferenceId: request.preferenceId! }), [request.preferenceId]);
    const customization = useMemo(() => ({ visual: { buttonBackground: 'default', borderRadius: '16px' } }), []);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-130 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 flex flex-col items-center animate-fade-in relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Cancelar e Fechar">✕</button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Checkout Seguro</h3>
                <div className="w-full bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6 text-center border border-gray-100 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total a Pagar</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">R$ {formatCurrencyNumber(request.amount)}</p>
                    <p className="text-sm text-gray-500 mt-1 uppercase font-bold">{request.type.replace('_', ' ')}</p>
                </div>
                <div className="w-full min-h-12.5 text-center">
                    {mpReady && request.preferenceId ? <Wallet initialization={initialization} customization={customization as any} /> : <span className="animate-pulse text-gray-400">Carregando Mercado Pago...</span>}
                </div>
                <p className="text-xs text-gray-400 mt-4 text-center">
                    Ao fechar esta janela sem concluir o pagamento, a solicitação será cancelada automaticamente e nenhum dado será salvo.
                </p>
            </div>
        </div>
    )
}

const SystemStatusModal: React.FC<SystemStatusModalProps> = (props) => {
    const { onClose, isFirstRun = false, initialPaymentRequest = null, initialPublicKey = '', pendingServicePayload, onClearPendingPayload, onOpenGoogleVerification, onOpenGoogleForm, onOpenEcommerceDetails, onOpenEcommerceForm, onOpenEcommercePolicies, onRefreshData } = props;
    
    const { token, apiCall, logout, user } = useContext(AuthContext); 
    const [statusData, setStatusData] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Payment Logic
    const [paymentRequest, setPaymentRequest] = useState<Request | null>(null);
    const [mpPublicKey, setMpPublicKey] = useState<string>('');
    
    // Success States
    const [showServiceSuccess, setShowServiceSuccess] = useState(false); 
    
    // Data & Config
    const [googleStatus, setGoogleStatus] = useState<'unverified' | 'verified' | 'not_found' | null>(null);
    const [storeGoals, setStoreGoals] = useState<KpiGoals | null>(null);
    
    const [notification, setNotification] = useState<{isOpen: boolean; type: 'success' | 'error' | 'info'; message: string}>({
        isOpen: false, type: 'success', message: ''
    });
    
    const pollingRef = useRef<any>(null);
    const [selectedDay, setSelectedDay] = useState(5);
    const [isUpdatingDay, setIsUpdatingDay] = useState(false);
    
    const isProcessingRef = useRef(false);

    // Initial Data Load
    useEffect(() => {
        if (initialPaymentRequest && initialPublicKey) {
            setMpPublicKey(initialPublicKey);
            setPaymentRequest(initialPaymentRequest);
        }
        fetchStatus(true);
        fetchGoogleStatus();
    }, [initialPaymentRequest, initialPublicKey]);

    // Handle Pending Service Payload (Auto-trigger payment)
    useEffect(() => {
        if (pendingServicePayload) {
            handleRequest(pendingServicePayload.type as any, pendingServicePayload.payload);
            if (onClearPendingPayload) onClearPendingPayload();
        }
    }, [pendingServicePayload]);

    // Polling for updates (Background sync)
    useEffect(() => {
        pollingRef.current = setInterval(() => fetchStatus(false), 5000);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [token]);

    // Payment Status Polling
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && paymentRequest) {
                checkPaymentStatus(paymentRequest, true); 
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [paymentRequest]);

    const fetchStatus = async (force = false) => {
        if (isProcessingRef.current && !force) return;

        try {
            const response = await fetch(`${SAAS_API_URL}/subscription/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 401) {
                if (pollingRef.current) clearInterval(pollingRef.current);
                return;
            }

            if (response.ok) {
                const data = await response.json();
                setStatusData(data);
                if (data.monthlyPaymentDay) setSelectedDay(data.monthlyPaymentDay);

                if (paymentRequest) {
                    const updatedReq = data.requests.find((r: Request) => r.referenceCode === paymentRequest.referenceCode);
                    if (updatedReq && (updatedReq.status === 'approved' || updatedReq.status === 'completed')) {
                        handlePaymentSuccess(paymentRequest);
                    }
                }
            }
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    const fetchGoogleStatus = async () => {
        try {
            const settings = await apiCall('settings', 'GET');
            if (settings) {
                setStoreGoals(settings);
                if (settings.googleBusiness) {
                    setGoogleStatus(settings.googleBusiness.status || 'unverified');
                }
            }
        } catch (e) { console.error(e); }
    };

    const checkPaymentStatus = async (request: Request, isAutoPoll: boolean) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            const response = await fetch(`${SAAS_API_URL}/subscription/check-payment/${request.referenceCode}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.status === 'approved') {
                handlePaymentSuccess(request);
            } 
        } catch (e) {
            console.error("Check payment error", e);
        } finally {
            isProcessingRef.current = false;
        }
    };

    const handlePaymentSuccess = (request: Request) => {
        setPaymentRequest(null);
        setShowServiceSuccess(true);
        fetchStatus(true);
        fetchGoogleStatus(); // Update local state (goals)
        if (onRefreshData) onRefreshData(); 
    };

    const handleManualClosePayment = async () => {
        if (!paymentRequest) return;
        const ref = paymentRequest.referenceCode;
        setPaymentRequest(null);
        try {
             await fetch(`${SAAS_API_URL}/subscription/request/${ref}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
             });
             setNotification({ isOpen: true, type: 'info', message: 'Operação cancelada.' });
             fetchStatus(true);
        } catch (e) { console.error(e); }
    };

    const handleRequest = async (type: 'extension' | 'upgrade' | 'migrate' | 'monthly' | 'google_maps' | 'ecommerce', payload?: any) => {
        if (type === 'google_maps' && !payload) {
             if (onOpenGoogleForm) onOpenGoogleForm();
             return;
        }
        if (type === 'ecommerce' && !payload) {
             if (onOpenEcommerceForm) onOpenEcommerceForm();
             return;
        }

        try {
            const bodyData = { type, payload };
            const response = await fetch(`${SAAS_API_URL}/subscription/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(bodyData)
            });
            const data = await response.json();
            if (response.ok) {
                if (data.publicKey) setMpPublicKey(data.publicKey);
                
                if (data.request) {
                    if (data.request.status === 'approved' || data.request.status === 'completed') {
                        handlePaymentSuccess(data.request);
                    } else {
                        setPaymentRequest(data.request);
                    }
                } 
                
                if (data.message && type === 'ecommerce') {
                     setNotification({ isOpen: true, type: 'success', message: data.message });
                }
            } else { 
                setNotification({ isOpen: true, type: 'error', message: data.message }); 
            }
        } catch (error) { 
            setNotification({ isOpen: true, type: 'error', message: 'Erro de conexão.' }); 
        }
    };

    const handleUpdateDay = async () => {
        setIsUpdatingDay(true);
        try {
            await fetch(`${SAAS_API_URL}/subscription/billing-day`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ day: selectedDay })
            });
            if (isFirstRun) { window.location.reload(); } else { setNotification({ isOpen: true, type: 'success', message: "Dia de pagamento atualizado!" }); }
        } catch (e) { setNotification({ isOpen: true, type: 'error', message: "Erro ao salvar." }); } finally { setIsUpdatingDay(false); }
    };

    const handleOpenStore = () => {
        const tenantName = storeGoals?.tenantName;
        if (tenantName) {
            const url = `https://${tenantName}.fluxoclean.com.br`;
            window.open(url, '_blank');
        } else {
             setNotification({ isOpen: true, type: 'error', message: 'Endereço da loja não encontrado. Contate o suporte.' });
        }
    };

    if (isLoading) return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-130 text-white">Carregando...</div>;

    if (showServiceSuccess) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-130 p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl text-center border border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sucesso!</h3>
                    <p className="text-gray-500 dark:text-gray-300 mb-6">Operação realizada.</p>
                    <button onClick={() => { setShowServiceSuccess(false); onClose(); }} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors">Continuar</button>
                </div>
            </div>
        );
    }

    if (!statusData) return null;

    // --- MAIN UI LAYOUT ---
    const isSingleTenant = statusData.plan === 'single_tenant';
    const isBlockedOrExpired = statusData.status === 'blocked' || statusData.status === 'expired';
    const isPaymentRequired = user?.paymentRequired; 

    const trialDaysRemaining = Math.max(0, Math.ceil((new Date(statusData.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
    const today = new Date();
    const lastPaid = statusData.lastPaymentDate ? new Date(statusData.lastPaymentDate) : null;
    const paidThisMonth = lastPaid && lastPaid.getMonth() === today.getMonth() && lastPaid.getFullYear() === today.getFullYear();
    const subEndsAt = statusData.subscriptionEndsAt ? new Date(statusData.subscriptionEndsAt) : null;
    const isCoverageActive = (subEndsAt && subEndsAt > today) || paidThisMonth;
    const isLate = !isCoverageActive && isBlockedOrExpired;

    // Google Maps Logic
    const mapsRequest = statusData.requests.find(r => r.type === 'google_maps');
    const isMapsExecutionPending = mapsRequest && mapsRequest.status === 'approved';
    const isMapsPaymentPending = mapsRequest && (mapsRequest.status === 'pending' || mapsRequest.status === 'waiting_payment');
    const isMapsCompleted = (mapsRequest && mapsRequest.status === 'completed') || googleStatus === 'verified';
    
    // Ecommerce Logic
    const ecommerceRequest = statusData.requests.find(r => r.type === 'ecommerce' && (r.status === 'completed' || r.status === 'approved'));
    // CHECK if policies are configured to unlock the button
    const isEcommerceConfigured = storeGoals?.ecommercePolicies?.configured === true;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-120 p-4">
            <NotificationModal isOpen={notification.isOpen} type={notification.type as any} message={notification.message} onClose={() => setNotification({ ...notification, isOpen: false })} />

            {paymentRequest && mpPublicKey && (
                <PaymentModal 
                    request={paymentRequest} 
                    publicKey={mpPublicKey} 
                    onClose={handleManualClosePayment}
                />
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className={`p-6 text-white ${isBlockedOrExpired ? 'bg-red-600' : (isSingleTenant ? 'bg-linear-to-r from-emerald-700 to-emerald-500' : 'bg-linear-to-r from-indigo-700 to-indigo-500')}`}>
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">{isPaymentRequired ? 'Acesso Bloqueado' : 'Status do Sistema'}</h2>
                        {!isFirstRun && !isPaymentRequired && <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors">✕</button>}
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900 space-y-6 overflow-y-auto">
                    {/* Setup de Primeiro Acesso ST */}
                    {(isFirstRun || (isSingleTenant && !statusData.billingDayConfigured)) && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📅 Configuração de Pagamento</h3>
                            <div className="flex gap-4 items-center">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Dia de Vencimento</label>
                                    <select value={selectedDay} onChange={(e) => setSelectedDay(Number(e.target.value))} className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-bold">
                                        {[1, 5, 10, 15, 20, 25].map(d => <option key={d} value={d}>Dia {d}</option>)}
                                    </select>
                                </div>
                                <button onClick={handleUpdateDay} disabled={isUpdatingDay} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 mt-6">{isUpdatingDay ? 'Salvando...' : 'Confirmar e Acessar'}</button>
                            </div>
                        </div>
                    )}

                    {!isFirstRun && (
                        <>
                             {/* Bloqueio de Pagamento */}
                             {isPaymentRequired && (
                                <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-200 dark:border-red-700 text-center">
                                    <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Renovação Necessária</h3>
                                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                                        Seu período de acesso expirou. Para continuar utilizando o sistema e manter sua loja online no ar, efetue o pagamento da mensalidade.
                                    </p>
                                    <button 
                                        onClick={() => handleRequest('monthly')} 
                                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 animate-pulse"
                                    >
                                        Pagar Mensalidade Agora
                                    </button>
                                </div>
                             )}

                             {/* Cards Normais */}
                             {!isPaymentRequired && (
                                <div className="space-y-4">
                                    {/* 1. Status Card */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase tracking-wider">Status da Conta</h3>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                                {isSingleTenant ? 'Plano Oficial Active' : 'Período de Degustação'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {isSingleTenant ? `Vencimento: Dia ${statusData.monthlyPaymentDay}` : `Restam ${trialDaysRemaining} dias`}
                                            </p>
                                        </div>
                                        {isSingleTenant && (
                                            isCoverageActive ? (
                                                <span className="px-6 py-2 bg-green-100 text-green-700 font-bold rounded-xl border border-green-200 flex items-center gap-2">
                                                    ✓ Em dia
                                                </span>
                                            ) : (
                                                <button onClick={() => handleRequest('monthly')} className={`px-6 py-2 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 ${isLate ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                                    {isLate ? 'Pagar Agora' : 'Renovar'}
                                                </button>
                                            )
                                        )}
                                    </div>

                                    {/* 2. Google Card */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                        {isMapsCompleted ? (
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-lg text-green-600 dark:text-green-400">Presença no Google Confirmada</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">A {storeGoals?.companyInfo.name} está visível no Google.</p>
                                                </div>
                                                <a href={storeGoals?.googleBusiness?.mapsUri || '#'} target="_blank" className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-xs">Ver Perfil no Google</a>
                                            </div>
                                        ) : isMapsExecutionPending ? (
                                            <div>
                                                <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400">Presença no Google Em Andamento</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Estamos configurando a {storeGoals?.companyInfo.name} no Google. Você será notificado quando estiver tudo pronto. Por favor, aguarde.</p>
                                            </div>
                                        ) : googleStatus === 'not_found' ? (
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Loja Invisível no Google</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 mb-4 leading-relaxed">
                                                    85% dos consumidores pesquisam lojas no Google antes de ir ao local. A {storeGoals?.companyInfo.name} pode estar perdendo vendas para concorrentes. 
                                                    Configuramos sua Loja no Google para marcar presença e estar no radar dos consumidores.
                                                </p>
                                                {isMapsPaymentPending ? (
                                                     <button onClick={() => setPaymentRequest(mapsRequest)} className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg shadow-md transition-transform hover:scale-105">
                                                        Concluir Pagamento (Pendente)
                                                    </button>
                                                ) : (
                                                    <button onClick={onOpenGoogleForm} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-transform hover:scale-105">
                                                        Solicitar Presença por R$ 297,00
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Presença no Google Não Verificada</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-sm">
                                                        85% dos consumidores pesquisam lojas no Google antes de ir ao local. Verifique se sua loja está visível.
                                                    </p>
                                                </div>
                                                <button onClick={onOpenGoogleVerification} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm whitespace-nowrap">
                                                    Verificar Presença
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Loja Online Card */}
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                        {ecommerceRequest ? (
                                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div>
                                                    <h3 className="font-bold text-lg text-purple-600 dark:text-purple-400">Loja Online Smart-Commerce</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                        {statusData.plan === 'trial' 
                                                            ? `Degustação de Loja Online em andamento. ${trialDaysRemaining} dias restantes.`
                                                            : 'Módulo loja online Ativo.'
                                                        }
                                                    </p>
                                                </div>
                                                
                                                {/* CONDITIONAL RENDER: Configurar vs Ver Loja */}
                                                {!isEcommerceConfigured ? (
                                                    <button 
                                                        onClick={onOpenEcommercePolicies} 
                                                        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-sm text-xs animate-pulse"
                                                    >
                                                        ⚠️ Configurar Políticas da Loja
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={handleOpenStore} 
                                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm text-xs"
                                                    >
                                                        Ver Loja Online
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            // Se não tiver request, mostra o botão para ativar, seja Trial ou Pago
                                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Loja Online Smart-Commerce</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-sm">
                                                        Acelere suas vendas abrindo as "Portas da {storeGoals?.companyInfo.name}" na internet. 
                                                        {statusData.plan === 'trial' ? ' Ative o modo "Loja Online" para vender no Site por 15 dias gratuitamente.' : ' Integre sua loja física com o mundo digital.'}
                                                    </p>
                                                </div>
                                                {statusData.plan === 'trial' ? (
                                                     <button onClick={onOpenEcommerceForm} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm whitespace-nowrap">
                                                        Ativar Loja Online
                                                    </button>
                                                ) : (
                                                    <button onClick={onOpenEcommerceDetails} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm text-xs">
                                                        Ativar Loja
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                             )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemStatusModal;
