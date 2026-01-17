
// ... (imports permanecem iguais)
import { 
    CashTransaction, Service, Product, PurchaseOrder, ServiceOrder, TicketSale, User, Customer, Supplier, KpiGoals, TurnoverPeriod, FinancialAccount, TransactionStatus
} from '../types';

// ... (Sub-componentes visuais como PaymentSuccessModal, NotificationModal, etc. permanecem iguais)

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

    // ... (Helper functions remain the same) ...

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

                type AppAction = 'block' | 'setup_st' | 'welcome' | 'google_success' | 'expiration_alert' | 'growth' | 'force_contract' | 'none';
                let determinedAction: AppAction = 'none';
                let growthVariant: GrowthVariant | null = null;
                let expDaysLeft = 0;
                let expVariant: 'trial' | 'monthly' = 'trial';

                // REMOVIDO: Lógica de redirecionamento Single Tenant
                
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
                    if (!settings.isSetupComplete) {
                        determinedAction = 'welcome';
                    } 
                    else if (checkCriticalDataMissing(settings)) {
                         determinedAction = 'force_contract';
                    }
                }

                // PRIORITY 5: GOOGLE SUCCESS (Verified but didn't see modal yet)
                if (determinedAction === 'none' && settings && settings.googleBusiness?.status === 'verified' && !settings.googleBusiness?.successShown) {
                    determinedAction = 'google_success';
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
                if (determinedAction === 'none' && settings && (user.role === 'owner' || user.role === 'manager') && !isPaymentReturn) {
                    const gBus = settings.googleBusiness || {};
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
                    setGoogleSuccessLink(settings.googleBusiness?.mapsUri || '');
                    setShowGoogleSuccess(true);
                } else if (determinedAction === 'expiration_alert') {
                    setExpirationAlert({ isOpen: true, variant: expVariant, daysLeft: expDaysLeft });
                } else if (determinedAction === 'growth' && growthVariant) {
                    setGrowthAlertVariant(growthVariant);
                }

                // ... (Data fetching Logic remains same) ...
                
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

    // ... (Rest of Payment Logic, Event Handlers remain same, minus Migration Warning modal state which is removed) ...

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
            
            {/* Migration Warning Modal REMOVED */}

            {showWelcomeModal && !isSystemBlocked && <WelcomeModal isOpen={true} onClose={handleWelcomeClose} />}

            {showSetupWizard && !showWelcomeModal && !isSystemBlocked && !isFirstRunST && (
                <GoalsModal currentGoals={goals} onSave={handleSaveGoals} onClose={() => {}} forceSetup={true} />
            )}
            
            {isVerifyingPayment && (
                 <div className="fixed inset-0 z-200 bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent border-white mb-4"></div>
                    <p className="font-bold text-lg">Confirmando Pagamento...</p>
                    <p className="text-sm opacity-70">Por favor, aguarde.</p>
                </div>
            )}

            {/* Mobile Header and Sidebar (Same as before) */}
            
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
