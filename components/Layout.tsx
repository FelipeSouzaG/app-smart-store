
import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { SAAS_API_URL } from '../config';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Sales from './Sales';
import SalesHistory from './SalesHistory';
import EcommerceOrders from './EcommerceOrders';
import Cash from './Cash';
import Purchases from './Purchases';
import Costs from './Costs';
import ServiceOrders from './ServiceOrders';
import Products from './Products';
import Services from './Services';
import Customers from './Customers';
import Suppliers from './Suppliers';
import Users from './Users';
import Profile from './Profile';
import SystemStatusModal from './SystemStatusModal';
import WelcomeModal from './WelcomeModal';
import GoalsModal from './GoalsModal';
import GoogleVerificationModal from './GoogleVerificationModal';
import GoogleBusinessFormModal from './GoogleBusinessFormModal';
import GoogleSuccessModal from './GoogleSuccessModal';
import EcommerceDetailModal from './EcommerceDetailModal';
import EcommerceFormModal from './EcommerceFormModal';
import BundleMigrationModal from './BundleMigrationModal';
import GoogleVerificationAlertModal, { GrowthVariant } from './GoogleVerificationAlertModal';
import BroadcastModal from './BroadcastModal';
import EcommercePoliciesModal from './EcommercePoliciesModal';

import { 
    CashTransaction, Service, Product, PurchaseOrder, ServiceOrder, TicketSale, User, Customer, Supplier, KpiGoals, TurnoverPeriod, FinancialAccount, TransactionStatus
} from '../types';

// Placeholder/Inline Definitions for missing components in context if they are simple
const PaymentSuccessModal: React.FC<{ type: string, onClose: () => void, tenantName?: string }> = ({ type, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-130 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl text-center border border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">Pagamento Confirmado!</h3>
            <p className="text-gray-500 dark:text-gray-300 mb-6">Referência: {type}</p>
            <button onClick={onClose} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors">Continuar</button>
        </div>
    </div>
);

// ... (Outros componentes auxiliares como NotificationModal e alertas mantidos) ...

const NotificationModal: React.FC<{ isOpen: boolean; type: 'success' | 'error' | 'info'; message: string; onClose: () => void }> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
                <h3 className="text-lg leading-6 font-bold text-center mb-2 text-gray-900 dark:text-white">{type === 'success' ? 'Sucesso!' : type === 'error' ? 'Atenção' : 'Informação'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 text-center mb-6">{message}</p>
                <button onClick={onClose} className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-colors">Entendi</button>
            </div>
        </div>
    );
};

const ExpirationAlertModal: React.FC<{ isOpen: boolean; variant: 'trial' | 'monthly'; daysLeft: number; onAction: () => void; onRemindLater: () => void }> = ({ isOpen, variant, daysLeft, onAction, onRemindLater }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-140 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full text-center">
                <h3 className="text-xl font-bold text-red-600 mb-2">Atenção: Vencimento Próximo</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">Seu plano {variant === 'trial' ? 'de degustação' : 'mensal'} expira em <strong>{daysLeft} dias</strong>.</p>
                <button onClick={onAction} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold mb-2">Renovar Agora</button>
                <button onClick={onRemindLater} className="text-sm text-gray-500 hover:underline">Lembrar depois</button>
            </div>
        </div>
    );
};

const LowMarginAlertModal: React.FC<{ isOpen: boolean; onReview: () => void; onIgnore: () => void }> = ({ isOpen, onReview, onIgnore }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-140 flex items-center justify-center bg-black bg-opacity-70 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full text-center">
                <h3 className="text-lg font-bold text-yellow-600 mb-2">Margem de Lucro Baixa</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">Alguns produtos estão com margem abaixo do ideal configurado.</p>
                <button onClick={onReview} className="w-full py-2 bg-yellow-500 text-white rounded-lg font-bold mb-2">Revisar Produtos</button>
                <button onClick={onIgnore} className="text-sm text-gray-500 hover:underline">Ignorar por enquanto</button>
            </div>
        </div>
    );
};

const EcommerceLossWarningModal: React.FC<{ isOpen: boolean; onConfirmBasic: () => void; onSwitchToBundle: () => void; onClose: () => void }> = ({ isOpen, onConfirmBasic, onSwitchToBundle, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black bg-opacity-80 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full text-center">
                <h3 className="text-xl font-bold text-red-600 mb-4">Perda de Loja Virtual</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">Ao mudar para o plano Básico, sua loja virtual será desativada. Recomendamos o plano Bundle.</p>
                <button onClick={onSwitchToBundle} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold mb-2">Ver Plano Bundle</button>
                <button onClick={onConfirmBasic} className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-bold mb-2">Continuar Básico</button>
                <button onClick={onClose} className="text-sm text-gray-500 hover:underline">Cancelar</button>
            </div>
        </div>
    );
};

const SystemStatusFeedbackModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
                <p className="text-gray-800 dark:text-white mb-4">Obrigado pelo feedback!</p>
                <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Fechar</button>
            </div>
        </div>
    );
};

const STATIC_ACCOUNTS: FinancialAccount[] = [
    { id: 'cash-box', bankName: 'Dinheiro em Caixa', balance: 0, paymentMethods: [], receivingRules: [] },
    { id: 'bank-main', bankName: 'Conta Bancária', balance: 0, paymentMethods: [{id: 'pix', name: 'Pix', type: 'Pix'}, {id: 'debit', name: 'Débito', type: 'Debit'}], receivingRules: [] },
    { id: 'credit-main', bankName: 'Cartão de Crédito', balance: 0, paymentMethods: [], receivingRules: [] },
    { id: 'boleto', bankName: 'Boletos a Pagar', balance: 0, paymentMethods: [], receivingRules: [] }
];

const Layout: React.FC = () => {
    const { user, token, apiCall, updateUser: updateUserInContext, logout } = React.useContext(AuthContext);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isBootstrapComplete, setIsBootstrapComplete] = useState(false);
    const [activePage, setActivePage] = useState(user?.role === 'technician' ? 'sales' : 'dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Data State
    const [transactions, setTransactions] = useState<CashTransaction[]>([]);
    const [creditTransactions, setCreditTransactions] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>(STATIC_ACCOUNTS); 
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
    const [ticketSales, setTicketSales] = useState<TicketSale[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [goals, setGoals] = useState<KpiGoals>({
        isSetupComplete: false,
        predictedAvgMargin: 40, netProfit: 5000, inventoryTurnoverGoal: 1.5, effectiveTaxRate: 4.0, feePix: 0, feeDebit: 1.5, feeCreditSight: 3.0, feeCreditInstallment: 12.0, minContributionMargin: 20.0, fixedCostAllocation: 15.0, autoApplyDiscount: true, turnoverPeriod: TurnoverPeriod.MONTHLY, stockThresholds: { riskMin: 1, riskMax: 15, safetyMax: 45 }, discountSafety: 0, discountRisk: 5, discountExcess: 15,
        companyInfo: { name: '', cnpjCpf: '', phone: '', email: '', address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' } },
        financialSettings: { useBank: false, useCredit: false, cardClosingDay: 1, cardDueDay: 10 },
        googleBusiness: { status: 'unverified', hasExternalEcommerce: false }
    });
    
    // Broadcast State
    const [broadcasts, setBroadcasts] = useState<any[]>([]);

    // Modal & Logic States
    const [showWelcomeModal, setShowWelcomeModal] = useState(false); 
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [isSystemBlocked, setIsSystemBlocked] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [isFirstRunST, setIsFirstRunST] = useState(false);
    const [growthAlertVariant, setGrowthAlertVariant] = useState<GrowthVariant | null>(null);
    const [showGoogleVerification, setShowGoogleVerification] = useState(false);
    const [showGoogleForm, setShowGoogleForm] = useState(false); 
    const [showGoogleSuccess, setShowGoogleSuccess] = useState(false);
    const [googleSuccessLink, setGoogleSuccessLink] = useState('');
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showEcommerceDetail, setShowEcommerceDetail] = useState(false); 
    const [showEcommerceForm, setShowEcommerceForm] = useState(false);
    const [showEcommercePolicies, setShowEcommercePolicies] = useState(false);
    
    // NEW MODALS
    const [showBundleMigrationModal, setShowBundleMigrationModal] = useState(false);
    const [showEcomLossWarning, setShowEcomLossWarning] = useState(false);

    const [expirationAlert, setExpirationAlert] = useState<{ isOpen: boolean; variant: 'trial' | 'monthly'; daysLeft: number }>({ isOpen: false, variant: 'trial', daysLeft: 0 });
    const [notification, setNotification] = useState<{isOpen: boolean; type: 'success' | 'error'; message: string}>({ isOpen: false, type: 'success', message: '' });
    const [isTrialMode, setIsTrialMode] = useState(true);
    
    const [showLowMarginAlert, setShowLowMarginAlert] = useState(false);
    const [passLowMarginFilter, setPassLowMarginFilter] = useState(false);

    const [billingStatusData, setBillingStatusData] = useState<any>(null);
    const [immediatePaymentRequest, setImmediatePaymentRequest] = useState<any>(null); 
    const [immediatePublicKey, setImmediatePublicKey] = useState<string>(''); 
    const [paymentSuccessType, setPaymentSuccessType] = useState<string | null>(null);
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    
    // NEW STATE: Pending Service Payload for Handover to Payment
    const [pendingServicePayload, setPendingServicePayload] = useState<{ type: string, payload: any } | null>(null);

    const checkCriticalDataMissing = (settings: KpiGoals) => {
         return !settings.companyInfo?.name || !settings.companyInfo?.address?.cep;
    };

    const fetchData = async (endpoint: string, setter: React.Dispatch<React.SetStateAction<any>>) => {
        const data = await apiCall(endpoint, 'GET');
        if (data) setter(data);
    };
    
    // CRITICAL: Refresh goals (settings) to update UI after provisioning
    const refreshGoals = async () => {
        const settings = await apiCall('settings', 'GET');
        if (settings) {
            setGoals(prev => ({ ...prev, ...settings }));
        }
    };

    const fetchBroadcasts = async () => {
        const data = await apiCall('system/broadcasts', 'GET');
        if (data) setBroadcasts(data);
    };

    const handleReadBroadcast = (id: string) => {
         setBroadcasts(prev => prev.filter(b => b._id !== id));
    };

    // --- BOOTSTRAP LOGIC ---
    useEffect(() => {
        const bootstrapSystem = async () => {
            if (!token || !user) return;
            try {
                // Fetch Broadcasts First
                fetchBroadcasts();

                const urlParams = new URLSearchParams(window.location.search);
                const paymentStatus = urlParams.get('status') || urlParams.get('collection_status');
                const paymentRef = urlParams.get('ref') || urlParams.get('external_reference');
                const isPaymentReturn = paymentStatus === 'approved' && paymentRef;

                if (isPaymentReturn && !paymentSuccessType) {
                    setPaymentSuccessType(paymentRef);
                }

                // --- 1. BLOQUEIO DE OWNER (PAGAMENTO PENDENTE) ---
                if (user.paymentRequired) {
                    setIsSystemBlocked(true);
                    const billingResponse = await fetch(`${SAAS_API_URL}/subscription/status`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (billingResponse.ok) {
                         const billingData = await billingResponse.json();
                         setBillingStatusData(billingData);
                    }
                    setIsBootstrapComplete(true);
                    return; 
                }

                const billingResponse = await fetch(`${SAAS_API_URL}/subscription/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!billingResponse.ok) throw new Error("Failed to fetch billing status");
                const billingData = await billingResponse.json();
                setIsTrialMode(billingData.plan === 'trial');
                setBillingStatusData(billingData);

                // Fetch Settings (Goals)
                await refreshGoals();

                type AppAction = 'block' | 'setup_st' | 'welcome' | 'google_success' | 'expiration_alert' | 'growth' | 'force_contract' | 'none';
                let determinedAction: AppAction = 'none';
                let growthVariant: GrowthVariant | null = null;
                let expDaysLeft = 0;
                let expVariant: 'trial' | 'monthly' = 'trial';

                // PRIORITY 2: BLOCKED / EXPIRED
                if (determinedAction === 'none' && (billingData.status === 'blocked' || billingData.status === 'expired')) {
                    determinedAction = 'block';
                }

                // PRIORITY 3: SETUP SINGLE TENANT (First Run)
                if (determinedAction === 'none' && billingData.plan === 'single_tenant' && !billingData.billingDayConfigured) {
                    determinedAction = 'setup_st';
                }

                // PRIORITY 4: WELCOME / SETUP WIZARD (LOGIC FIX)
                if (determinedAction === 'none') {
                    const settings = await apiCall('settings', 'GET');

                    if (settings) {
                        if (!settings.isSetupComplete) {
                            determinedAction = 'welcome';
                        } 
                        else if (checkCriticalDataMissing(settings)) {
                             determinedAction = 'force_contract';
                        }
                    
                        // PRIORITY 5: GOOGLE SUCCESS (Verified but didn't see modal yet)
                        if (determinedAction === 'none' && settings.googleBusiness?.status === 'verified' && !settings.googleBusiness?.successShown) {
                            determinedAction = 'google_success';
                            setGoogleSuccessLink(settings.googleBusiness?.mapsUri || '');
                        }
                    }
                }

                // PRIORITY 6.5: EXPIRATION ALERT (Monthly OR Trial)
                if (determinedAction === 'none') {
                    const today = new Date();
                    let dateToCheck = new Date(billingData.trialEndsAt);
                    let typeToCheck: 'trial' | 'monthly' = 'trial';
                    
                    if (billingData.plan === 'single_tenant' && billingData.subscriptionEndsAt) {
                         dateToCheck = new Date(billingData.subscriptionEndsAt);
                         typeToCheck = 'monthly';
                    }
                    
                    const daysLeft = Math.ceil((dateToCheck.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (daysLeft <= 5 && daysLeft >= -5 && !sessionStorage.getItem('expAlertSeen')) {
                         determinedAction = 'expiration_alert';
                         expDaysLeft = Math.max(0, daysLeft);
                         expVariant = typeToCheck;
                    }
                }

                // PRIORITY 7: GROWTH FUNNEL
                if (determinedAction === 'none' && goals && (user.role === 'owner' || user.role === 'manager') && !isPaymentReturn) {
                    const settings = await apiCall('settings', 'GET'); // Fresh data
                    const gBus = settings?.googleBusiness || {};
                    const googleStatus = gBus.status || 'unverified';
                    const isDismissed = gBus.dismissedPrompt === true;
                    const sessionChecked = sessionStorage.getItem('growthAlertSeen');
                    
                    const requests = billingData.requests || [];
                    const mapsRequest = requests.find((r: any) => r.type === 'google_maps');
                    const ecomRequest = requests.find((r: any) => r.type === 'ecommerce');
                    
                    const hasActiveUpgrade = requests.some((r: any) => r.type === 'upgrade' && ['approved', 'completed'].includes(r.status));

                    const isMapsPending = mapsRequest && (mapsRequest.status === 'pending' || mapsRequest.status === 'waiting_payment');
                    const isEcomPending = ecomRequest && (ecomRequest.status === 'pending' || ecomRequest.status === 'waiting_payment');

                    if (!isDismissed && !sessionChecked && !isMapsPending && !isEcomPending && !hasActiveUpgrade) {
                        const isMapsCompleted = googleStatus === 'verified' || (mapsRequest && mapsRequest.status === 'completed' || mapsRequest?.status === 'approved');
                        const hasEcommerceService = requests.some((r: any) => r.type === 'ecommerce' && (r.status === 'completed' || r.status === 'approved'));
                        const hasExternalEcom = gBus.hasExternalEcommerce === true;

                        if (!isMapsCompleted) {
                            determinedAction = 'growth';
                            growthVariant = googleStatus === 'unverified' ? 'verify' : 'maps_offer';
                        } else if (isMapsCompleted && !hasEcommerceService && !hasExternalEcom) {
                            if (billingData.plan === 'trial' || (billingData.plan === 'single_tenant')) {
                                determinedAction = 'growth';
                                growthVariant = 'ecommerce_offer';
                            }
                        } else if (billingData.plan === 'trial' && isMapsCompleted && (hasEcommerceService || hasExternalEcom)) {
                            determinedAction = 'growth';
                            growthVariant = 'single_tenant_offer';
                        }
                    }
                }
                
                if (determinedAction === 'block') {
                    setIsSystemBlocked(true);
                } else if (determinedAction === 'setup_st') {
                    setIsFirstRunST(true);
                    setShowStatusModal(true);
                } else if (determinedAction === 'welcome') {
                    setShowWelcomeModal(true);
                } else if (determinedAction === 'force_contract') {
                    setShowSetupWizard(true);
                } else if (determinedAction === 'google_success') {
                    setShowGoogleSuccess(true);
                } else if (determinedAction === 'expiration_alert') {
                    setExpirationAlert({ isOpen: true, variant: expVariant, daysLeft: expDaysLeft });
                } else if (determinedAction === 'growth' && growthVariant) {
                    setGrowthAlertVariant(growthVariant);
                }

                const productsData = await apiCall('products', 'GET');
                if (productsData) setProducts(productsData);

                await Promise.all([
                    fetchData('services', setServices),
                    fetchData('service-orders', setServiceOrders),
                    fetchData('customers', setCustomers)
                ]);

                if (user.role === 'owner' || user.role === 'manager') {
                    await Promise.all([
                        fetchData('transactions', setTransactions),
                        fetchData('transactions/credit-card', setCreditTransactions),
                        fetchData('purchases', setPurchaseOrders),
                        fetchData('sales', setTicketSales),
                        fetchData('users', setUsers),
                        fetchData('suppliers', setSuppliers)
                    ]);
                }

                setIsBootstrapComplete(true);

            } catch (e) {
                console.error("Bootstrap failed", e);
                setIsBootstrapComplete(true); 
            }
        };

        bootstrapSystem();
    }, [token, user, apiCall]);

    // --- Action Handlers ---
    const handleCloseStatusModal = () => { setShowStatusModal(false); };
    const handleWelcomeClose = () => { setShowWelcomeModal(false); setShowSetupWizard(true); };
    const handleSaveGoals = async (newGoals: KpiGoals) => {
        const updated = await apiCall('settings', 'PUT', newGoals);
        if (updated) { 
            setGoals(updated); 
            setIsFirstRunST(false);
            setShowSetupWizard(false); 
        }
    };
    
    // Payment Success Handlers
    const handleSuccessModalClose = async () => {
        setShowGoogleSuccess(false);
        await apiCall('settings/google-business', 'PUT', { successShown: true });
    };

    const handleGrowthAction = () => {
        setGrowthAlertVariant(null);
        if (growthAlertVariant === 'verify' || growthAlertVariant === 'maps_offer') setShowGoogleVerification(true);
        if (growthAlertVariant === 'ecommerce_offer') setShowEcommerceDetail(true);
        if (growthAlertVariant === 'single_tenant_offer') setShowStatusModal(true);
    };

    const handleVerificationComplete = () => {
        refreshGoals();
    };

    const handleServiceRequestFromVerification = (type: 'google_maps' | 'ecommerce') => {
        if (type === 'google_maps') {
            setShowGoogleForm(true);
        } else if (type === 'ecommerce') {
            setShowEcommerceDetail(true);
        } else {
             setShowStatusModal(true);
        }
    };

    const handleGoogleFormSubmit = (formData: any) => { 
        setShowGoogleForm(false); 
        setPendingServicePayload({ type: 'google_maps', payload: formData });
        setShowStatusModal(true);
    };

    const handleEcommerceFormSubmit = (formData: any) => { 
        setShowEcommerceForm(false); 
        // Passa para o modal de pagamento/request do sistema
        setPendingServicePayload({ type: 'ecommerce', payload: formData });
        // Assim que o request for processado (mesmo trial é instantâneo), abrimos o modal de políticas
        setShowStatusModal(true);
        // O SystemStatusModal agora exibirá "Configurar Políticas" devido ao estado incompleto
    };
    
    const handleBundleMigrationSubmit = (formData: any) => { setShowBundleMigrationModal(false); setShowStatusModal(true); };

    const handleConfirmBasicUpgrade = () => { setShowEcomLossWarning(false); setShowStatusModal(true); };
    const handleUpgradeBundleClick = () => { setShowEcomLossWarning(false); setShowBundleMigrationModal(true); };
    const handleUpgradeBasicClick = () => { setShowEcomLossWarning(true); }; 
    
    // Handler para salvar políticas e liberar o botão "Ver Loja"
    const handlePoliciesSaved = async () => {
        await refreshGoals(); // Atualiza goals.ecommercePolicies.configured para true
    };

    const handleReviewLowMargins = () => {
        setShowLowMarginAlert(false);
        setPassLowMarginFilter(true); 
        setActivePage('products');
    };
    
    const handleIgnoreLowMargins = () => {
        setShowLowMarginAlert(false);
        sessionStorage.setItem('lowMarginIgnored', 'true');
    };

    // --- RENDER CONTENT ---
    const renderContent = () => {
        switch (activePage) {
            case 'dashboard': return <Dashboard transactions={transactions} ticketSales={ticketSales} products={products} goals={goals} onSaveGoals={handleSaveGoals} />;
            case 'sales': return <Sales products={products} onAddSale={async (s) => { const res = await apiCall('sales', 'POST', s); if (res) { setTicketSales(prev => [res, ...prev]); return res; } return null; }} goals={goals} />;
            case 'sales-history': return <SalesHistory sales={ticketSales} goals={goals} />;
            case 'ecommerce': return <EcommerceOrders goals={goals} products={products} onOrderUpdate={() => fetchData('ecommerce-orders', () => {})} />;
            case 'cash': return <Cash 
                transactions={transactions} 
                creditTransactions={creditTransactions}
                accounts={accounts} 
                updateTransactionStatus={async (id, status) => { await apiCall(`transactions/${id}`, 'PUT', { status }); fetchData('transactions', setTransactions); }} 
                updateTransaction={async (t) => { await apiCall(`transactions/${t.id}`, 'PUT', t); fetchData('transactions', setTransactions); }}
                onSaveAccount={async (a) => {}} // Placeholder
                onDeleteAccount={async (id) => {}} // Placeholder
                onRefreshData={async () => { 
                    fetchData('transactions', setTransactions); 
                    fetchData('transactions/credit-card', setCreditTransactions); 
                }}
            />;
            case 'purchases': return <Purchases products={products} purchaseOrders={purchaseOrders} onAddPurchase={async (p) => { await apiCall('purchases', 'POST', p); fetchData('purchases', setPurchaseOrders); fetchData('transactions', setTransactions); }} onUpdatePurchase={async (p) => { await apiCall(`purchases/${p.id}`, 'PUT', p); fetchData('purchases', setPurchaseOrders); fetchData('transactions', setTransactions); }} onDeletePurchase={async (id) => { await apiCall(`purchases/${id}`, 'DELETE'); fetchData('purchases', setPurchaseOrders); fetchData('transactions', setTransactions); }} goals={goals} />;
            case 'costs': return <Costs 
                transactions={transactions} 
                addTransaction={async (t) => { await apiCall('transactions', 'POST', t); fetchData('transactions', setTransactions); fetchData('transactions/credit-card', setCreditTransactions); }} 
                updateTransaction={async (t) => { await apiCall(`transactions/${t.id}`, 'PUT', t); fetchData('transactions', setTransactions); fetchData('transactions/credit-card', setCreditTransactions); }} 
                deleteTransaction={async (id) => { await apiCall(`transactions/${id}`, 'DELETE'); fetchData('transactions', setTransactions); fetchData('transactions/credit-card', setCreditTransactions); }} 
            />;
            case 'service-orders': return <ServiceOrders 
                services={services} 
                serviceOrders={serviceOrders} 
                onAddServiceOrder={async (o) => { await apiCall('service-orders', 'POST', o); fetchData('service-orders', setServiceOrders); fetchData('customers', setCustomers); }} 
                onUpdateServiceOrder={async (o) => { await apiCall(`service-orders/${o.id}`, 'PUT', o); fetchData('service-orders', setServiceOrders); fetchData('customers', setCustomers); }} 
                onDeleteServiceOrder={async (id) => { await apiCall(`service-orders/${id}`, 'DELETE'); fetchData('service-orders', setServiceOrders); fetchData('transactions', setTransactions); }} 
                onToggleStatus={async (id, data) => { 
                    const res = await apiCall(`service-orders/${id}/toggle-status`, 'POST', data); 
                    if(res) { 
                        fetchData('service-orders', setServiceOrders); 
                        fetchData('transactions', setTransactions); 
                        fetchData('customers', setCustomers); 
                        return res; 
                    } 
                }} 
                setActivePage={setActivePage} 
                goals={goals} 
            />;
            case 'products': return <Products 
                products={products} 
                ticketSales={ticketSales} 
                onAddProduct={async (p) => { await apiCall('products', 'POST', p); fetchData('products', setProducts); }} 
                onUpdateProduct={async (p) => { await apiCall(`products/${p.id}`, 'PUT', p); fetchData('products', setProducts); }} 
                onDeleteProduct={async (id) => { await apiCall(`products/${id}`, 'DELETE'); fetchData('products', setProducts); }} 
                goals={goals}
                initialFilterLowMargin={passLowMarginFilter}
            />;
            case 'services': return <Services services={services} onAddService={async (s) => { await apiCall('services', 'POST', s); fetchData('services', setServices); }} onUpdateService={async (s) => { await apiCall(`services/${s.id}`, 'PUT', s); fetchData('services', setServices); }} onDeleteService={async (id) => { await apiCall(`services/${id}`, 'DELETE'); fetchData('services', setServices); }} goals={goals} />;
            case 'customers': return <Customers customers={customers} ticketSales={ticketSales} serviceOrders={serviceOrders} onAddCustomer={async (c) => { await apiCall('customers', 'POST', c); fetchData('customers', setCustomers); }} onUpdateCustomer={async (c) => { await apiCall(`customers/${c.id}`, 'PUT', c); fetchData('customers', setCustomers); }} onDeleteCustomer={async (id) => { await apiCall(`customers/${id}`, 'DELETE'); fetchData('customers', setCustomers); }} />;
            case 'suppliers': return <Suppliers suppliers={suppliers} onAddSupplier={async (s) => { await apiCall('suppliers', 'POST', s); fetchData('suppliers', setSuppliers); }} onUpdateSupplier={async (s) => { await apiCall(`suppliers/${s.id}`, 'PUT', s); fetchData('suppliers', setSuppliers); }} onDeleteSupplier={async (id) => { await apiCall(`suppliers/${id}`, 'DELETE'); fetchData('suppliers', setSuppliers); }} />;
            case 'users': return <Users users={users} onAddUser={async (u) => { await apiCall('users', 'POST', u); fetchData('users', setUsers); }} onUpdateUser={async (u) => { await apiCall(`users/${u.id}`, 'PUT', u); fetchData('users', setUsers); }} onDeleteUser={async (id) => { await apiCall(`users/${id}`, 'DELETE'); fetchData('users', setUsers); }} />;
            case 'profile': return <Profile onUpdateProfile={async (u) => { const res = await apiCall('users/profile', 'PUT', u); if (res) updateUserInContext(res); return res; }} />;
            default: return <Dashboard transactions={transactions} ticketSales={ticketSales} products={products} goals={goals} onSaveGoals={handleSaveGoals} />;
        }
    };

    if (!isBootstrapComplete) return <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
            {paymentSuccessType && (
                <PaymentSuccessModal
                    type={paymentSuccessType}
                    onClose={() => setPaymentSuccessType(null)}
                    tenantName={goals.tenantName || goals.companyInfo.name} 
                />
            )}
            
            <BroadcastModal messages={broadcasts} onRead={handleReadBroadcast} />
            
            {(isSystemBlocked || user?.paymentRequired) && (
                 <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-4">
                     <SystemStatusModal 
                        onClose={() => { }} 
                        isFirstRun={false} 
                        initialPaymentRequest={immediatePaymentRequest}
                        initialPublicKey={immediatePublicKey} 
                    />
                 </div>
            )}
            
            {!user?.paymentRequired && showStatusModal && <SystemStatusModal 
                onClose={handleCloseStatusModal} 
                isFirstRun={isFirstRunST} 
                initialPaymentRequest={immediatePaymentRequest}
                initialPublicKey={immediatePublicKey}
                pendingServicePayload={pendingServicePayload}
                onClearPendingPayload={() => setPendingServicePayload(null)}
                onOpenGoogleVerification={() => { setShowStatusModal(false); setShowGoogleVerification(true); }}
                onOpenGoogleForm={() => { setShowStatusModal(false); setShowGoogleForm(true); }}
                onOpenEcommerceDetails={() => { setShowStatusModal(false); setShowEcommerceDetail(true); }}
                onOpenEcommerceForm={() => { setShowStatusModal(false); setShowEcommerceForm(true); }}
                onOpenEcommercePolicies={() => { setShowStatusModal(false); setShowEcommercePolicies(true); }}
                onRefreshData={refreshGoals}
            />}
            
            <EcommercePoliciesModal 
                isOpen={showEcommercePolicies}
                onClose={() => setShowEcommercePolicies(false)}
                onSave={handlePoliciesSaved}
                goals={goals}
            />

            <NotificationModal isOpen={notification.isOpen} type={notification.type as any} message={notification.message} onClose={() => setNotification({ ...notification, isOpen: false })} />

            <ExpirationAlertModal 
                isOpen={expirationAlert.isOpen}
                variant={expirationAlert.variant}
                daysLeft={expirationAlert.daysLeft}
                onAction={() => { setExpirationAlert(prev => ({...prev, isOpen: false})); setShowStatusModal(true); }}
                onRemindLater={() => { setExpirationAlert(prev => ({...prev, isOpen: false})); sessionStorage.setItem('expAlertSeen', 'true'); }}
            />

            <LowMarginAlertModal 
                isOpen={showLowMarginAlert} 
                onReview={handleReviewLowMargins} 
                onIgnore={handleIgnoreLowMargins} 
            />
            
            <EcommerceLossWarningModal 
                isOpen={showEcomLossWarning}
                onConfirmBasic={handleConfirmBasicUpgrade}
                onSwitchToBundle={handleUpgradeBundleClick}
                onClose={() => setShowEcomLossWarning(false)}
            />

            {showGoogleVerification && (
                <GoogleVerificationModal 
                    isOpen={true} 
                    onClose={() => setShowGoogleVerification(false)} 
                    onComplete={handleVerificationComplete} 
                    onRequestService={handleServiceRequestFromVerification} 
                />
            )}
            
            {showGoogleForm && (
                <GoogleBusinessFormModal 
                    isOpen={true}
                    onClose={() => setShowGoogleForm(false)}
                    onSubmit={handleGoogleFormSubmit}
                    goals={goals}
                />
            )}

            {showGoogleSuccess && (
                <GoogleSuccessModal 
                    isOpen={true}
                    mapsUrl={googleSuccessLink}
                    onClose={handleSuccessModalClose}
                />
            )}

            {showEcommerceDetail && (
                <EcommerceDetailModal 
                    isOpen={true}
                    onClose={() => setShowEcommerceDetail(false)}
                    onRequest={() => { 
                        setShowEcommerceDetail(false); 
                        setShowEcommerceForm(true); 
                    }}
                    isTrial={isTrialMode}
                />
            )}

            {showEcommerceForm && (
                <EcommerceFormModal 
                    isOpen={true}
                    onClose={() => setShowEcommerceForm(false)}
                    onSubmit={handleEcommerceFormSubmit}
                    goals={goals}
                    isTrial={isTrialMode}
                    extensionCount={billingStatusData?.extensionCount || 0}
                    trialEndsAt={billingStatusData?.trialEndsAt || ''}
                />
            )}

            {showBundleMigrationModal && (
                <BundleMigrationModal 
                    isOpen={true}
                    onClose={() => setShowBundleMigrationModal(false)}
                    onSubmit={handleBundleMigrationSubmit}
                    tenantName={goals.tenantName || goals.companyInfo.name || 'loja'}
                />
            )}

            {growthAlertVariant && (
                <GoogleVerificationAlertModal 
                    isOpen={true} 
                    variant={growthAlertVariant}
                    onPrimaryAction={handleGrowthAction} 
                    onRemindLater={() => { setGrowthAlertVariant(null); sessionStorage.setItem('growthAlertSeen', 'true'); setShowFeedbackModal(true); }} 
                    onDismiss={async () => { setGrowthAlertVariant(null); sessionStorage.setItem('growthAlertSeen', 'true'); await apiCall('settings/google-business', 'PUT', { dismissed: true }); setShowFeedbackModal(true); }} 
                />
            )}

            <SystemStatusFeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
            
            {showWelcomeModal && !isSystemBlocked && !user?.paymentRequired && <WelcomeModal isOpen={true} onClose={handleWelcomeClose} />}

            {showSetupWizard && !showWelcomeModal && !isSystemBlocked && !user?.paymentRequired && !isFirstRunST && (
                <GoalsModal currentGoals={goals} onSave={handleSaveGoals} onClose={() => setShowSetupWizard(false)} forceSetup={true} />
            )}
            
            {isVerifyingPayment && (
                 <div className="fixed inset-0 z-200 bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent border-white mb-4"></div>
                    <p className="font-bold text-lg">Confirmando Pagamento...</p>
                    <p className="text-sm opacity-70">Por favor, aguarde.</p>
                </div>
            )}

            {!user?.paymentRequired && (
                <>
                    <Sidebar 
                        activePage={activePage} 
                        setActivePage={setActivePage} 
                        isOpen={isSidebarOpen} 
                        onClose={() => setIsSidebarOpen(false)} 
                        companyName={goals.companyInfo?.name || goals.tenantName} 
                        hasEcommerce={goals.googleBusiness?.hasExternalEcommerce}
                    />
                    
                    <main className="flex-1 flex flex-col h-full overflow-hidden lg:ml-64 pt-16 lg:pt-0">
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{renderContent()}</div>
                    </main>
                </>
            )}
        </div>
    );
};

export default Layout;
