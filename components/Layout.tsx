
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Sales from './Sales';
import SalesHistory from './SalesHistory';
import Products from './Products';
import Services from './Services';
import Cash from './Cash';
import ServiceOrders from './ServiceOrders';
import Purchases from './Purchases';
import Costs from './Costs';
import Users from './Users';
import Customers from './Customers';
import Suppliers from './Suppliers';
import Profile from './Profile';
import GoalsModal from './GoalsModal';
import SystemStatusModal from './SystemStatusModal';
import GoogleVerificationModal from './GoogleVerificationModal';
import GoogleVerificationAlertModal, { GrowthVariant } from './GoogleVerificationAlertModal';
import GoogleBusinessFormModal from './GoogleBusinessFormModal'; 
import EcommerceDetailModal from './EcommerceDetailModal'; 
import EcommerceFormModal from './EcommerceFormModal';
import EcommerceOrders from './EcommerceOrders';
import SingleTenantDetailModal from './SingleTenantDetailModal';
import BundleMigrationModal from './BundleMigrationModal'; 
import GoogleSuccessModal from './GoogleSuccessModal'; 
import WelcomeModal from './WelcomeModal';
import BroadcastModal from './BroadcastModal'; 
import { AuthContext } from '../contexts/AuthContext';
import { SAAS_API_URL } from '../config';
import { 
    CashTransaction, Service, Product, PurchaseOrder, ServiceOrder, TicketSale, User, Customer, Supplier, KpiGoals, TurnoverPeriod, FinancialAccount, TransactionStatus
} from '../types';

// PaymentSuccessModal (Moved from Dashboard.tsx)
const PaymentSuccessModal: React.FC<{ type: string; onClose: () => void; tenantName?: string }> = ({ type, onClose, tenantName }) => {
    let title = "Pagamento Confirmado!";
    let message = "Sua solicitação foi processada com sucesso.";
    let buttonText = "Entendido";
    let onButtonClick = onClose;
    let icon = (
        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    // Customize based on reference prefix
    if (type.startsWith('GMAPS')) {
        title = "Pagamento Confirmado!";
        message = "Recebemos sua solicitação de cadastro no Google para aumentar a visibilidade da sua loja, já estamos cuidando disso!";
        buttonText = "Entendido";
    } else if (type.startsWith('ECOM')) {
        title = "Loja Virtual Ativada!";
        message = "Sua degustação da Loja Online foi liberada com sucesso! O menu 'E-commerce' e 'Produtos' já foram atualizados com as novas funcionalidades.";
        buttonText = "Acessar Loja Agora";
        icon = (
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
        );
        // Custom Action for Ecommerce
        onButtonClick = () => {
            if (tenantName) {
                const isLocal = window.location.hostname.includes('local') || window.location.hostname.includes('localhost');
                const url = isLocal 
                    ? `https://${tenantName}-smart-commerce.local.fluxoclean.com.br`
                    : `https://${tenantName}.fluxoclean.com.br`;
                window.open(url, '_blank');
            }
            onClose();
        };
    } else if (type.startsWith('UPG') || type.startsWith('MIGRATE')) {
        title = "Pagamento Recebido!";
        message = "Obrigado! Iniciamos o processo de provisionamento do seu servidor exclusivo. Você pode continuar usando o sistema aqui normalmente enquanto preparamos tudo.";
        buttonText = "Continuar Usando";
    } else if (type.startsWith('MTH')) {
        title = "Mensalidade Confirmada";
        message = "Obrigado! Seu acesso ao sistema foi renovado com sucesso.";
        buttonText = "Voltar ao Dashboard";
    } else if (type.startsWith('TRIAL')) {
        title = "Degustação Renovada!";
        message = "Seu período de testes foi estendido por mais 30 dias com sucesso.";
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-200 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-fade-in max-w-sm text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                    {icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-gray-500 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                    {message}
                </p>
                <button 
                    onClick={onButtonClick}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105"
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

// ... (SUB-COMPONENTES MANTIDOS: NotificationModal, LowMarginAlertModal, BlockScreen, SystemStatusFeedbackModal, ExpirationAlertModal, EcommerceLossWarningModal, STATIC_ACCOUNTS) ...
const NotificationModal: React.FC<{ isOpen: boolean; type: 'success' | 'error'; message: string; onClose: () => void }> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
                    {type === 'success' ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    )}
                </div>
                <h3 className={`text-lg leading-6 font-bold text-center mb-2 ${type === 'success' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
                    {type === 'success' ? 'Sucesso!' : 'Atenção'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 text-center mb-6">{message}</p>
                <button onClick={onClose} className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm transition-colors ${type === 'success' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}`}>Entendi</button>
            </div>
        </div>
    );
};

const LowMarginAlertModal: React.FC<{ isOpen: boolean; onReview: () => void; onIgnore: () => void }> = ({ isOpen, onReview, onIgnore }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 border-2 border-red-500 dark:border-red-600 rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl leading-6 font-bold text-center mb-2 text-gray-900 dark:text-white">
                    Produtos com Margem Baixa!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6 leading-relaxed">
                    Existem produtos com margem de lucro abaixo das configurações mínimas. Reveja os preços de venda praticados em Produtos.
                </p>
                <div className="flex gap-3">
                    <button onClick={onIgnore} className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        Ignorar
                    </button>
                    <button onClick={onReview} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg transition-transform hover:scale-105">
                        Ver Produtos
                    </button>
                </div>
            </div>
        </div>
    );
};

const BlockScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-200 bg-gray-900 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="text-6xl mb-4">⛔</div>
        <h1 className="text-4xl font-bold mb-4">Acesso Bloqueado</h1>
        <p className="text-xl mb-8 max-w-md">Identificamos uma pendência financeira ou expiração do período de teste. Para continuar utilizando o sistema, por favor, regularize sua situação.</p>
        <button onClick={onClose} className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white text-xl font-bold rounded-full shadow-lg transition-transform hover:scale-105">Regularizar Agora</button>
    </div>
);

const SystemStatusFeedbackModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-200 p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
                <div className="mb-4 text-4xl">💡</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Entendido!</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">Caso mude de ideia, você pode acessar esta opção a qualquer momento clicando no botão <strong>"Status"</strong> no topo do Dashboard.</p>
                <button onClick={onClose} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">OK</button>
            </div>
        </div>
    );
};

const ExpirationAlertModal: React.FC<{ isOpen: boolean; variant: 'trial' | 'monthly'; daysLeft: number; onAction: () => void; onRemindLater: () => void; }> = ({ isOpen, variant, daysLeft, onAction, onRemindLater }) => {
    if (!isOpen) return null;
    const isTrial = variant === 'trial';
    const bgColor = isTrial ? 'bg-orange-500' : 'bg-red-500';
    const title = 'Não perca seu acesso!';
    const message = isTrial 
        ? 'Acesse o Status do sistema no Dashboard para solicitar o Sistema Exclusive ou Renovar sua degustação.' 
        : 'Acesse o Status do sistema no Dashboard para pagamento da sua mensalidade.';
    const actionText = 'Ver Status Agora';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-160 p-4 animate-fade-in">
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border-t-8 ${isTrial ? 'border-orange-500' : 'border-red-500'} relative`}>
                <div className={`mx-auto -mt-10 mb-4 w-16 h-16 rounded-full ${bgColor} flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-800 text-3xl`}>⏳</div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg font-medium">{message}</p>
                <div className="space-y-3">
                    <button onClick={onAction} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105">{actionText}</button>
                    <button onClick={onRemindLater} className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-300 font-semibold rounded-xl">Lembrar Depois</button>
                </div>
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

const STATIC_ACCOUNTS: FinancialAccount[] = [
    { id: 'cash-box', bankName: 'Dinheiro em Caixa', balance: 0, paymentMethods: [], receivingRules: [] },
    { id: 'bank-main', bankName: 'Conta Bancária', balance: 0, paymentMethods: [{id: 'pix', name: 'Pix', type: 'Pix'}, {id: 'debit', name: 'Débito', type: 'Debit'}], receivingRules: [] },
    { id: 'credit-main', bankName: 'Cartão de Crédito', balance: 0, paymentMethods: [], receivingRules: [] },
    { id: 'boleto', bankName: 'Boletos a Pagar', balance: 0, paymentMethods: [], receivingRules: [] }
];

// --- LAYOUT PRINCIPAL ---

const Layout: React.FC = () => {
    // ... (Hooks, State Data - Same as before)
    const { user, token, apiCall, updateUser: updateUserInContext, logout } = useContext(AuthContext);
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
    
    // New State for Policy Enforcement Flow
    const [showEcommercePolicies, setShowEcommercePolicies] = useState(false);

    // Broadcast State
    const [broadcasts, setBroadcasts] = useState<any[]>([]);

    // Modal & Logic States
    const [showWelcomeModal, setShowWelcomeModal] = useState(false); 
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [isSystemBlocked, setIsSystemBlocked] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [isFirstRunST, setIsFirstRunST] = useState(false);
    const [isMigrationReady, setIsMigrationReady] = useState(false);
    const [showMigrationWarning, setShowMigrationWarning] = useState(false);
    const [growthAlertVariant, setGrowthAlertVariant] = useState<GrowthVariant | null>(null);
    const [showGoogleVerification, setShowGoogleVerification] = useState(false);
    const [showGoogleForm, setShowGoogleForm] = useState(false); 
    const [showGoogleSuccess, setShowGoogleSuccess] = useState(false);
    const [googleSuccessLink, setGoogleSuccessLink] = useState('');
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showEcommerceDetail, setShowEcommerceDetail] = useState(false); 
    const [showEcommerceForm, setShowEcommerceForm] = useState(false);
    const [showSingleTenantDetail, setShowSingleTenantDetail] = useState(false);
    
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

    const cleanUrlHost = (url: string) => {
        return url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0].split(':')[0].toLowerCase();
    };

    const checkCriticalDataMissing = (settings: KpiGoals) => {
        const info = settings.companyInfo;
        if (!info || !info.name || !info.cnpjCpf || !info.email || !info.phone) return true;
        const addr = info.address;
        if (!addr || !addr.cep || !addr.street || !addr.number || !addr.neighborhood || !addr.city || !addr.state) return true;
        return false;
    };

    const fetchData = useCallback(async (endpoint: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
        const data = await apiCall(endpoint, 'GET');
        if (data) setter(data);
    }, [apiCall]);

    const fetchBroadcasts = useCallback(async () => {
        const messages = await apiCall('system/broadcasts', 'GET');
        if (messages) {
            // Filter read messages
            const readList = JSON.parse(localStorage.getItem('readBroadcasts') || '[]');
            const unread = messages.filter((m: any) => !readList.includes(m._id));
            setBroadcasts(unread);
        }
    }, [apiCall]);

    const handleReadBroadcast = (id: string) => {
        const readList = JSON.parse(localStorage.getItem('readBroadcasts') || '[]');
        localStorage.setItem('readBroadcasts', JSON.stringify([...readList, id]));
        setBroadcasts(prev => prev.filter(m => m._id !== id));
    };

    const refreshFinancialData = async () => {
        await Promise.all([
            fetchData('transactions', setTransactions),
            fetchData('transactions/credit-card', setCreditTransactions),
            fetchData('purchases', setPurchaseOrders),
            fetchData('service-orders', setServiceOrders)
        ]);
    };
    
    const refreshEcommerceData = async () => {
        await Promise.all([
            fetchData('products', setProducts),
            fetchData('transactions', setTransactions),
            fetchData('sales', setTicketSales),
            fetchData('service-orders', setServiceOrders)
        ]);
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
                    // Start Payment Verification in Effect below
                    setPaymentSuccessType(paymentRef);
                }

                const billingResponse = await fetch(`${SAAS_API_URL}/subscription/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!billingResponse.ok) throw new Error("Failed to fetch billing status");
                const billingData = await billingResponse.json();
                setIsTrialMode(billingData.plan === 'trial');
                setBillingStatusData(billingData);

                const settings = await apiCall('settings', 'GET');
                if (settings) {
                    setGoals(prev => ({ ...prev, ...settings }));
                }

                type AppAction = 'redirect' | 'block' | 'setup_st' | 'migration' | 'welcome' | 'google_success' | 'expiration_alert' | 'growth' | 'force_contract' | 'none';
                let determinedAction: AppAction = 'none';
                let growthVariant: GrowthVariant | null = null;
                let expDaysLeft = 0;
                let expVariant: 'trial' | 'monthly' = 'trial';

                const currentHost = cleanUrlHost(window.location.origin);
                const targetHost = cleanUrlHost(billingData.singleTenantUrl || '');
                const isOwnerOrManager = user.role === 'owner' || user.role === 'manager';

                if (billingData.plan === 'single_tenant' && billingData.singleTenantUrl && currentHost !== targetHost) {
                    const isDevEnv = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
                    if (!isDevEnv || (targetHost.includes('local') && currentHost.includes('local'))) {
                        determinedAction = 'redirect';
                    }
                }
                
                // PRIORITY 2: BLOCKED / EXPIRED
                if (determinedAction === 'none' && (billingData.status === 'blocked' || billingData.status === 'expired')) {
                    determinedAction = 'block';
                }

                // PRIORITY 3: SETUP SINGLE TENANT (First Run)
                if (determinedAction === 'none' && billingData.plan === 'single_tenant' && !billingData.billingDayConfigured) {
                    determinedAction = 'setup_st';
                }

                // PRIORITY 4: WELCOME / SETUP WIZARD (LOGIC FIX)
                if (determinedAction === 'none' && settings) {
                    // SE não completou setup, DEVE ver welcome.
                    if (!settings.isSetupComplete) {
                        determinedAction = 'welcome';
                    } 
                    // Se setup está marcado como completo mas dados críticos sumiram (bug ou limpeza)
                    else if (checkCriticalDataMissing(settings)) {
                         determinedAction = 'force_contract';
                    }
                }

                // PRIORITY 5: GOOGLE SUCCESS (Verified but didn't see modal yet)
                if (determinedAction === 'none' && settings && settings.googleBusiness?.status === 'verified' && !settings.googleBusiness?.successShown) {
                    determinedAction = 'google_success';
                }

                // PRIORITY 6: MIGRATION (Upgrade Waiting Payment/Activation)
                if (determinedAction === 'none' && billingData.requests?.some((r: any) => r.type === 'upgrade' && r.status === 'waiting_payment')) {
                    determinedAction = 'migration';
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
                    
                    // Alert logic: Trial (10 days used -> 5 left), Monthly (25 days used -> 5 left)
                    // Also check session storage to not spam
                    if (daysLeft <= 5 && daysLeft >= -5 && !sessionStorage.getItem('expAlertSeen')) {
                         determinedAction = 'expiration_alert';
                         expDaysLeft = Math.max(0, daysLeft);
                         expVariant = typeToCheck;
                    }
                }

                // PRIORITY 7: GROWTH FUNNEL
                if (determinedAction === 'none' && settings && isOwnerOrManager && !isPaymentReturn) {
                    const gBus = settings.googleBusiness || {};
                    const googleStatus = gBus.status || 'unverified';
                    const isDismissed = gBus.dismissedPrompt === true;
                    const sessionChecked = sessionStorage.getItem('growthAlertSeen');
                    
                    const requests = billingData.requests || [];
                    const mapsRequest = requests.find((r: any) => r.type === 'google_maps');
                    const ecomRequest = requests.find((r: any) => r.type === 'ecommerce');
                    
                    // CORREÇÃO: Verificar se já existe upgrade pago/andamento
                    const hasActiveUpgrade = requests.some((r: any) => r.type === 'upgrade' && ['approved', 'waiting_switch', 'completed'].includes(r.status));

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
                            // Offer E-commerce to both Trial and Exclusive Basic
                            // Only Single Tenant Active users who don't have e-commerce get this offer here
                            // Or Trial users who finished Maps
                            if (billingData.plan === 'trial' || (billingData.plan === 'single_tenant')) {
                                determinedAction = 'growth';
                                growthVariant = 'ecommerce_offer';
                            }
                        } else if (billingData.plan === 'trial' && isMapsCompleted && (hasEcommerceService || hasExternalEcom)) {
                            // Upsell to Single Tenant if Trial user has everything else
                            // AND not already upgrading (Checked above)
                            determinedAction = 'growth';
                            growthVariant = 'single_tenant_offer';
                        }
                    }
                }
                
                 if (determinedAction === 'redirect') {
                    setIsRedirecting(true);
                    window.location.href = billingData.singleTenantUrl;
                    return;
                } else if (determinedAction === 'block') {
                    setIsSystemBlocked(true);
                } else if (determinedAction === 'setup_st') {
                    setIsFirstRunST(true);
                    setShowStatusModal(true);
                } else if (determinedAction === 'welcome') {
                    setShowWelcomeModal(true);
                } else if (determinedAction === 'force_contract') {
                    setShowSetupWizard(true);
                } else if (determinedAction === 'google_success') {
                    setGoogleSuccessLink(settings.googleBusiness?.mapsUri || '');
                    setShowGoogleSuccess(true);
                } else if (determinedAction === 'migration') {
                    setIsMigrationReady(true);
                    setShowStatusModal(true);
                } else if (determinedAction === 'expiration_alert') {
                    setExpirationAlert({ isOpen: true, variant: expVariant, daysLeft: expDaysLeft });
                } else if (determinedAction === 'growth' && growthVariant) {
                    setGrowthAlertVariant(growthVariant);
                }

                // Data Fetch
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
    }, [token, user, fetchData, apiCall]);

    // Payment Verification Hook Logic
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

    useEffect(() => {
        let isCancelled = false;
        
        const checkPaymentReturn = async () => {
            if (!token || !paymentSuccessType) return; 

            setIsVerifyingPayment(true);
            try {
                // Verify payment status with API
                const data = await apiCall(`subscription/check-payment/${paymentSuccessType}`, 'POST');
                
                if (data && data.status === 'approved' && !isCancelled) {
                    // Update URL to remove query params
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // Logic to handle specific flows
                    if (paymentSuccessType.startsWith('ECOM')) {
                        // Force update local settings to reflect new e-commerce status
                        await apiCall('settings', 'GET').then(settings => {
                           if (settings) setGoals(prev => ({ ...prev, ...settings }));
                        });
                        
                        // Switch tab and show policies immediately
                        setActivePage('ecommerce');
                        setShowEcommercePolicies(true); // New state to trigger modal
                    } else {
                        // No more standard modal logic here, UI is now handled by `paymentSuccessType` rendering PaymentSuccessModal
                    }
                }
            } catch (error) {
                console.error("Error verifying payment:", error);
            } finally {
                if (!isCancelled) setIsVerifyingPayment(false);
            }
        };

        checkPaymentReturn();
        return () => { isCancelled = true; };
    }, [token, apiCall, paymentSuccessType]);


    // --- EVENT HANDLERS ---

    const handleCloseStatusModal = () => {
        if (isMigrationReady) setShowMigrationWarning(true);
        else {
            setShowStatusModal(false);
            setImmediatePaymentRequest(null);
            setImmediatePublicKey('');
        }
    };

    const handleConfirmCloseMigration = () => {
        setShowMigrationWarning(false);
        setShowStatusModal(false);
    };

    const handleWelcomeClose = () => {
        setShowWelcomeModal(false);
        // After welcome, force setup wizard
        setShowSetupWizard(true);
    };

    const handleSaveGoals = async (newGoals: KpiGoals) => {
        setGoals(newGoals);
        await apiCall('settings', 'PUT', newGoals);
        const isContractAccepted = !!newGoals.legalAgreement?.accepted;
        if (newGoals.isSetupComplete && !checkCriticalDataMissing(newGoals) && isContractAccepted) {
            setShowSetupWizard(false);
        }
    };
    
    // Callback after saving policies
    const handlePoliciesSaved = async () => {
        try {
            // Re-fetch settings to update local state and hide modal
            const settings = await apiCall('settings', 'GET');
            if (settings) setGoals(prev => ({ ...prev, ...settings }));
            setShowEcommercePolicies(false);
        } catch(e) { }
    };

    const handleGrowthAction = () => {
        if (!growthAlertVariant) return;
        sessionStorage.setItem('growthAlertSeen', 'true');
        
        if (growthAlertVariant === 'verify' || growthAlertVariant === 'maps_offer') {
            setGrowthAlertVariant(null);
            setShowGoogleVerification(true);
        } else if (growthAlertVariant === 'ecommerce_offer') {
            setGrowthAlertVariant(null);
            setShowEcommerceDetail(true); 
        } else if (growthAlertVariant === 'single_tenant_offer') {
            setGrowthAlertVariant(null);
            setShowSingleTenantDetail(true);
        }
    };

    const handleServiceRequest = async (type: 'google_maps' | 'ecommerce' | 'upgrade', payload?: any) => {
        try {
            const response = await fetch(`${SAAS_API_URL}/subscription/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ type, payload })
            });
            const data = await response.json();
            
            if (response.ok) {
                if (data.request && data.request.status === 'pending') {
                     setImmediatePaymentRequest(data.request);
                     if (data.publicKey) setImmediatePublicKey(data.publicKey);
                }
                setShowStatusModal(true);
            } else {
                setNotification({ isOpen: true, type: 'error', message: data.message || 'Erro.' });
            }
        } catch (e) { 
            setNotification({ isOpen: true, type: 'error', message: 'Erro de conexão.' }); 
        }
    };

    const handleGoogleFormSubmit = (formData: any) => {
        setShowGoogleForm(false);
        handleServiceRequest('google_maps', formData);
    };

    const handleEcommerceFormSubmit = (formData: any) => {
        setShowEcommerceForm(false);
        // Standard Ecommerce Request (For Existing Exclusive or Trial)
        handleServiceRequest('ecommerce', formData);
    };

    const handleBundleMigrationSubmit = (formData: any) => {
        setShowBundleMigrationModal(false);
        handleServiceRequest('upgrade', formData); // Payload includes plan: 'bundle' and domains
    };

    const handleVerificationComplete = () => {
        setShowGoogleVerification(false);
        apiCall('settings', 'GET').then(settings => {
            if (settings) setGoals(prev => ({ ...prev, ...settings }));
        });
    };

    const handleSuccessModalClose = async () => {
        setShowGoogleSuccess(false);
        try { await apiCall('settings/google-business', 'PUT', { successShown: true }); } catch (e) { }
    };

    const handleServiceRequestFromVerification = (type: 'google_maps' | 'ecommerce') => {
        if (type === 'ecommerce') {
            setShowGoogleVerification(false);
            setShowEcommerceDetail(true);
        } else {
            setShowGoogleVerification(false);
            setShowGoogleForm(true);
        }
    };

    const handleReviewLowMargins = () => {
        sessionStorage.setItem('marginAlertSeen', 'true');
        setShowLowMarginAlert(false);
        setActivePage('products');
        setPassLowMarginFilter(true);
    };

    const handleIgnoreLowMargins = () => {
        sessionStorage.setItem('marginAlertSeen', 'true');
        setShowLowMarginAlert(false);
    };

    // --- MIGRATION LOGIC ---

    const handleUpgradeBasicClick = () => {
        // Check if there is an active ecommerce request (status approved/completed)
        const hasActiveTrialEcommerce = billingStatusData?.requests?.some((r: any) => r.type === 'ecommerce' && (r.status === 'completed' || r.status === 'approved'));
        
        if (hasActiveTrialEcommerce) {
            setShowSingleTenantDetail(false);
            setShowEcomLossWarning(true);
        } else {
            setShowSingleTenantDetail(false);
            handleServiceRequest('upgrade', { plan: 'basic' });
        }
    };

    const handleConfirmBasicUpgrade = () => {
        setShowEcomLossWarning(false);
        handleServiceRequest('upgrade', { plan: 'basic' });
    };

    const handleUpgradeBundleClick = () => {
        setShowSingleTenantDetail(false);
        setShowEcomLossWarning(false); // Close warning if coming from there
        setShowBundleMigrationModal(true); // Open specialized bundle modal
    };


    // --- CRUD WRAPPERS (Omitted for brevity, kept same) ---
    const addTransaction = async (t: any) => { if(await apiCall('transactions', 'POST', t)) refreshFinancialData(); };
    const updateTransaction = async (t: any) => { if(await apiCall(`transactions/${t.id}`, 'PUT', t)) refreshFinancialData(); };
    const updateTransactionStatus = async (id: string, s: any) => { if(await apiCall(`transactions/${id}`, 'PUT', { status: s })) refreshFinancialData(); };
    const deleteTransaction = async (id: string) => { if(await apiCall(`transactions/${id}`, 'DELETE')) refreshFinancialData(); };
    
    const handleAddPurchase = async (d: any) => { if(await apiCall('purchases', 'POST', d)) { await refreshFinancialData(); await fetchData('products', setProducts); await fetchData('suppliers', setSuppliers); }};
    const updatePurchaseOrder = async (d: any) => { if(await apiCall(`purchases/${d.id}`, 'PUT', d)) { await refreshFinancialData(); await fetchData('products', setProducts); await fetchData('suppliers', setSuppliers); }};
    const deletePurchaseOrder = async (id: string) => { if(await apiCall(`purchases/${id}`, 'DELETE')) { await refreshFinancialData(); await fetchData('products', setProducts); }};
    
    const addServiceOrder = async (d: any) => { if(await apiCall('service-orders', 'POST', d)) { await fetchData('service-orders', setServiceOrders); await fetchData('customers', setCustomers); }};
    const updateServiceOrder = async (d: any) => { if(await apiCall(`service-orders/${d.id}`, 'PUT', d)) { await fetchData('service-orders', setServiceOrders); await fetchData('customers', setCustomers); }};
    const deleteServiceOrder = async (id: string) => { if(await apiCall(`service-orders/${id}`, 'DELETE')) { await fetchData('service-orders', setServiceOrders); if(user?.role !== 'technician') refreshFinancialData(); }};
    const toggleServiceOrderStatus = async (id: string, pd?: any) => { const r = await apiCall(`service-orders/${id}/toggle-status`, 'POST', pd); if(r) { await fetchData('service-orders', setServiceOrders); if(user?.role !== 'technician') refreshFinancialData(); } return r; };

    const addProduct = async (d: any) => { if(await apiCall('products', 'POST', d)) fetchData('products', setProducts); };
    const updateProduct = async (d: any) => { if(await apiCall(`products/${d.id}`, 'PUT', d)) fetchData('products', setProducts); };
    const deleteProduct = async (id: string) => { if(await apiCall(`products/${id}`, 'DELETE')) fetchData('products', setProducts); };

    const addService = async (d: any) => { if(await apiCall('services', 'POST', d)) fetchData('services', setServices); };
    const updateService = async (d: any) => { if(await apiCall(`services/${d.id}`, 'PUT', d)) fetchData('services', setServices); };
    const deleteService = async (id: string) => { if(await apiCall(`services/${id}`, 'DELETE')) fetchData('services', setServices); };

    const handleAddSale = async (d: any) => { const r = await apiCall('sales', 'POST', d); if(r) { if(user?.role !== 'technician') { await fetchData('sales', setTicketSales); await fetchData('transactions', setTransactions); } await fetchData('products', setProducts); await fetchData('customers', setCustomers); } return r; };
    const handleDeleteSale = async (id: string) => { if(await apiCall(`sales/${id}`, 'DELETE')) { await fetchData('sales', setTicketSales); await fetchData('products', setProducts); await fetchData('transactions', setTransactions); }};

    const handleAddUser = async (d: any) => { if(await apiCall('users', 'POST', d)) fetchData('users', setUsers); };
    const handleUpdateUser = async (d: any) => { if(await apiCall(`users/${d.id}`, 'PUT', d)) fetchData('users', setUsers); };
    const handleDeleteUser = async (id: string) => { if(await apiCall(`users/${id}`, 'DELETE')) fetchData('users', setUsers); };
    const handleUpdateProfile = async (d: any) => { const r = await apiCall('users/profile', 'PUT', d); if(r) updateUserInContext(r); return r; };

    const handleAddCustomer = async (d: any) => { if(await apiCall('customers', 'POST', d)) fetchData('customers', setCustomers); };
    const handleUpdateCustomer = async (d: any) => { if(await apiCall(`customers/${d.id}`, 'PUT', d)) fetchData('customers', setCustomers); };
    const handleDeleteCustomer = async (id: string) => { if(await apiCall(`customers/${id}`, 'DELETE')) fetchData('customers', setCustomers); };

    const handleAddSupplier = async (d: any) => { if(await apiCall('suppliers', 'POST', d)) fetchData('suppliers', setSuppliers); };
    const handleUpdateSupplier = async (d: any) => { if(await apiCall(`suppliers/${d.id}`, 'PUT', d)) fetchData('suppliers', setSuppliers); };
    const handleDeleteSupplier = async (id: string) => { if(await apiCall(`suppliers/${id}`, 'DELETE')) fetchData('suppliers', setSuppliers); };

    // --- LOW MARGIN CHECK LOGIC (Restored) ---
    useEffect(() => {
        // Só executa se o sistema carregou e os dados essenciais existem
        if (!isBootstrapComplete || products.length === 0 || !goals) return;

        // Não sobrepor outros modais prioritários
        if (
            showStatusModal || showWelcomeModal || showSetupWizard || 
            showGoogleVerification || showGoogleForm || showEcommerceDetail || 
            showEcommerceForm || showSingleTenantDetail || showBundleMigrationModal || 
            showEcomLossWarning || expirationAlert.isOpen || growthAlertVariant ||
            broadcasts.length > 0 // Espera terminar os broadcasts
        ) return;

        // Verifica se já foi visto nesta sessão
        const seenSession = sessionStorage.getItem('marginAlertSeen');
        if (seenSession) return;

        // Cálculo de Margem (Réplica da lógica de Products.tsx)
        const hasLowMargin = products.some(p => {
            // Ignora produtos com estoque zerado ou negativo (não estão sendo vendidos ativamente)
            if (p.stock <= 0) return false;

            const taxAmount = p.price * (goals.effectiveTaxRate / 100);
            const maxFeeAmount = p.price * (goals.feeCreditInstallment / 100); // Pior cenário (Crédito Parc)
            const realMarginValue = p.price - p.cost - taxAmount - maxFeeAmount;
            const realMarginPercent = p.price > 0 ? (realMarginValue / p.price) * 100 : 0;

            return realMarginPercent < goals.minContributionMargin;
        });

        if (hasLowMargin) {
            setShowLowMarginAlert(true);
        }

    }, [
        isBootstrapComplete, products, goals, 
        showStatusModal, showWelcomeModal, showSetupWizard, 
        showGoogleVerification, showGoogleForm, showEcommerceDetail, 
        showEcommerceForm, showSingleTenantDetail, showBundleMigrationModal, 
        showEcomLossWarning, expirationAlert.isOpen, growthAlertVariant,
        broadcasts
    ]);

    // --- RENDER CONTENT SWITCHER ---
    const renderContent = () => {
        // If Ecommerce Policies need to be shown (activated via payment flow), intercept render
        if (showEcommercePolicies && activePage === 'ecommerce') {
            return (
                <div className="relative">
                    <EcommerceOrders goals={goals} onOrderUpdate={refreshEcommerceData} products={products} />
                </div>
            );
        }

        switch (activePage) {
            case 'dashboard': return <Dashboard transactions={transactions} ticketSales={ticketSales} products={products} goals={goals} onSaveGoals={handleSaveGoals} />;
            case 'sales': return <Sales products={products} onAddSale={handleAddSale} goals={goals} />;
            case 'sales-history': return <SalesHistory sales={ticketSales} goals={goals} />;
            case 'ecommerce': return <EcommerceOrders goals={goals} onOrderUpdate={refreshEcommerceData} products={products} />;
            case 'cash': return <Cash transactions={transactions} creditTransactions={creditTransactions} accounts={accounts} updateTransactionStatus={updateTransactionStatus} updateTransaction={updateTransaction} onSaveAccount={async () => {}} onDeleteAccount={async () => {}} onRefreshData={refreshFinancialData} />;
            case 'purchases': return <Purchases products={products} purchaseOrders={purchaseOrders} onAddPurchase={handleAddPurchase} onUpdatePurchase={updatePurchaseOrder} onDeletePurchase={deletePurchaseOrder} goals={goals} />;
            case 'costs': return <Costs transactions={transactions} addTransaction={addTransaction} updateTransaction={updateTransaction} deleteTransaction={deleteTransaction} />;
            case 'service-orders': return <ServiceOrders services={services} serviceOrders={serviceOrders} onAddServiceOrder={addServiceOrder} onUpdateServiceOrder={updateServiceOrder} onDeleteServiceOrder={deleteServiceOrder} onToggleStatus={toggleServiceOrderStatus} setActivePage={setActivePage} goals={goals} />;
            case 'products': return <Products products={products} ticketSales={ticketSales} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} goals={goals} initialFilterLowMargin={passLowMarginFilter} />;
            case 'services': return <Services services={services} onAddService={addService} onUpdateService={updateService} onDeleteService={deleteService} goals={goals} />;
            case 'customers': return <Customers customers={customers} ticketSales={ticketSales} serviceOrders={serviceOrders} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onDeleteCustomer={handleDeleteCustomer} />;
            case 'suppliers': return <Suppliers suppliers={suppliers} onAddSupplier={handleAddSupplier} onUpdateSupplier={handleUpdateSupplier} onDeleteSupplier={handleDeleteSupplier} />;
            case 'users': return <Users users={users} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />;
            case 'profile': return <Profile onUpdateProfile={handleUpdateProfile} />;
            default: return <Dashboard transactions={transactions} ticketSales={ticketSales} products={products} goals={goals} onSaveGoals={handleSaveGoals} />;
        }
    };

    if (isRedirecting) return null;

    if (!isBootstrapComplete) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Iniciando sistema...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
            {/* PaymentSuccessModal rendered based on state set by URL query params */}
            {paymentSuccessType && (
                <PaymentSuccessModal
                    type={paymentSuccessType}
                    onClose={() => setPaymentSuccessType(null)}
                    tenantName={goals.tenantName || goals.companyInfo.name} 
                />
            )}
            
            {/* MODALS RENDER */}
            <BroadcastModal messages={broadcasts} onRead={handleReadBroadcast} />
            
            {isSystemBlocked && <BlockScreen onClose={() => setShowStatusModal(true)} />}
            
            {showStatusModal && <SystemStatusModal 
                onClose={handleCloseStatusModal} 
                isFirstRun={isFirstRunST} 
                initialPaymentRequest={immediatePaymentRequest}
                initialPublicKey={immediatePublicKey} 
            />}
            
            <NotificationModal isOpen={notification.isOpen} type={notification.type} message={notification.message} onClose={() => setNotification({ ...notification, isOpen: false })} />

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

            {showSingleTenantDetail && (
                <SingleTenantDetailModal
                    isOpen={true}
                    onClose={() => setShowSingleTenantDetail(false)}
                    onRequestUpgrade={handleUpgradeBasicClick} 
                    onRequestBundle={handleUpgradeBundleClick} 
                />
            )}

            {showBundleMigrationModal && (
                <BundleMigrationModal 
                    isOpen={true}
                    onClose={() => setShowBundleMigrationModal(false)}
                    onSubmit={handleBundleMigrationSubmit}
                    tenantName={goals.tenantName || goals.companyInfo.name || 'minhaloja'}
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
            
            {showMigrationWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-150 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 text-center border-2 border-red-500">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/50 mb-6">
                            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Risco de Perda de Dados</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">Seu novo sistema <strong>Single-Tenant</strong> já está pronto para uso. Qualquer dado inserido aqui NÃO será migrado. Tem certeza que deseja continuar?</p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setShowMigrationWarning(false)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg">Voltar e Migrar</button>
                            <button onClick={handleConfirmCloseMigration} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Sim, Sair</button>
                        </div>
                    </div>
                </div>
            )}

            {showWelcomeModal && !isSystemBlocked && <WelcomeModal isOpen={true} onClose={handleWelcomeClose} />}

            {showSetupWizard && !showWelcomeModal && !isSystemBlocked && !isFirstRunST && (
                <GoalsModal currentGoals={goals} onSave={handleSaveGoals} onClose={() => {}} forceSetup={true} />
            )}
            
            {/* Loading Overlay for Payment Verification */}
            {isVerifyingPayment && (
                 <div className="fixed inset-0 z-200 bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent border-white mb-4"></div>
                    <p className="font-bold text-lg">Confirmando Pagamento...</p>
                    <p className="text-sm opacity-70">Por favor, aguarde.</p>
                </div>
            )}

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 shadow-md">
                <div className="flex items-center">
                     <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m2 0a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m7.5-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m1.5.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m-7-1a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1zm5.5 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/><path d="M11.5 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5m0-1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M5 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/><path d="M7 10.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0m-1 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"/><path d="M14 0a.5.5 0 0 1 .5.5V2h.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12.5V.5A.5.5 0 0 1 14 0M1 3v3h14V3zm14 4H1v7h14z"/></svg>
                    <h1 className="ml-2 text-lg font-bold text-gray-900 dark:text-white">SmartStore</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 dark:text-gray-300 focus:outline-none p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"><svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            </div>

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
        </div>
    );
};

export default Layout;
