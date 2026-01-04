
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { SAAS_API_URL } from '../config';
import { formatCurrencyNumber } from '../validation';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import GoogleVerificationModal from './GoogleVerificationModal';
import GoogleBusinessFormModal from './GoogleBusinessFormModal';
import EcommerceDetailModal from './EcommerceDetailModal'; 
import EcommerceFormModal from './EcommerceFormModal';
import SingleTenantDetailModal from './SingleTenantDetailModal'; 
import BundleMigrationModal from './BundleMigrationModal';
import { KpiGoals } from '../types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SystemStatusModalProps {
    onClose: () => void;
    isFirstRun?: boolean;
    initialPaymentRequest?: Request | null; 
    initialPublicKey?: string; 
}

interface Request {
    type: 'extension' | 'upgrade' | 'migrate' | 'monthly' | 'google_maps' | 'ecommerce';
    status: 'pending' | 'waiting_payment' | 'approved' | 'rejected' | 'completed' | 'waiting_switch';
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
    singleTenantUrl?: string; 
}

// ============================================================================
// SUB-COMPONENTES VISUAIS (MODAIS AUXILIARES)
// ============================================================================

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

const EcommerceLossWarningModal: React.FC<{ isOpen: boolean; onConfirmBasic: () => void; onSwitchToBundle: () => void; onClose: () => void }> = ({ isOpen, onConfirmBasic, onSwitchToBundle, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-180 p-4 animate-fade-in">
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border-2 border-red-500 relative">
                 <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/50 mb-6 text-red-600 dark:text-red-400">
                     <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Atenção: Perda de Loja Virtual</h3>
                 <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                     Você possui uma loja virtual ativa no período de testes. Ao migrar para o plano <strong>Básico (Sem E-commerce)</strong>, sua loja atual será desativada e os dados perdidos.
                     <br/><br/>
                     Para manter sua loja, recomendamos o plano <strong>Exclusive + E-commerce</strong>.
                 </p>
                 <div className="space-y-3">
                     <button onClick={onSwitchToBundle} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg">Solicitar Exclusive + E-commerce</button>
                     <button onClick={onConfirmBasic} className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600">Continuar sem E-commerce (Básico)</button>
                     <button onClick={onClose} className="text-gray-400 text-xs hover:underline mt-2">Cancelar</button>
                 </div>
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

// CENA 7 - PASSO 1: Provisionamento em Andamento (Pagamento OK / status 'approved')
const ProvisioningInProgressModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-130 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-8 text-center animate-fade-in">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/50 mb-6"><svg className="h-8 w-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg></div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Pagamento Confirmado!</h3>
            <p className="text-gray-500 dark:text-gray-300 mb-8 leading-relaxed">
                Nossa equipe técnica já iniciou o provisionamento do seu servidor exclusivo. Esse processo pode levar algumas horas.<br/><br/>
                Enquanto isso, <strong>continue utilizando o sistema normalmente aqui</strong>. Avisaremos quando seu novo ambiente estiver pronto!
            </p>
            <button onClick={onClose} className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg">Entendi, Continuar Usando</button>
        </div>
    </div>
);

// CENA 7 - PASSO 3: Migração Pronta (status 'waiting_switch')
const MigrationReadyModal: React.FC<{ url: string; onMigrate: () => void }> = ({ url, onMigrate }) => (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-130 p-4">
         <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-fade-in border-4 border-indigo-500">
             <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-indigo-100 dark:bg-indigo-900/50 mb-6 text-indigo-600 dark:text-indigo-400">
                 <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
             </div>
             <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Está Pronto! 🚀</h3>
             <p className="text-gray-600 dark:text-gray-300 mb-6">
                 Seu Sistema Exclusive foi provisionado com sucesso.
                 <br/><br/>
                 Clique abaixo para migrar agora. Você será desconectado e deverá fazer login no novo endereço: <br/>
                 <span className="font-mono text-xs text-indigo-500 block mt-2">{url}</span>
             </p>
             <button onClick={onMigrate} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg transition-transform hover:scale-105">
                 ACESSAR AMBIENTE ISOLADO
             </button>
         </div>
    </div>
);

// ============================================================================
// MAIN COMPONENT LOGIC
// ============================================================================

const SystemStatusModal: React.FC<SystemStatusModalProps> = ({ onClose, isFirstRun = false, initialPaymentRequest = null, initialPublicKey = '' }) => {
    const { token, apiCall, logout } = useContext(AuthContext); 
    const [statusData, setStatusData] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Payment Logic
    const [paymentRequest, setPaymentRequest] = useState<Request | null>(null);
    const [mpPublicKey, setMpPublicKey] = useState<string>('');
    
    // Success States
    const [showServiceSuccess, setShowServiceSuccess] = useState(false); 
    const [showProvisioningInProgress, setShowProvisioningInProgress] = useState(false); 
    const [showMigrationReady, setShowMigrationReady] = useState(false); 
    
    // Feature Modals Visibility
    const [showGoogleVerification, setShowGoogleVerification] = useState(false);
    const [showGoogleForm, setShowGoogleForm] = useState(false);
    const [showEcommerceDetail, setShowEcommerceDetail] = useState(false);
    const [showEcommerceForm, setShowEcommerceForm] = useState(false); 
    const [showSingleTenantDetail, setShowSingleTenantDetail] = useState(false); 
    const [showBundleMigration, setShowBundleMigration] = useState(false);
    const [showEcomLossWarning, setShowEcomLossWarning] = useState(false);
    
    // Data & Config
    const [googleStatus, setGoogleStatus] = useState<'unverified' | 'verified' | 'not_found' | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [storeGoals, setStoreGoals] = useState<KpiGoals | null>(null);
    
    const [notification, setNotification] = useState<{isOpen: boolean; type: 'success' | 'error' | 'info'; message: string}>({
        isOpen: false, type: 'success', message: ''
    });
    
    const pollingRef = useRef<any>(null);
    const [selectedDay, setSelectedDay] = useState(5);
    const [isUpdatingDay, setIsUpdatingDay] = useState(false);
    
    const isProcessingRef = useRef(false);

    // 1. Initial Data Load & Deep Link Handling
    useEffect(() => {
        if (initialPaymentRequest && initialPublicKey) {
            setMpPublicKey(initialPublicKey);
            setPaymentRequest(initialPaymentRequest);
        }
        fetchStatus(true);
        fetchGoogleStatus();
    }, [initialPaymentRequest, initialPublicKey]);

    // 2. Polling for updates (Background sync)
    useEffect(() => {
        pollingRef.current = setInterval(() => fetchStatus(false), 5000);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [token]);

    // 3. Payment Status Polling (When modal is open or tab focused)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && paymentRequest) {
                checkPaymentStatus(paymentRequest, true); // Auto check
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [paymentRequest]);

    // --- API FUNCTIONS ---

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

                // Auto-detection of completion via polling (e.g. webhook updated DB)
                if (paymentRequest) {
                    const updatedReq = data.requests.find((r: Request) => r.referenceCode === paymentRequest.referenceCode);
                    if (updatedReq && (updatedReq.status === 'approved' || updatedReq.status === 'completed' || updatedReq.status === 'waiting_switch')) {
                        handlePaymentSuccess(paymentRequest);
                    }
                }

                // CENA 7 - PASSO 3: Checagem de Migração Pronta (waiting_switch)
                // Se existe uma request com status 'waiting_switch', o usuário deve migrar.
                const migrationReadyReq = data.requests.find((r: Request) => r.type === 'upgrade' && r.status === 'waiting_switch');
                if (migrationReadyReq && data.plan !== 'single_tenant') {
                    setShowMigrationReady(true);
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
                    setIsDismissed(settings.googleBusiness.dismissedPrompt === true);
                }
            }
        } catch (e) { console.error(e); }
    };

    // --- PAYMENT HANDLING ---

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
        if (request.type === 'upgrade' || request.type === 'migrate') {
            setShowProvisioningInProgress(true);
        } else {
            setShowServiceSuccess(true);
        }
        fetchStatus(true); // Sync UI
    };

    const handleManualClosePayment = async () => {
        if (!paymentRequest) return;
        
        const ref = paymentRequest.referenceCode;
        setPaymentRequest(null); // Close UI immediately

        // ABORT OPERATION LOGIC: DELETE PENDING REQUEST
        try {
             await fetch(`${SAAS_API_URL}/subscription/request/${ref}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
             });
             setNotification({ isOpen: true, type: 'info', message: 'Operação cancelada. Nenhuma cobrança foi gerada.' });
             fetchStatus(true);
        } catch (e) {
             console.error("Error cancelling request", e);
        }
    };

    // --- FINAL MIGRATION HANDLER ---
    
    const handleFinalizeMigration = async () => {
        try {
            const response = await fetch(`${SAAS_API_URL}/subscription/finalize-migration`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                logout(); // Logout central
                window.location.href = data.redirectUrl; // Redirect to isolated app
            } else {
                setNotification({ isOpen: true, type: 'error', message: 'Erro ao migrar. Contate o suporte.' });
            }
        } catch (e) {
            setNotification({ isOpen: true, type: 'error', message: 'Erro de conexão.' });
        }
    };

    // --- SERVICE REQUEST FLOWS ---

    const handleRequest = async (type: 'extension' | 'upgrade' | 'migrate' | 'monthly' | 'google_maps' | 'ecommerce', payload?: any) => {
        if (type === 'google_maps' && !payload) {
            setShowGoogleVerification(false);
            setShowGoogleForm(true); 
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
                    setPaymentRequest(data.request); // Open Payment Modal
                } 
            } else { 
                setNotification({ isOpen: true, type: 'error', message: data.message }); 
            }
        } catch (error) { 
            setNotification({ isOpen: true, type: 'error', message: 'Erro de conexão.' }); 
        }
    };

    // --- FORM SUBMISSION HANDLERS ---

    const handleGoogleFormSubmit = (formData: any) => {
        setShowGoogleForm(false);
        handleRequest('google_maps', formData);
    };

    const handleEcommerceFormSubmit = (formData: any) => {
        setShowEcommerceForm(false);
        // Standard Ecommerce Request (For Existing Exclusive or Trial)
        handleRequest('ecommerce', formData);
    };

    const handleBundleSubmit = (formData: any) => {
        setShowBundleMigration(false);
        handleRequest('upgrade', formData);
    }

    const handleUpdateDay = async () => {
        setIsUpdatingDay(true);
        try {
            await fetch(`${SAAS_API_URL}/subscription/billing-day`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ day: selectedDay })
            });
            if (isFirstRun) {
                window.location.reload(); 
            } else {
                setNotification({ isOpen: true, type: 'success', message: "Dia de pagamento atualizado!" });
            }
        } catch (e) {
            setNotification({ isOpen: true, type: 'error', message: "Erro ao salvar." });
        } finally { setIsUpdatingDay(false); }
    };

    // --- UPGRADE CHECK LOGIC (DATA LOSS WARNING) ---

    const handleCheckUpgradeBasic = () => {
        const hasActiveTrialEcommerce = statusData?.requests?.some((r: any) => 
            r.type === 'ecommerce' && (r.status === 'completed' || r.status === 'approved')
        );

        if (hasActiveTrialEcommerce) {
            setShowSingleTenantDetail(false);
            setShowEcomLossWarning(true);
        } else {
            setShowSingleTenantDetail(false);
            handleRequest('upgrade', { plan: 'basic' });
        }
    };

    // --- RENDER ---

    if (isLoading) return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-130 text-white">Carregando...</div>;

    // Feature Modals
    if (showGoogleVerification) return <GoogleVerificationModal isOpen={true} onClose={() => setShowGoogleVerification(false)} onComplete={() => { setShowGoogleVerification(false); fetchGoogleStatus(); }} onRequestService={(t) => { setShowGoogleVerification(false); if(t === 'ecommerce') setShowEcommerceDetail(true); else setShowGoogleForm(true); }} />;
    if (showGoogleForm && storeGoals) return <GoogleBusinessFormModal isOpen={true} onClose={() => setShowGoogleForm(false)} onSubmit={handleGoogleFormSubmit} goals={storeGoals} />;
    if (showEcommerceDetail) return <EcommerceDetailModal isOpen={true} onClose={() => setShowEcommerceDetail(false)} onRequest={() => { setShowEcommerceDetail(false); setShowEcommerceForm(true); }} isTrial={statusData?.plan === 'trial'} />;
    if (showEcommerceForm && storeGoals) return <EcommerceFormModal isOpen={true} onClose={() => setShowEcommerceForm(false)} onSubmit={handleEcommerceFormSubmit} goals={storeGoals} isTrial={statusData?.plan === 'trial'} extensionCount={statusData?.extensionCount || 0} trialEndsAt={statusData?.trialEndsAt || ''} />;
    
    if (showSingleTenantDetail) return <SingleTenantDetailModal isOpen={true} onClose={() => setShowSingleTenantDetail(false)} onRequestUpgrade={handleCheckUpgradeBasic} onRequestBundle={() => { setShowSingleTenantDetail(false); setShowBundleMigration(true); }} />;
    if (showBundleMigration) return <BundleMigrationModal isOpen={true} onClose={() => setShowBundleMigration(false)} onSubmit={handleBundleSubmit} tenantName={storeGoals?.tenantName || storeGoals?.companyInfo.name || 'loja'} />;

    if (showEcomLossWarning) return <EcommerceLossWarningModal 
        isOpen={true}
        onConfirmBasic={() => { setShowEcomLossWarning(false); handleRequest('upgrade', { plan: 'basic' }); }}
        onSwitchToBundle={() => { setShowEcomLossWarning(false); setShowBundleMigration(true); }}
        onClose={() => setShowEcomLossWarning(false)}
    />;

    // Success Modals
    if (showServiceSuccess) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-130 p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl text-center border border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Serviço Ativado!</h3>
                    <p className="text-gray-500 dark:text-gray-300 mb-6">Sua solicitação foi processada. As novas funcionalidades já estão disponíveis.</p>
                    <button onClick={() => { setShowServiceSuccess(false); onClose(); window.location.reload(); }} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors">Continuar</button>
                </div>
            </div>
        );
    }

    if (showProvisioningInProgress) {
        return <ProvisioningInProgressModal onClose={() => { setShowProvisioningInProgress(false); onClose(); }} />;
    }

    if (showMigrationReady && statusData?.singleTenantUrl) {
        return <MigrationReadyModal url={statusData.singleTenantUrl} onMigrate={handleFinalizeMigration} />;
    }

    if (!statusData) return null;

    // --- MAIN UI LAYOUT ---
    const isSingleTenant = statusData.plan === 'single_tenant';
    const trialDaysRemaining = Math.max(0, Math.ceil((new Date(statusData.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
    const today = new Date();
    // const billingDay = statusData.monthlyPaymentDay || 5; 
    const lastPaid = statusData.lastPaymentDate ? new Date(statusData.lastPaymentDate) : null;
    const paidThisMonth = lastPaid && lastPaid.getMonth() === today.getMonth() && lastPaid.getFullYear() === today.getFullYear();
    const subEndsAt = statusData.subscriptionEndsAt ? new Date(statusData.subscriptionEndsAt) : null;
    const isCoverageActive = (subEndsAt && subEndsAt > today) || paidThisMonth;
    // const isLate = !isCoverageActive && today.getDate() > billingDay;

    // Simplified checks for UI rendering logic
    const isLate = !isCoverageActive && (statusData.status === 'expired' || statusData.status === 'blocked');

    const isSecondExtensionAllowed = statusData.extensionCount === 1 && trialDaysRemaining <= 5;
    const isExtensionAllowed = statusData.extensionCount === 0 || isSecondExtensionAllowed;

    const mapsRequest = statusData.requests.find(r => r.type === 'google_maps' && (r.status === 'completed' || r.status === 'approved'));
    const ecommerceRequest = statusData.requests.find(r => r.type === 'ecommerce' && (r.status === 'completed' || r.status === 'approved'));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-120 p-4">
            <NotificationModal isOpen={notification.isOpen} type={notification.type} message={notification.message} onClose={() => setNotification({ ...notification, isOpen: false })} />

            {paymentRequest && mpPublicKey && (
                <PaymentModal 
                    request={paymentRequest} 
                    publicKey={mpPublicKey} 
                    onClose={handleManualClosePayment}
                />
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className={`p-6 text-white ${isSingleTenant ? 'bg-linear-to-r from-emerald-700 to-emerald-500' : 'bg-linear-to-r from-indigo-700 to-indigo-500'}`}>
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">{isFirstRun ? 'Bem-vindo ao Plano Exclusive!' : 'Status do Sistema'}</h2>
                        {!isFirstRun && <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors">✕</button>}
                    </div>
                    {!isFirstRun && (
                        <div className="mt-4 bg-white/10 p-4 rounded-lg flex justify-between items-center border border-white/10">
                            <div>
                                <p className="text-xs uppercase font-semibold opacity-75">Ambiente</p>
                                <p className="text-xl font-bold">{isSingleTenant ? 'Premium Exclusive' : 'Degustação Compartilhada'}</p>
                            </div>
                            <div className="text-right">
                                {isSingleTenant ? (
                                    <>
                                        <p className="text-xs opacity-75">Mensalidade</p>
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

                    {!isFirstRun && !isDismissed && (
                        <>
                             {/* GOOGLE MAPS CARD */}
                             {mapsRequest ? (
                                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20`}>
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                            <span>📍</span> Google Maps Ativo
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            Sua loja está visível no Google.
                                        </p>
                                    </div>
                                </div>
                             ) : googleStatus === 'unverified' || googleStatus === 'not_found' ? (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div>
                                        <h4 className="font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                                            <span className="text-xl">⚠️</span> Presença no Google Maps
                                        </h4>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">Sua empresa precisa ser verificada para aparecer nas buscas.</p>
                                    </div>
                                    <button onClick={() => setShowGoogleVerification(true)} className="px-5 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg shadow-md whitespace-nowrap">Verificar Agora</button>
                                </div>
                             ) : null}

                             {/* ECOMMERCE CARD */}
                             {(googleStatus === 'verified' || mapsRequest?.status === 'completed') && (
                                ecommerceRequest ? (
                                    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20`}>
                                        <div>
                                            <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                                <span>🛍️</span> {statusData.plan === 'trial' ? 'Loja Virtual (Degustação)' : 'Loja Virtual Ativa'}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                Sua loja está online.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div>
                                            <h4 className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2"><span>🛒</span> Venda Online 24h</h4>
                                            <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">Transforme seu estoque em uma vitrine virtual automática.</p>
                                        </div>
                                        <button onClick={() => setShowEcommerceDetail(true)} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md whitespace-nowrap">Conhecer Loja Virtual</button>
                                    </div>
                                )
                             )}
                        </>
                    )}

                    {/* Single Tenant / Mensalidade Cards */}
                    {!isFirstRun && (
                        isSingleTenant ? (
                             <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Mensalidade Exclusive</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Próximo Vencimento: Dia {statusData.monthlyPaymentDay}</p>
                                </div>
                                {isCoverageActive ? (
                                    <span className="px-6 py-3 bg-green-100 text-green-700 font-bold rounded-xl border border-green-200 flex items-center gap-2">
                                        ✓ Plano Ativo
                                    </span>
                                ) : (
                                    <button onClick={() => handleRequest('monthly')} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 ${isLate ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                        {isLate ? 'Pagar Agora (Atrasado)' : 'Pagar Mensalidade'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            // Trial Options
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 transition-colors shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-indigo-900 dark:text-white">Manutenção do Trial</h4>
                                        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold">{2 - statusData.extensionCount} restantes</span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        {statusData.extensionCount === 1 
                                            ? "Segunda extensão disponível apenas nos últimos 5 dias." 
                                            : "Precisa de mais tempo? Adicione 30 dias por R$ 97,00."}
                                    </p>
                                    
                                    {isExtensionAllowed && statusData.extensionCount < 2 ? (
                                        <button 
                                            onClick={() => handleRequest('extension')} 
                                            className="w-full py-2 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                        >
                                            Solicitar Extensão
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setNotification({ 
                                                isOpen: true, 
                                                type: 'info', 
                                                message: statusData.extensionCount >= 2 
                                                    ? 'Você já utilizou todas as extensões permitidas.' 
                                                    : 'A segunda extensão só pode ser solicitada nos últimos 5 dias do período atual.' 
                                            })}
                                            className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 font-bold rounded-lg cursor-help border border-transparent"
                                        >
                                            {statusData.extensionCount >= 2 ? 'Limite Atingido' : 'Aguarde os 5 dias finais'}
                                        </button>
                                    )}
                                </div>

                                <div className="bg-linear-to-br from-indigo-900 to-purple-800 p-5 rounded-xl text-white shadow-lg relative overflow-hidden">
                                     <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg tracking-widest">EXCLUSIVE</div>
                                    <h4 className="font-bold text-lg mb-1">Migrar para Exclusive</h4>
                                    <p className="text-indigo-100 text-sm mb-4">Infraestrutura dedicada e banco de dados isolado.</p>
                                    <button 
                                        onClick={() => setShowSingleTenantDetail(true)}
                                        className="w-full py-3 bg-white text-indigo-900 font-bold rounded-lg hover:bg-gray-100 shadow-md transition-colors"
                                    >
                                        Ver Planos e Migrar
                                    </button>
                                </div>
                            </div>
                        )
                    )}

                     {/* Histórico de Solicitações */}
                    {!isFirstRun && (
                        <div className="mt-8">
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Histórico Recente</h4>
                            <div className="space-y-3">
                                {statusData.requests
                                    .filter(r => r.status !== 'pending') 
                                    .slice().reverse().slice(0, 3)
                                    .map((req, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200 capitalize">{req.type.replace('_', ' ')}</p>
                                            <p className="text-xs text-gray-500">{new Date(req.requestedAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                req.status === 'approved' || req.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                                req.status === 'waiting_payment' ? 'bg-yellow-100 text-yellow-700' : 
                                                req.status === 'waiting_switch' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {req.status === 'waiting_payment' ? 'Processando' : req.status === 'waiting_switch' ? 'Pronto p/ Migrar' : req.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {statusData.requests.filter(r => r.status !== 'pending').length === 0 && <p className="text-center text-sm text-gray-400 italic">Nenhuma solicitação concluída.</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemStatusModal;
