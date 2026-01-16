
import React, { useState, useEffect, useContext } from 'react';
import { EcommerceOrder, KpiGoals, TicketSale, Product } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config'; 
import { formatCurrencyNumber, formatPhone, formatMoney } from '../validation';
import EcommercePoliciesModal from './EcommercePoliciesModal';

// --- MODALS ---

const NotificationModal: React.FC<{ isOpen: boolean; type: 'success' | 'error'; message: string; onClose: () => void }> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
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

const ConfirmationModal: React.FC<{ message: React.ReactNode; onConfirm: () => void; onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-140 p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Confirmar Ação</h3>
            <div className="mb-6 text-gray-700 dark:text-gray-300 text-sm">{message}</div>
            <div className="flex justify-end space-x-4">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 dark:text-white">Cancelar</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Confirmar</button>
            </div>
        </div>
    </div>
);

const ReceiptModal: React.FC<{ imageData: string; fileName: string; onClose: () => void }> = ({ imageData, fileName, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-120 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md flex flex-col items-center">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Comprovante de Entrega</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6 max-h-[60vh] overflow-y-auto bg-white">
                    <img src={imageData} alt="Comprovante" className="max-w-full shadow-sm" />
                </div>
                <div className="flex gap-4 w-full">
                    <button onClick={onClose} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300">Fechar</button>
                    <a href={imageData} download={fileName} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-semibold">
                        Baixar
                    </a>
                </div>
            </div>
        </div>
    );
};

// --- INTERFACES ---

interface Props {
    goals: KpiGoals;
    products: Product[];
    onOrderUpdate: () => void;
}

// --- DETAILS MODAL ---

const OrderDetailsModal: React.FC<{ 
    order: EcommerceOrder; 
    onClose: () => void;
    onUpdateStatus: (id: string, status: string, shippingInfo?: any, items?: any[]) => Promise<void>;
    onUpdateShipping: (id: string, shippingInfo: any) => void;
    onGenerateReceipt: (order: EcommerceOrder) => void;
    goals: KpiGoals;
    products: Product[];
}> = ({ order, onClose, onUpdateStatus, onUpdateShipping, onGenerateReceipt, goals, products }) => {
    const [shippingMethod, setShippingMethod] = useState(order.shippingInfo?.method || '');
    const [trackingCode, setTrackingCode] = useState(order.shippingInfo?.trackingCode || '');
    const [shippingCost, setShippingCost] = useState(formatMoney(order.shippingInfo?.cost?.toString() || '0'));
    const [isEditingShipping, setIsEditingShipping] = useState(false);
    
    // Identifier State
    const [itemIdentifiers, setItemIdentifiers] = useState<{ [key: string]: string }>({});
    const [requiredIdentifiers, setRequiredIdentifiers] = useState<string[]>([]);
    
    const [confirmAction, setConfirmAction] = useState<{message: React.ReactNode, action: () => void} | null>(null);
    const [notification, setNotification] = useState<{isOpen: boolean; type: 'success' | 'error'; message: string}>({ isOpen: false, type: 'error', message: '' });
    const [errorMessage, setErrorMessage] = useState(''); 

    const parseMoney = (val: string) => parseFloat(val.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;

    // Initialize Identifiers
    useEffect(() => {
        const required: string[] = [];
        const initialIds: { [key: string]: string } = {};

        order.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product && product.requiresUniqueIdentifier) {
                required.push(item.productId);
                if (item.uniqueIdentifier) initialIds[item.productId] = item.uniqueIdentifier;
            }
        });
        
        setRequiredIdentifiers(required);
        // Only set initial IDs if not already set (preserve user input)
        setItemIdentifiers(prev => ({...initialIds, ...prev}));
    }, [order, products]);

    const handleSend = () => {
        if (!shippingMethod) { 
            setNotification({ isOpen: true, type: 'error', message: "Informe o método de envio." });
            return; 
        }

        // Validate Identifiers
        const missingIds = requiredIdentifiers.filter(id => !itemIdentifiers[id] || itemIdentifiers[id].trim() === '');
        if (missingIds.length > 0) {
            setNotification({ isOpen: true, type: 'error', message: "Preencha os identificadores únicos (Serial/IMEI) obrigatórios." });
            return;
        }
        
        const payload = {
            method: shippingMethod,
            trackingCode,
            cost: parseMoney(shippingCost)
        };
        
        if (order.status === 'PENDING') {
            // Prepare updated items list with identifiers
            const updatedItems = order.items.map(item => ({
                ...item,
                uniqueIdentifier: itemIdentifiers[item.productId] || item.uniqueIdentifier
            }));

            setConfirmAction({
                message: (
                    <div>
                        <p className="font-bold">Confirmar Envio?</p>
                        <p className="mt-2 text-red-600">Atenção: Os itens serão debitados do estoque.</p>
                        <p className="text-xs text-gray-500 mt-1">Se houver falta de estoque, a operação será bloqueada.</p>
                    </div>
                ),
                action: async () => {
                    try {
                        await onUpdateStatus(order.id, 'SENT', payload, updatedItems);
                        setErrorMessage('');
                    } catch (e: any) {
                        setErrorMessage(e.message || "Erro ao atualizar status");
                    }
                }
            });
        } else {
            // Just updating info (Already Sent/Delivered)
            onUpdateShipping(order.id, payload);
            setIsEditingShipping(false);
        }
    };

    const handleDeliver = () => {
        setConfirmAction({
            message: (
                <div>
                    <p className="font-bold">Confirmar Entrega?</p>
                    <p className="mt-2 text-green-600">O valor da venda será lançado no Caixa.</p>
                </div>
            ),
            action: () => onUpdateStatus(order.id, 'DELIVERED')
        });
    };

    const handleRevertToSent = () => {
        setConfirmAction({
            message: (
                <div>
                    <p className="font-bold">Reverter para Enviado?</p>
                    <p className="mt-2 text-red-600">❌ O lançamento financeiro no Caixa será removido.</p>
                    <p className="text-xs text-gray-500">(O estoque continua baixado pois o produto está em trânsito).</p>
                </div>
            ),
            action: () => onUpdateStatus(order.id, 'SENT')
        });
    };

    const handleRevertToPending = () => {
        setConfirmAction({
            message: (
                <div>
                    <p className="font-bold">Cancelar Envio?</p>
                    <p className="mt-2 text-green-600">Os itens serão devolvidos ao estoque.</p>
                </div>
            ),
            action: () => onUpdateStatus(order.id, 'PENDING')
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <NotificationModal 
                isOpen={notification.isOpen} 
                type={notification.type} 
                message={notification.message} 
                onClose={() => setNotification({...notification, isOpen: false})} 
            />

            {confirmAction && (
                <ConfirmationModal 
                    message={confirmAction.message}
                    onConfirm={() => { confirmAction.action(); setConfirmAction(null); }}
                    onCancel={() => setConfirmAction(null)}
                />
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
                {errorMessage && (
                    <div className="sticky top-0 left-0 w-full bg-red-500 text-white p-3 text-center text-sm font-bold z-10 animate-fade-in flex justify-between items-center px-4 shadow-md">
                        <span className="flex-1">{errorMessage}</span>
                        <button onClick={() => setErrorMessage('')} className="ml-4 hover:bg-white/20 rounded p-1">✕</button>
                    </div>
                )}
                
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold dark:text-white">Pedido #{order.id}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Cliente</h4>
                            <p className="text-sm dark:text-gray-200"><strong>Nome:</strong> {order.customer.name}</p>
                            <p className="text-sm dark:text-gray-200"><strong>Tel:</strong> {formatPhone(order.customer.phone)}</p>
                            <a 
                                href={`https://wa.me/55${order.customer.phone.replace(/\D/g,'')}?text=Olá ${order.customer.name}, sobre seu pedido ${order.id}...`} 
                                target="_blank" 
                                className="text-xs text-green-600 font-bold hover:underline mt-1 inline-block"
                            >
                                Enviar Mensagem
                            </a>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Endereço de Entrega</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {order.customer.address.street}, {order.customer.address.number} {order.customer.address.complement}
                                <br/>
                                {order.customer.address.neighborhood} - {order.customer.address.city}/{order.customer.address.state}
                                <br/>
                                CEP: {order.customer.address.cep}
                            </p>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Itens</h4>
                        <div className="border rounded-lg overflow-hidden dark:border-gray-600">
                            {order.items.map((item, idx) => {
                                const needsId = requiredIdentifiers.includes(item.productId);
                                const isPending = order.status === 'PENDING';
                                
                                return (
                                <div key={idx} className="p-3 border-b last:border-0 dark:border-gray-600 bg-white dark:bg-gray-800">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm dark:text-gray-200">{item.quantity}x {item.productName}</span>
                                        <span className="text-sm font-bold dark:text-white">R$ {formatCurrencyNumber(item.unitPrice * item.quantity)}</span>
                                    </div>
                                    
                                    {/* ID Input for tracked items */}
                                    {needsId && (
                                        <div className="mt-2">
                                            {isPending ? (
                                                <input 
                                                    type="text" 
                                                    placeholder="Insira Serial/IMEI único" 
                                                    className="w-full text-xs p-1.5 border border-orange-300 rounded bg-orange-50 focus:ring-1 focus:ring-orange-500 outline-none dark:bg-gray-700 dark:border-gray-500 dark:text-white"
                                                    value={itemIdentifiers[item.productId] || ''}
                                                    onChange={e => setItemIdentifiers(prev => ({...prev, [item.productId]: e.target.value}))}
                                                />
                                            ) : (
                                                <p className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                                                    ID: {item.uniqueIdentifier || 'N/A'}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )})}
                            <div className="p-3 bg-gray-100 dark:bg-gray-700 flex justify-between items-center">
                                <span className="font-bold dark:text-white">Total</span>
                                <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">R$ {formatCurrencyNumber(order.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Section */}
                    {(order.status === 'PENDING' || isEditingShipping) && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-blue-800 dark:text-blue-300">Dados de Envio</h4>
                                {isEditingShipping && (
                                    <button onClick={() => setIsEditingShipping(false)} className="text-xs text-gray-500 hover:underline">Cancelar Edição</button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Método</label>
                                    <input type="text" value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} placeholder="Ex: Correios" className="w-full p-2 text-sm rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Rastreio</label>
                                    <input type="text" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="Código" className="w-full p-2 text-sm rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Custo</label>
                                    <input type="text" value={shippingCost} onChange={e => setShippingCost(formatMoney(e.target.value))} placeholder="R$ 0,00" className="w-full p-2 text-sm rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                                </div>
                            </div>
                            <button onClick={handleSend} className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm">
                                {isEditingShipping ? 'Salvar Alterações' : 'Confirmar Envio e Baixar Estoque'}
                            </button>
                        </div>
                    )}

                    {(order.status === 'SENT' || order.status === 'DELIVERED') && !isEditingShipping && (
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600 relative">
                            {order.status === 'SENT' && (
                                <button onClick={handleRevertToPending} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xl font-bold p-1" title="Cancelar Envio (Devolve Estoque)">×</button>
                            )}
                            <h4 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                                📦 Dados do Envio
                                <span className="text-xs font-normal bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500" onClick={() => setIsEditingShipping(true)}>Editar</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm dark:text-gray-300">
                                <p><strong>Método:</strong> {order.shippingInfo?.method}</p>
                                <p><strong>Rastreio:</strong> {order.shippingInfo?.trackingCode || '-'}</p>
                                <p><strong>Custo:</strong> R$ {formatCurrencyNumber(order.shippingInfo?.cost)}</p>
                                <p><strong>Enviado:</strong> {order.shippingInfo?.shippedAt ? new Date(order.shippingInfo.shippedAt).toLocaleDateString() : '-'}</p>
                            </div>
                            
                            {order.status === 'SENT' && (
                                <button onClick={handleDeliver} className="mt-4 w-full py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-md">
                                    Marcar como Entregue (Gerar Caixa)
                                </button>
                            )}
                        </div>
                    )}

                    {order.status === 'DELIVERED' && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 relative">
                            <button onClick={handleRevertToSent} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xl font-bold p-1" title="Estornar Financeiro">×</button>
                            <h4 className="font-bold text-green-800 dark:text-green-300 mb-2">Pedido Entregue</h4>
                            <p className="text-xs text-green-700 dark:text-green-400 mb-4">Venda contabilizada no caixa.</p>
                            <button onClick={() => onGenerateReceipt(order)} className="w-full py-2 bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 rounded font-bold hover:bg-green-50 dark:hover:bg-gray-700 shadow-sm">
                              Gerar Comprovante
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const EcommerceOrders: React.FC<Props> = ({ goals, products, onOrderUpdate }) => {
    const { apiCall, token } = useContext(AuthContext); // token needed for raw fetch
    const [orders, setOrders] = useState<EcommerceOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<EcommerceOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [receiptImage, setReceiptImage] = useState<{data: string, name: string} | null>(null);
    const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
    
    // Policy Check State
    const [showPoliciesModal, setShowPoliciesModal] = useState(false);
    const [localGoals, setLocalGoals] = useState(goals);

    // Initial check for mandatory policies
    useEffect(() => {
        if (!localGoals.ecommercePolicies?.configured) {
            setShowPoliciesModal(true);
        }
    }, [localGoals]);

    const fetchOrders = async () => {
        setLoading(true);
        const data = await apiCall('ecommerce-orders', 'GET');
        if (data) setOrders(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    // FIX: Using direct fetch to capture specific backend error message
    const handleUpdateStatus = async (id: string, status: string, shippingInfo?: any, items?: any[]) => {
        try {
            const response = await fetch(`${API_BASE_URL}/ecommerce-orders/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, shippingInfo, items }) // Inclui itens atualizados (IDs)
            });

            const data = await response.json();

            if (!response.ok) {
                // Pass backend message to UI
                throw new Error(data.message || "Erro no servidor ao atualizar status");
            }

            await fetchOrders();
            
            // Refresh Selected Order with new data
            setOrders(prevOrders => {
                const updated = prevOrders.find(o => o.id === id);
                if (updated) setSelectedOrder(updated);
                return prevOrders;
            });
            const refreshedOrder = await apiCall('ecommerce-orders', 'GET').then((all: EcommerceOrder[]) => all.find(o => o.id === id));
            if (refreshedOrder) setSelectedOrder(refreshedOrder);
            
            if (onOrderUpdate) onOrderUpdate();
        } catch (error: any) {
            throw error; // Re-throw to be caught by modal
        }
    };

    const handleUpdateShipping = async (id: string, shippingInfo: any) => {
        const updated = await apiCall(`ecommerce-orders/${id}/shipping`, 'PUT', { shippingInfo });
        if (updated) {
            setSelectedOrder(updated);
            fetchOrders();
        }
    };

    const handleDeleteOrder = async () => {
        if (!deletingOrderId) return;
        await apiCall(`ecommerce-orders/${deletingOrderId}`, 'DELETE');
        setDeletingOrderId(null);
        setSelectedOrder(null);
        fetchOrders();
        if (onOrderUpdate) onOrderUpdate();
    };

    // ... (generateReceipt - same as original)
    const generateReceipt = async (order: EcommerceOrder) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = 380;
        canvas.width = width;
        canvas.height = 800; 

        // Background
        ctx.fillStyle = '#fde0bc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';

        const padding = 20;
        const lineHeight = 20;
        const fontRegular = '12px "Courier New", monospace';
        const fontBold = 'bold 12px "Courier New", monospace';
        const fontHeader = 'bold 20px "Courier New", monospace';
        
        let y = padding;

        const drawText = (text: string, font: string, x: number, align: 'left' | 'center' | 'right' = 'left') => {
            ctx.font = font;
            const metrics = ctx.measureText(text);
            let drawX = x;
            if (align === 'center') drawX = x - (metrics.width / 2);
            if (align === 'right') drawX = x - metrics.width;
            ctx.fillText(text, drawX, y);
        };

        const drawDivider = () => {
            y += 5;
            ctx.beginPath();
            ctx.setLineDash([4, 2]);
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            ctx.setLineDash([]); 
            y += 15;
        };

        // Header
        drawText("SmartStore", fontHeader, width / 2, 'center');
        y += 30;
        drawText("RECIBO DE ENTREGA", fontBold, width / 2, 'center');
        y += 20;
        drawDivider();

        // Info
        drawText(`PEDIDO: ${order.id}`, fontBold, padding);
        y += lineHeight;
        drawText(`DATA: ${new Date(order.createdAt).toLocaleDateString()}`, fontRegular, padding);
        y += lineHeight;
        drawText(`CLIENTE: ${order.customer.name}`, fontRegular, padding);
        y += lineHeight;
        drawText(`ENDEREÇO: ${order.customer.address.street}, ${order.customer.address.number}`, fontRegular, padding);
        y += lineHeight;
        drawText(`${order.customer.address.neighborhood} - ${order.customer.address.city}`, fontRegular, padding);
        y += lineHeight;

        drawDivider();
        drawText("ITENS", fontBold, padding);
        y += lineHeight;

        order.items.forEach(item => {
            drawText(`${item.quantity}x ${item.productName.substring(0,25)}`, fontRegular, padding);
            drawText(`R$ ${formatCurrencyNumber(item.unitPrice * item.quantity)}`, fontBold, width - padding, 'right');
            y += lineHeight;
        });

        drawDivider();
        
        if (order.shippingInfo?.cost && order.shippingInfo.cost > 0) {
            drawText("FRETE:", fontRegular, padding);
            drawText(`R$ ${formatCurrencyNumber(order.shippingInfo.cost)}`, fontBold, width - padding, 'right');
            y += lineHeight;
        }

        drawText("TOTAL:", fontHeader, padding);
        drawText(`R$ ${formatCurrencyNumber(order.total + (order.shippingInfo?.cost || 0))}`, fontHeader, width - padding, 'right');
        y += 40;
        
        if (goals.companyInfo?.name) {
            drawText(goals.companyInfo.name, fontBold, width / 2, 'center');
            y += lineHeight;
        }
        
        y += padding;

        const finalData = ctx.getImageData(0, 0, width, y);
        canvas.height = y;
        ctx.putImageData(finalData, 0, 0);

        setReceiptImage({ data: canvas.toDataURL('image/png'), name: `${order.id}.png` });
    };


    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'PENDING': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">Pendente</span>;
            case 'SENT': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">Enviado</span>;
            case 'DELIVERED': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Entregue</span>;
            case 'CANCELLED': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">Cancelado</span>;
            default: return status;
        }
    };
    
    // Callback after saving policies
    const handlePoliciesSaved = async () => {
        try {
            // Re-fetch settings to update local state and hide modal
            const settings = await apiCall('settings', 'GET');
            if (settings) setLocalGoals(settings);
            setShowPoliciesModal(false);
        } catch(e) { }
    };

    return (
        <div className="container mx-auto">
            {/* Policy Enforcement Modal */}
            <EcommercePoliciesModal 
                isOpen={showPoliciesModal}
                onClose={() => { /* Not closable unless configured */ }}
                onSave={handlePoliciesSaved}
                goals={localGoals}
            />

            {receiptImage && (
                <ReceiptModal 
                    imageData={receiptImage.data} 
                    fileName={receiptImage.name} 
                    onClose={() => setReceiptImage(null)} 
                />
            )}
            
            {deletingOrderId && (
                <ConfirmationModal
                    message="Tem certeza que deseja excluir este pedido? Ações de estoque e financeiro serão revertidas se aplicável."
                    onConfirm={handleDeleteOrder}
                    onCancel={() => setDeletingOrderId(null)}
                />
            )}

            {selectedOrder && (
                <OrderDetailsModal 
                    order={selectedOrder} 
                    onClose={() => setSelectedOrder(null)} 
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateShipping={handleUpdateShipping}
                    onGenerateReceipt={generateReceipt}
                    goals={goals}
                    products={products} // Pass Products
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pedidos E-commerce</h1>
                    <button onClick={() => setShowPoliciesModal(true)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded hover:bg-indigo-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
                          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
                        </svg>
                        Políticas Legais
                    </button>
                </div>
                <button onClick={fetchOrders} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">🔄</button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Pedido #</th>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">WhatsApp</th>
                                <th className="px-6 py-3">Total</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Nenhum pedido recebido.</td></tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-mono font-medium">{order.id}</td>
                                        <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{order.customer.name}</td>
                                        <td className="px-6 py-4">{formatPhone(order.customer.phone)}</td>
                                        <td className="px-6 py-4 font-bold text-indigo-600">R$ {formatCurrencyNumber(order.total)}</td>
                                        <td className="px-6 py-4 text-center">{getStatusBadge(order.status)}</td>
                                        <td className="px-6 py-4 text-center space-x-2">
                                            <button 
                                                onClick={() => setSelectedOrder(order)} 
                                                className="text-indigo-600 hover:underline font-bold text-xs"
                                            >
                                                Ver Detalhes
                                            </button>
                                            <button 
                                                onClick={() => setDeletingOrderId(order.id)}
                                                className="text-red-500 hover:underline font-bold text-xs"
                                            >
                                                Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EcommerceOrders;
