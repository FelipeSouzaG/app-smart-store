
import React, { useState, useEffect, useContext } from 'react';
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
import { AuthContext } from '../contexts/AuthContext';
import { SAAS_API_URL } from '../config';
import { 
    CashTransaction, Service, Product, PurchaseOrder, ServiceOrder, TicketSale, User, Customer, Supplier, KpiGoals, TurnoverPeriod
} from '../types';

const BlockScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="text-6xl mb-4">⛔</div>
        <h1 className="text-4xl font-bold mb-4">Acesso Bloqueado</h1>
        <p className="text-xl mb-8 max-w-md">
            Identificamos uma pendência financeira ou expiração do período de teste.
            Para continuar utilizando o sistema, por favor, regularize sua situação.
        </p>
        <button 
            onClick={onClose} // Opens the SystemStatusModal which contains the Payment Button
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white text-xl font-bold rounded-full shadow-lg transition-transform hover:scale-105"
        >
            Regularizar Agora
        </button>
    </div>
);

const Layout: React.FC = () => {
    const { user, token, apiCall, updateUser: updateUserInContext } = useContext(AuthContext);
    const [activePage, setActivePage] = useState(user?.role === 'technician' ? 'sales' : 'dashboard');
    
    // Mobile Menu State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [transactions, setTransactions] = useState<CashTransaction[]>([]);
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
        predictedAvgMargin: 40,
        netProfit: 5000,
        inventoryTurnoverGoal: 1.5,
        effectiveTaxRate: 4.0,
        feePix: 0,
        feeDebit: 1.5,
        feeCreditSight: 3.0,
        feeCreditInstallment: 12.0,
        minContributionMargin: 20.0,
        fixedCostAllocation: 15.0,
        autoApplyDiscount: true,
        turnoverPeriod: TurnoverPeriod.MONTHLY,
        stockThresholds: { riskMin: 1, riskMax: 15, safetyMax: 45 },
        discountSafety: 0,
        discountRisk: 5,
        discountExcess: 15,
        companyInfo: {
            name: '', cnpjCpf: '', phone: '', email: '',
            address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' }
        }
    });

    const [showSetupWizard, setShowSetupWizard] = useState(false);
    
    // Blocking Logic State
    const [isSystemBlocked, setIsSystemBlocked] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    
    // First Run Single Tenant Logic
    const [isFirstRunST, setIsFirstRunST] = useState(false);
    
    // Migration Ready Logic
    const [isMigrationReady, setIsMigrationReady] = useState(false);
    // NEW: State for Migration Warning Modal
    const [showMigrationWarning, setShowMigrationWarning] = useState(false);

    // Helper to check if critical company info is missing
    const checkCriticalDataMissing = (settings: KpiGoals) => {
        const info = settings.companyInfo;
        if (!info) return true;
        
        // Basic Fields
        if (!info.name || !info.cnpjCpf || !info.email || !info.phone) return true;
        
        // Address Fields
        const addr = info.address;
        if (!addr) return true;
        if (!addr.cep || !addr.street || !addr.number || !addr.neighborhood || !addr.city || !addr.state) return true;

        return false;
    };

    // Check Billing Status
    useEffect(() => {
        const checkBilling = async () => {
            // Only check billing if we have a token (AuthContext provided it from memory)
            if (!token) return;
            
            try {
                const response = await fetch(`${SAAS_API_URL}/subscription/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    
                    // 1. Check if Migration is Provisioned and Ready (Waiting for Payment)
                    const requests = data.requests || [];
                    const readyRequest = requests.find((r: any) => r.type === 'upgrade' && r.status === 'waiting_payment');
                    
                    if (readyRequest) {
                        setIsMigrationReady(true);
                        // Auto-open modal if migration is ready
                        setShowStatusModal(true);
                    }

                    // 2. Determine Blocking Status
                    if (readyRequest) {
                        setIsSystemBlocked(false);
                    } else if (data.plan === 'single_tenant') {
                        // Check for First Run Configuration (Mandatory Setup)
                        if (data.billingDayConfigured === false) {
                            setIsFirstRunST(true);
                            setShowStatusModal(true);
                            setIsSystemBlocked(false); 
                            return; 
                        }

                        const today = new Date();
                        const billingDay = data.monthlyPaymentDay || 5;
                        const lastPaid = data.lastPaymentDate ? new Date(data.lastPaymentDate) : null;
                        const subEndsAt = data.subscriptionEndsAt ? new Date(data.subscriptionEndsAt) : null;
                        
                        const paidThisMonth = lastPaid && lastPaid.getMonth() === today.getMonth() && lastPaid.getFullYear() === today.getFullYear();
                        
                        const isSubValidByDate = subEndsAt && subEndsAt > today;

                        if (!isSubValidByDate && !paidThisMonth && today.getDate() > (billingDay + 3)) {
                            setIsSystemBlocked(true);
                        } else {
                            setIsSystemBlocked(false);
                        }
                    } else if (data.status === 'blocked' || data.status === 'expired') {
                        setIsSystemBlocked(true);
                    } else {
                        setIsSystemBlocked(false);
                    }
                }
            } catch (e) { console.error("Billing check failed", e); }
        };
        checkBilling();
    }, [token]);

    const handleCloseStatusModal = () => {
        // Updated Logic: Open custom modal instead of alert
        if (isMigrationReady) {
            setShowMigrationWarning(true);
        } else {
            setShowStatusModal(false);
        }
    };

    const handleConfirmCloseMigration = () => {
        setShowMigrationWarning(false);
        setShowStatusModal(false);
    };

    const handleCancelCloseMigration = () => {
        setShowMigrationWarning(false);
    };

    const fetchData = async (endpoint: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
        const data = await apiCall(endpoint, 'GET');
        if (data) {
            setter(data);
        }
    };
    
    // Initial Data Fetch
    useEffect(() => {
        // We rely on 'user' being present, which means authentication (cookie) is set.
        // We don't need 'token' for these internal calls as apiCall uses credentials: 'include'.
        if (user) {
            const fetchSettings = async () => {
                const settings = await apiCall('settings', 'GET');
                if (settings) {
                    setGoals(prev => ({ ...prev, ...settings }));
                    
                    // Check if setup is complete OR if critical data is missing
                    const isMissingData = checkCriticalDataMissing(settings);
                    
                    if ((settings.isSetupComplete === false || isMissingData) && (user?.role === 'owner' || user?.role === 'manager')) {
                        setShowSetupWizard(true);
                    } else {
                        setShowSetupWizard(false);
                    }
                }
            };
            fetchSettings();

            fetchData('products', setProducts);
            fetchData('services', setServices);
            fetchData('service-orders', setServiceOrders);
            fetchData('customers', setCustomers);

            if(user?.role === 'owner' || user?.role === 'manager') {
               fetchData('transactions', setTransactions);
               fetchData('purchases', setPurchaseOrders);
               fetchData('sales', setTicketSales);
               fetchData('users', setUsers);
               fetchData('suppliers', setSuppliers);
            }
        }
    }, [user]); 

    // ... existing handlers ...
    const handleSaveGoals = async (newGoals: KpiGoals) => {
        setGoals(newGoals);
        await apiCall('settings', 'PUT', newGoals);
        if (newGoals.isSetupComplete && !checkCriticalDataMissing(newGoals)) {
            setShowSetupWizard(false);
        }
    };

    // ... existing CRUD handlers ...
    const addTransaction = async (transaction: Omit<CashTransaction, 'id' | 'timestamp'>) => {
        const result = await apiCall('transactions', 'POST', transaction);
        if (result) await fetchData('transactions', setTransactions);
    };
    const updateTransaction = async (updatedTransaction: CashTransaction) => {
        const result = await apiCall(`transactions/${updatedTransaction.id}`, 'PUT', updatedTransaction);
        if (result) await fetchData('transactions', setTransactions);
    };
    const deleteTransaction = async (transactionId: string) => {
        const result = await apiCall(`transactions/${transactionId}`, 'DELETE');
        if (result) await fetchData('transactions', setTransactions);
    };
    const updateTransactionStatus = async (transactionId: string, status: any) => {
        const transactionToUpdate = transactions.find(t => t.id === transactionId);
        if (transactionToUpdate) {
            await updateTransaction({ ...transactionToUpdate, status });
        }
    };
    const handleAddPurchase = async (purchaseOrderData: any) => {
        const result = await apiCall('purchases', 'POST', purchaseOrderData);
        if (result) {
            await fetchData('purchases', setPurchaseOrders);
            await fetchData('products', setProducts);
            await fetchData('transactions', setTransactions);
            await fetchData('suppliers', setSuppliers);
        }
    };
    const updatePurchaseOrder = async (updatedPO: PurchaseOrder) => {
        const result = await apiCall(`purchases/${updatedPO.id}`, 'PUT', updatedPO);
        if (result) {
            await fetchData('purchases', setPurchaseOrders);
            await fetchData('products', setProducts);
            await fetchData('transactions', setTransactions);
            await fetchData('suppliers', setSuppliers);
        }
    };
    const deletePurchaseOrder = async (purchaseOrderId: string) => {
        const result = await apiCall(`purchases/${purchaseOrderId}`, 'DELETE');
        if (result) {
            await fetchData('purchases', setPurchaseOrders);
            await fetchData('products', setProducts);
            await fetchData('transactions', setTransactions);
        }
    };
    const addServiceOrder = async (orderData: any) => {
        const result = await apiCall('service-orders', 'POST', orderData);
        if (result) {
            await fetchData('service-orders', setServiceOrders);
            await fetchData('customers', setCustomers);
        }
    };
    const updateServiceOrder = async (updatedOrder: ServiceOrder) => {
        const result = await apiCall(`service-orders/${updatedOrder.id}`, 'PUT', updatedOrder);
        if (result) {
            await fetchData('service-orders', setServiceOrders);
            await fetchData('customers', setCustomers);
        }
    };
    const deleteServiceOrder = async (orderId: string) => {
        const result = await apiCall(`service-orders/${orderId}`, 'DELETE');
        if (result) {
            await fetchData('service-orders', setServiceOrders);
            if (user?.role !== 'technician') {
                await fetchData('transactions', setTransactions);
            }
        }
    };
    const toggleServiceOrderStatus = async (orderId: string, paymentData?: any) => {
        const result = await apiCall(`service-orders/${orderId}/toggle-status`, 'POST', paymentData);
         if (result) {
            await fetchData('service-orders', setServiceOrders);
            if (user?.role !== 'technician') {
                await fetchData('transactions', setTransactions);
            }
        }
        return result;
    };
    const addProduct = async (productData: any) => {
        const result = await apiCall('products', 'POST', productData);
        if (result) await fetchData('products', setProducts);
    };
    const updateProduct = async (updatedProduct: Product) => {
        const result = await apiCall(`products/${updatedProduct.id}`, 'PUT', updatedProduct);
        if (result) await fetchData('products', setProducts);
    };
    const deleteProduct = async (productId: string) => {
        const result = await apiCall(`products/${productId}`, 'DELETE');
        if (result) await fetchData('products', setProducts);
    };
    const addService = async (serviceData: any) => {
        const result = await apiCall('services', 'POST', serviceData);
        if (result) await fetchData('services', setServices);
    };
    const updateService = async (updatedService: Service) => {
        const result = await apiCall(`services/${updatedService.id}`, 'PUT', updatedService);
        if (result) await fetchData('services', setServices);
    };
    const deleteService = async (serviceId: string) => {
        const result = await apiCall(`services/${serviceId}`, 'DELETE');
        if (result) await fetchData('services', setServices);
    };
    const handleAddSale = async (saleData: any) => {
        const result = await apiCall('sales', 'POST', saleData);
        if (result) {
            if (user?.role === 'owner' || user?.role === 'manager') {
                await fetchData('sales', setTicketSales);
                await fetchData('transactions', setTransactions);
            }
            await fetchData('products', setProducts);
            await fetchData('customers', setCustomers);
        }
        return result;
    };
    const handleDeleteSale = async (saleId: string) => {
        const result = await apiCall(`sales/${saleId}`, 'DELETE');
        if (result) {
            await fetchData('sales', setTicketSales);
            await fetchData('products', setProducts);
            await fetchData('transactions', setTransactions);
        }
    };
    const handleAddUser = async (userData: any) => {
        const result = await apiCall('users', 'POST', userData);
        if (result) await fetchData('users', setUsers);
    };
    const handleUpdateUser = async (userData: any) => {
        const result = await apiCall(`users/${userData.id}`, 'PUT', userData);
        if (result) await fetchData('users', setUsers);
    };
    const handleDeleteUser = async (userId: string) => {
        const result = await apiCall(`users/${userId}`, 'DELETE');
        if (result) await fetchData('users', setUsers);
    };
    const handleUpdateProfile = async (userData: any) => {
        const result = await apiCall('users/profile', 'PUT', userData);
        if (result) {
            updateUserInContext(result);
            alert('Perfil atualizado com sucesso!');
            setActivePage(user?.role === 'technician' ? 'sales' : 'dashboard');
        }
    };
    const handleAddCustomer = async (customerData: any) => {
        const result = await apiCall('customers', 'POST', customerData);
        if (result) await fetchData('customers', setCustomers);
    };
    const handleUpdateCustomer = async (customerData: Customer) => {
        const result = await apiCall(`customers/${customerData.id}`, 'PUT', customerData);
        if (result) await fetchData('customers', setCustomers);
    };
    const handleDeleteCustomer = async (customerId: string) => {
        const result = await apiCall(`customers/${customerId}`, 'DELETE');
        if (result) await fetchData('customers', setCustomers);
    };
    const handleAddSupplier = async (supplierData: any) => {
        const result = await apiCall('suppliers', 'POST', supplierData);
        if (result) await fetchData('suppliers', setSuppliers);
    };
    const handleUpdateSupplier = async (supplierData: Supplier) => {
        const result = await apiCall(`suppliers/${supplierData.id}`, 'PUT', supplierData);
        if (result) await fetchData('suppliers', setSuppliers);
    };
    const handleDeleteSupplier = async (supplierId: string) => {
        const result = await apiCall(`suppliers/${supplierId}`, 'DELETE');
        if (result) await fetchData('suppliers', setSuppliers);
    };

    const renderContent = () => {
        switch (activePage) {
            case 'dashboard': return <Dashboard transactions={transactions} ticketSales={ticketSales} products={products} goals={goals} onSaveGoals={handleSaveGoals} />;
            case 'sales': return <Sales products={products} onAddSale={handleAddSale} goals={goals} />;
            case 'sales-history': return <SalesHistory ticketSales={ticketSales} onDeleteSale={handleDeleteSale} setActivePage={setActivePage} />;
            case 'cash': return <Cash transactions={transactions} updateTransactionStatus={updateTransactionStatus} />;
            case 'purchases': return <Purchases products={products} purchaseOrders={purchaseOrders} onAddPurchase={handleAddPurchase} onUpdatePurchase={updatePurchaseOrder} onDeletePurchase={deletePurchaseOrder} />;
            case 'costs': return <Costs transactions={transactions} addTransaction={addTransaction} updateTransaction={updateTransaction} deleteTransaction={deleteTransaction} />;
            case 'service-orders': return <ServiceOrders services={services} serviceOrders={serviceOrders} onAddServiceOrder={addServiceOrder} onUpdateServiceOrder={updateServiceOrder} onDeleteServiceOrder={deleteServiceOrder} onToggleStatus={toggleServiceOrderStatus} setActivePage={setActivePage} goals={goals} />;
            case 'products': return <Products products={products} ticketSales={ticketSales} onAddProduct={addProduct} onUpdateProduct={(p) => updateProduct(p)} onDeleteProduct={deleteProduct} goals={goals} />;
            case 'services': return <Services services={services} onAddService={addService} onUpdateService={updateService} onDeleteService={deleteService} goals={goals} />;
            case 'customers': return <Customers customers={customers} ticketSales={ticketSales} serviceOrders={serviceOrders} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onDeleteCustomer={handleDeleteCustomer} />;
            case 'suppliers': return <Suppliers suppliers={suppliers} onAddSupplier={handleAddSupplier} onUpdateSupplier={handleUpdateSupplier} onDeleteSupplier={handleDeleteSupplier} />;
            case 'users': return <Users users={users} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />;
            case 'profile': return <Profile onUpdateProfile={handleUpdateProfile} />;
            default: return <Dashboard transactions={transactions} ticketSales={ticketSales} products={products} goals={goals} onSaveGoals={handleSaveGoals} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
            {isSystemBlocked && <BlockScreen onClose={() => setShowStatusModal(true)} />}
            
            {showStatusModal && (
                <SystemStatusModal 
                    onClose={handleCloseStatusModal} 
                    isFirstRun={isFirstRunST}
                />
            )}

            {/* Warning Modal for Migration Data Loss */}
            {showMigrationWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[150] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 text-center border-2 border-red-500">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/50 mb-6">
                            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Risco de Perda de Dados</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                            Seu novo sistema <strong>Single-Tenant</strong> já está pronto para uso.
                            <br/><br/>
                            Qualquer dado inserido neste ambiente de teste a partir de agora <strong>NÃO</strong> será migrado para o novo sistema.
                            <br/><br/>
                            Tem certeza que deseja continuar aqui?
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={handleCancelCloseMigration}
                                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg"
                            >
                                Voltar e Migrar
                            </button>
                            <button
                                onClick={handleConfirmCloseMigration}
                                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                Sim, Sair
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSetupWizard && !isSystemBlocked && !isFirstRunST && (
                <GoalsModal currentGoals={goals} onSave={handleSaveGoals} onClose={() => {}} forceSetup={true} />
            )}
            
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 shadow-md">
                <div className="flex items-center">
                     <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.5 5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m2 0a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m7.5-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m1.5.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m-7-1a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1zm5.5 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>
                        <path d="M11.5 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5m0-1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M5 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>
                        <path d="M7 10.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0m-1 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"/>
                        <path d="M14 0a.5.5 0 0 1 .5.5V2h.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12.5V.5A.5.5 0 0 1 14 0M1 3v3h14V3zm14 4H1v7h14z"/>
                      </svg>
                    <h1 className="ml-2 text-lg font-bold text-gray-900 dark:text-white">SmartStore</h1>
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="text-gray-600 dark:text-gray-300 focus:outline-none p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            <Sidebar 
                activePage={activePage} 
                setActivePage={setActivePage} 
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Main Content - Adjusted margin for Desktop only */}
            <main className="flex-1 flex flex-col h-full overflow-hidden lg:ml-0 pt-16 lg:pt-0">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default Layout;
