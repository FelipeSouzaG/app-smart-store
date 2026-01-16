import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { ServiceOrder, ServiceOrderStatus, Service, Customer, KpiGoals, PaymentMethod, FinancialAccount, TransactionStatus } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { formatName, validateName, formatPhone, validatePhone, formatCurrencyNumber, formatRegister, formatMoney, validateRegister } from '../validation';

// ... (OSStatusBadge, NotificationModal unchanged) ...
const OSStatusBadge: React.FC<{ status: ServiceOrderStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    const statusClasses = {
        [ServiceOrderStatus.COMPLETED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        [ServiceOrderStatus.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const NotificationModal: React.FC<{ isOpen: boolean; type: 'success' | 'error'; message: string; onClose: () => void }> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
                    {type === 'success' ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    )}
                </div>
                <h3 className={`text-lg leading-6 font-bold text-center mb-2 ${type === 'success' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
                    {type === 'success' ? 'Sucesso!' : 'Atenção'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 text-center mb-6">
                    {message}
                </p>
                <button
                    onClick={onClose}
                    className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm transition-colors ${type === 'success' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}`}
                >
                    Entendi
                </button>
            </div>
        </div>
    );
};

const ReceiptModal: React.FC<{ imageData: string; fileName: string; onClose: () => void }> = ({ imageData, fileName, onClose }) => {
    const [downloadSuccess, setDownloadSuccess] = useState(false);

    const handleDownload = () => {
        try {
            const link = document.createElement('a');
            link.href = imageData;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setDownloadSuccess(true);
        } catch (error) {
            console.error('Error downloading:', error);
            alert('Erro ao baixar a imagem.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-150 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md flex flex-col items-center">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Comprovante de Serviço</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6 max-h-[60vh] overflow-y-auto bg-white">
                    <img src={imageData} alt="Comprovante" className="max-w-full shadow-sm" />
                </div>
                
                {downloadSuccess ? (
                    <div className="w-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 rounded-lg text-center mb-4 animate-fade-in">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="font-bold">Sucesso!</span>
                        </div>
                        <p className="text-sm">O comprovante foi salvo na sua pasta <strong>Downloads</strong>.</p>
                        <button onClick={onClose} className="mt-3 text-sm underline hover:text-green-900 dark:hover:text-green-200">Fechar Janela</button>
                    </div>
                ) : (
                    <div className="flex gap-4 w-full">
                        <button onClick={onClose} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300">Fechar</button>
                        <button onClick={handleDownload} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-semibold">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Baixar Comprovante
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const generateServiceOrderReceipt = async (order: ServiceOrder, goals: KpiGoals, userName: string): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    const width = 380;
    canvas.width = width;
    canvas.height = 1000; 

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
    const fontSmall = '11px "Courier New", monospace';

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

    const wrapText = (text: string, font: string) => {
        ctx.font = font;
        const words = text.split(' ');
        let line = '';
        const maxWidth = width - (padding * 2);

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, padding, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, padding, y);
        y += lineHeight;
    };

    // --- HEADER WITH SMARTSTORE LOGO ---
    const pathData1 = 'M2.5 5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m2 0a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m7.5-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m1.5.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m-7-1a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1zm5.5 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0';
    const pathData2 = 'M11.5 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5m0-1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M5 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0';
    const pathData3 = 'M7 10.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0m-1 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0';
    const pathData4 = 'M14 0a.5.5 0 0 1 .5.5V2h.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12.5V.5A.5.5 0 0 1 14 0M1 3v3h14V3zm14 4H1v7h14z';

    const p1 = new Path2D(pathData1);
    const p2 = new Path2D(pathData2);
    const p3 = new Path2D(pathData3);
    const p4 = new Path2D(pathData4);

    ctx.font = fontHeader;
    const titleText = "SmartStore";
    const titleMetrics = ctx.measureText(titleText);
    const iconSize = 24; // 16 * 1.5
    const gap = 10;
    const headerTotalWidth = iconSize + gap + titleMetrics.width;
    const headerX = (width - headerTotalWidth) / 2;

    ctx.save();
    ctx.translate(headerX, y - 4); 
    ctx.scale(1.5, 1.5);
    ctx.fillStyle = '#000000';
    ctx.fill(p1);
    ctx.fill(p2);
    ctx.fill(p3);
    ctx.fill(p4);
    ctx.restore();

    drawText(titleText, fontHeader, headerX + iconSize + gap, 'left');
    y += 30;

    drawText("COMPROVANTE DE SERVIÇO", fontSmall, width / 2, 'center');
    y += 10;
    
    drawDivider();

    const dateStr = new Date().toLocaleString('pt-BR');
    drawText("DATA:", fontBold, padding);
    drawText(dateStr, fontRegular, width - padding, 'right');
    y += lineHeight;

    drawText("CLIENTE:", fontBold, padding);
    drawText(order.customerName.substring(0, 25), fontRegular, width - padding, 'right');
    y += lineHeight;

    drawText("TEL:", fontBold, padding);
    drawText(order.customerWhatsapp, fontRegular, width - padding, 'right');
    y += lineHeight;

    drawText("VENDEDOR:", fontBold, padding);
    drawText(userName, fontRegular, width - padding, 'right');
    y += lineHeight;

    drawText("Nº OS:", fontBold, padding);
    drawText(order.id.split('-').slice(0, 2).join('-'), fontRegular, width - padding, 'right');
    y += lineHeight;

    drawDivider();

    drawText("SERVIÇO REALIZADO", fontBold, padding);
    y += lineHeight;
    wrapText(order.serviceDescription, fontRegular);
    y += 5;

    drawDivider();

    drawText("VALOR TOTAL:", fontBold, padding);
    drawText(`R$ ${formatCurrencyNumber(order.totalPrice)}`, fontRegular, width - padding, 'right');
    y += lineHeight;

    if (order.discount && order.discount > 0) {
        drawText("DESCONTO:", fontBold, padding);
        drawText(`- R$ ${formatCurrencyNumber(order.discount)}`, fontRegular, width - padding, 'right');
        y += lineHeight;
    }

    y += 5;
    const finalPrice = order.finalPrice || order.totalPrice;
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText("PAGO:", padding, y);
    const finalPriceStr = `R$ ${formatCurrencyNumber(finalPrice)}`;
    const fpMetrics = ctx.measureText(finalPriceStr);
    ctx.fillText(finalPriceStr, width - padding - fpMetrics.width, y);
    y += lineHeight * 1.5;

    if (order.paymentMethod) {
        drawText(`Forma de Pagamento: ${order.paymentMethod}`, fontSmall, width / 2, 'center');
        y += lineHeight;
    }

    if (goals.companyInfo?.name) {
        drawDivider();
        drawText(goals.companyInfo.name.toUpperCase(), fontBold, width / 2, 'center');
        y += lineHeight;
        
        const addr = goals.companyInfo.address;
        if (addr && addr.street) {
            const line1 = `${addr.street}, ${addr.number}${addr.complement ? ' - ' + addr.complement : ''}`;
            const line2 = `${addr.neighborhood} - ${addr.city}/${addr.state}`;
            drawText(line1, fontSmall, width / 2, 'center');
            y += lineHeight - 5;
            drawText(line2, fontSmall, width / 2, 'center');
            y += lineHeight - 5;
        }
        if (goals.companyInfo.phone) {
            drawText(`Tel: ${formatPhone(goals.companyInfo.phone)}`, fontSmall, width / 2, 'center');
            y += lineHeight;
        }
    }

    y += padding;

    // Crop canvas
    const finalData = ctx.getImageData(0, 0, width, y);
    canvas.height = y;
    ctx.putImageData(finalData, 0, 0);

    return canvas.toDataURL('image/png');
};

// Modal to Handle Cost Payment
const CostPaymentModal: React.FC<{
    order: ServiceOrder,
    goals: KpiGoals,
    onClose: () => void,
    onConfirm: (costDetails: any) => void
}> = ({ order, goals, onClose, onConfirm }) => {
    const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PENDING);
    const [date, setDate] = useState(''); // Empty initially for Pending
    const [selectedAccountId, setSelectedAccountId] = useState('cash-box');
    const [installments, setInstallments] = useState(1);
    
    // Notification State
    const [notification, setNotification] = useState<{isOpen: boolean; type: 'success' | 'error'; message: string}>({
        isOpen: false, type: 'error', message: ''
    });

    const today = new Date().toISOString().split('T')[0];

    const isCashBox = selectedAccountId === 'cash-box';
    const isCreditCard = selectedAccountId === 'credit-main';

    // EFFECT: Set default values when status changes
    useEffect(() => {
        if (status === TransactionStatus.PAID) {
            setDate(today); // Default to today
        } else {
            setDate(''); // Clear for pending (force user input)
        }
    }, [status]);

    const handleConfirm = () => {
        if (status === TransactionStatus.PAID) {
            if (!date) {
                setNotification({ isOpen: true, type: 'error', message: "Selecione uma data de pagamento." });
                return;
            }
            // Block future dates for Paid status
            if (!isCreditCard && date > today) {
                setNotification({ isOpen: true, type: 'error', message: "A data do pagamento não pode ser futura." });
                return;
            }
        } else {
            // Pending Status Checks
            if (!date) {
                setNotification({ isOpen: true, type: 'error', message: "Selecione uma data de vencimento." });
                return;
            }
        }

        const costPayload = {
            status,
            financialAccountId: selectedAccountId,
            paymentMethodId: undefined, // Cleared as we use fixed IDs
            date,
            installments: isCreditCard ? installments : 1
        };

        onConfirm(costPayload);
    };

    // Calculate disabled state for button
    const isConfirmDisabled = useMemo(() => {
        if (status === TransactionStatus.PENDING) {
            return !date; // Must have due date
        }
        if (status === TransactionStatus.PAID) {
            if (!date) return true;
            if (isCreditCard && installments < 1) return true; 
            // Date validity check (future)
            if (!isCreditCard && date > today) return true;
        }
        return false;
    }, [status, date, isCreditCard, installments, today]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-60 p-4">
            <NotificationModal 
                isOpen={notification.isOpen} 
                type={notification.type} 
                message={notification.message} 
                onClose={() => setNotification({ ...notification, isOpen: false })} 
            />

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md animate-fade-in">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Pagamento do Custo do Serviço</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Este serviço tem um custo de <strong className="text-red-500">R$ {formatCurrencyNumber(order.totalCost)}</strong> (Peça/Mão de obra).
                    Como deseja registrar essa saída?
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Status do Pagamento</label>
                        <select 
                            value={status} 
                            onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                            className="w-full rounded p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        >
                            <option value={TransactionStatus.PENDING}>Pendente (A Pagar)</option>
                            <option value={TransactionStatus.PAID}>Pago (Realizado)</option>
                        </select>
                    </div>

                    {status === TransactionStatus.PENDING && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Vencimento <span className="text-red-500">*</span></label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                            <p className="text-xs text-gray-500 mt-1">Será registrado como uma despesa pendente no <strong>Caixa</strong>.</p>
                        </div>
                    )}

                    {status === TransactionStatus.PAID && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">Conta de Saída</label>
                                <select 
                                    value={selectedAccountId} 
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className="w-full rounded p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                >
                                    <option value="cash-box">Dinheiro do Caixa</option>
                                    {goals.financialSettings?.useBank && <option value="bank-main">Conta Bancária (Pix/Débito)</option>}
                                    {goals.financialSettings?.useCredit && <option value="credit-main">Cartão de Crédito</option>}
                                </select>
                            </div>

                            {isCreditCard && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded border border-yellow-200 dark:border-yellow-700">
                                    <label className="block text-sm font-medium mb-1 text-yellow-800 dark:text-yellow-400">Parcelamento</label>
                                    <select 
                                        value={installments} 
                                        onChange={(e) => setInstallments(Number(e.target.value))}
                                        className="w-full rounded p-2 bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-600"
                                    >
                                        {Array.from({length: 12}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
                                    </select>
                                    <p className="text-[10px] text-yellow-700 dark:text-yellow-300 mt-2 font-medium">
                                        ℹ️ A despesa será registrada na <strong>Fatura do Cartão</strong> (Menu Caixa).
                                    </p>
                                </div>
                            )}

                            {!isCreditCard && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Data do Pagamento <span className="text-red-500">*</span></label>
                                    <input 
                                        type="date" 
                                        value={date} 
                                        onChange={e => setDate(e.target.value)} 
                                        max={today} 
                                        className="w-full rounded p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600" 
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Será registrado como uma saída no <strong>Caixa</strong>.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded text-gray-800 dark:text-white">Cancelar</button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isConfirmDisabled}
                        className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

const OSModal: React.FC<{ 
    services: Service[], 
    orderToEdit?: ServiceOrder | null, 
    onClose: () => void; 
    onSave: (order: Omit<ServiceOrder, 'id' | 'createdAt' | 'status'> | ServiceOrder) => void;
    goals: KpiGoals;
}> = ({ services, orderToEdit, onClose, onSave, goals }) => {
    // ... [Existing OSModal Logic Unchanged] ...
    const { apiCall } = useContext(AuthContext);
    const [customerName, setCustomerName] = useState('');
    const [customerWhatsapp, setCustomerWhatsapp] = useState('');
    const [customerCnpjCpf, setCustomerCnpjCpf] = useState('');
    const [customerContact, setCustomerContact] = useState('');
    const [otherCosts, setOtherCosts] = useState('');
    const [errors, setErrors] = useState<{ name?: string; whatsapp?: string }>({});
    const [isCustomerLoading, setIsCustomerLoading] = useState(false);
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [cpfError, setCpfError] = useState('');
    const [isValidatingCpf, setIsValidatingCpf] = useState(false);
    const [selectedServiceName, setSelectedServiceName] = useState('');
    const [selectedBrand, setSelectedBrand] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    
    const selectedService = services.find(s => s.id === selectedServiceId);
    
    const availableServiceNames = useMemo(() => {
        return [...new Set(services.map(s => s.name))].sort();
    }, [services]);

    const availableBrands = useMemo(() => {
        if (!selectedServiceName) return [];
        return [...new Set(services.filter(s => s.name === selectedServiceName).map(s => s.brand))].sort();
    }, [services, selectedServiceName]);
    
    const availableModels = useMemo(() => {
        if (!selectedServiceName || !selectedBrand) return [];
        return [...new Set(services.filter(s => s.name === selectedServiceName && s.brand === selectedBrand).map(s => s.model))].sort();
    }, [services, selectedServiceName, selectedBrand]);

    const handleCurrencyChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        setter(formatMoney(value));
    };
    const parseCurrency = (value: string): number => {
        if (!value) return 0;
        const numericString = value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
        return parseFloat(numericString) || 0;
    };
    
    const serviceBaseCost = useMemo(() => {
        if (!selectedService) return 0;
        return selectedService.partCost + selectedService.serviceCost + selectedService.shippingCost;
    }, [selectedService]);

    const serviceBasePrice = useMemo(() => {
        if (!selectedService) return 0;
        return selectedService.price;
    }, [selectedService]);

    const numericOtherCosts = useMemo(() => parseCurrency(otherCosts), [otherCosts]);

    const totalServicePrice = useMemo(() => {
        const taxPercent = goals.effectiveTaxRate + goals.feeCreditInstallment;
        const taxAmount = serviceBasePrice * (taxPercent / 100);
        return serviceBasePrice + taxAmount + numericOtherCosts;
    }, [serviceBasePrice, numericOtherCosts, goals]);

    const totalServiceCost = useMemo(() => {
        return serviceBaseCost + numericOtherCosts;
    }, [serviceBaseCost, numericOtherCosts]);

    useEffect(() => {
        const handler = setTimeout(async () => {
            const cleanedPhone = customerWhatsapp.replace(/\D/g, '');
            if (cleanedPhone.length >= 10) {
                setIsCustomerLoading(true);
                const customer: Customer | null = await apiCall(`customers/${cleanedPhone}`, 'GET');
                if (customer) {
                    setFoundCustomer(customer);
                    setCustomerName(customer.name);
                    setCustomerCnpjCpf(customer.cnpjCpf ? formatRegister(customer.cnpjCpf) : '');
                    setCpfError('');
                } else {
                    setFoundCustomer(null);
                }
                setIsCustomerLoading(false);
            } else {
                 setFoundCustomer(null);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [customerWhatsapp, apiCall]);

    useEffect(() => {
        if (orderToEdit) {
            setCustomerName(orderToEdit.customerName);
            setCustomerWhatsapp(orderToEdit.customerWhatsapp);
            setCustomerCnpjCpf(orderToEdit.customerCnpjCpf ? formatRegister(orderToEdit.customerCnpjCpf) : '');
            setCustomerContact(orderToEdit.customerContact || '');
            setOtherCosts(formatMoney((orderToEdit.otherCosts * 100).toFixed(0)));
            const serviceForEdit = services.find(s => s.id === orderToEdit.serviceId);
            if (serviceForEdit) {
                setSelectedServiceName(serviceForEdit.name);
                setTimeout(() => {
                    setSelectedBrand(serviceForEdit.brand);
                    setTimeout(() => {
                        setSelectedModel(serviceForEdit.model);
                        setSelectedServiceId(serviceForEdit.id);
                    }, 0);
                }, 0);
            }
        } else {
            setCustomerName('');
            setCustomerWhatsapp('');
            setCustomerCnpjCpf('');
            setCustomerContact('');
            setSelectedServiceName('');
            setSelectedBrand('');
            setSelectedModel('');
            setSelectedServiceId('');
            setOtherCosts('');
        }
         setErrors({});
         setCpfError('');
    }, [orderToEdit, services]);

    const validateForm = () => {
        const newErrors: { name?: string; whatsapp?: string } = {};
        if (!validateName(customerName)) newErrors.name = 'Nome inválido (mín. 3 caracteres).';
        if (!customerWhatsapp || !validatePhone(customerWhatsapp)) newErrors.whatsapp = 'Número de Whatsapp inválido ou vazio.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCnpjBlur = async () => {
        const cleanDoc = customerCnpjCpf.replace(/\D/g, '');
        const cleanPhone = customerWhatsapp.replace(/\D/g, '');
        if (!cleanDoc) { setCpfError(''); return; }
        if (!validateRegister(customerCnpjCpf)) { setCpfError('CPF/CNPJ inválido.'); return; }
        setIsValidatingCpf(true);
        try {
            const existingCustomer = await apiCall(`customers/by-document/${cleanDoc}`, 'GET');
            if (existingCustomer) {
                const dbPhone = existingCustomer.phone.replace(/\D/g, '');
                if (dbPhone !== cleanPhone) {
                    setCpfError(`CPF/CNPJ já pertence a: ${existingCustomer.name} (Tel: ${formatPhone(existingCustomer.phone)}).`);
                } else {
                    setCpfError('');
                }
            } else {
                setCpfError('');
            }
        } catch (err) {
            console.error('Erro ao validar CPF', err);
        } finally {
            setIsValidatingCpf(false);
        }
    };

    const handleServiceNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedServiceName(e.target.value); setSelectedBrand(''); setSelectedModel(''); setSelectedServiceId(''); };
    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedBrand(e.target.value); setSelectedModel(''); setSelectedServiceId(''); };
    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newModel = e.target.value;
        setSelectedModel(newModel);
        const specificService = services.find(s => s.name === selectedServiceName && s.brand === selectedBrand && s.model === newModel);
        if (specificService) setSelectedServiceId(specificService.id); else setSelectedServiceId('');
    };
    
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomerName(val);
        if (validateName(val)) {
            setErrors(prev => { const newErrors = { ...prev }; delete newErrors.name; return newErrors; });
        }
    };

    const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = formatPhone(e.target.value);
        setCustomerWhatsapp(val);
        if (validatePhone(val) && val) {
            setErrors(prev => { const newErrors = { ...prev }; delete newErrors.whatsapp; return newErrors; });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!selectedService) { alert("Por favor, selecione um serviço válido."); return; }
        const payload = {
            tenantId: (foundCustomer && foundCustomer.id) || '', // Ensure tenantId is passed if updating existing or new
            customerName: formatName(customerName),
            customerWhatsapp: formatPhone(customerWhatsapp),
            customerCnpjCpf: formatRegister(customerCnpjCpf),
            customerId: foundCustomer?.id,
            customerContact: formatPhone(customerContact),
            serviceId: selectedService.id,
            serviceDescription: `${selectedService.name} - ${selectedService.brand} ${selectedService.model}`,
            totalPrice: totalServicePrice, 
            totalCost: totalServiceCost,
            otherCosts: numericOtherCosts
        };
        // Add tenantId from user context if missing (usually handled by backend, but safe to pass)
        // Here we assume onSave handles it or backend injects from token. 
        // For local state updates immediately, we might need it.
        
        if (orderToEdit) onSave({ ...orderToEdit, ...payload }); else onSave(payload);
    };
    
    const isSaveDisabled = Object.keys(errors).length > 0 || !customerName || !customerWhatsapp || !selectedServiceId || !!cpfError || isValidatingCpf;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{orderToEdit ? 'Editar' : 'Nova'} Ordem de Serviço</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Whatsapp</label>
                            <input type="text" value={customerWhatsapp} onChange={handleWhatsappChange} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 ${errors.whatsapp ? 'border-red-500' : ''}`}/>
                             {isCustomerLoading && <p className="text-xs text-blue-400 mt-1">Buscando...</p>}
                            {foundCustomer && <p className="text-xs text-green-500 mt-1">Cliente encontrado!</p>}
                            {errors.whatsapp && <p className="text-xs text-red-500 mt-1">{errors.whatsapp}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Nome do Cliente</label>
                            <input type="text" value={customerName} onChange={handleNameChange} onBlur={() => setCustomerName(formatName(customerName))} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 ${errors.name ? 'border-red-500' : ''}`}/>
                             {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">CPF/CNPJ (Opcional)</label>
                            <input type="text" value={customerCnpjCpf} onChange={e => { setCustomerCnpjCpf(formatRegister(e.target.value)); if(!e.target.value) setCpfError(''); }} onBlur={handleCnpjBlur} className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 ${cpfError ? 'border-red-500 focus:ring-red-500' : ''}`}/>
                            {isValidatingCpf && <p className="text-xs text-blue-500 mt-1 animate-pulse">Validando...</p>}
                            {cpfError && <p className="text-xs text-red-500 mt-1 font-bold">{cpfError}</p>}
                        </div>
                         <div>
                            <label className="block text-sm font-medium">Contato Alternativo</label>
                            <input type="text" value={customerContact} onChange={e => setCustomerContact(formatPhone(e.target.value))} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                        </div>
                    </div>
                     <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h3 className="text-md font-semibold">Seleção de Serviço</h3>
                        <div>
                            <label className="block text-sm font-medium">1. Tipo de Serviço</label>
                             <select value={selectedServiceName} onChange={handleServiceNameChange} required className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2">
                                 <option value="" disabled>Selecione o tipo...</option>
                                 {availableServiceNames.map(name => <option key={name} value={name}>{name}</option>)}
                             </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">2. Marca</label>
                             <select value={selectedBrand} onChange={handleBrandChange} required disabled={!selectedServiceName} className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 disabled:opacity-50">
                                 <option value="" disabled>Selecione a marca...</option>
                                 {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                             </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">3. Modelo</label>
                             <select value={selectedModel} onChange={handleModelChange} required disabled={!selectedBrand} className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 disabled:opacity-50">
                                 <option value="" disabled>Selecione o modelo...</option>
                                 {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                             </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Outros Custos (R$)</label>
                            <input type="text" value={otherCosts} onChange={e => handleCurrencyChange(e.target.value, setOtherCosts)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-400">Total OS (a cobrar)</label>
                            <div className="mt-1 block w-full rounded-md bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-sm px-3 py-2 text-lg font-bold text-green-500">
                                R$ {formatCurrencyNumber(totalServicePrice)}
                            </div>
                            <p className="text-[10px] text-gray-400">Inclui taxas e impostos</p>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" disabled={isSaveDisabled} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">Salvar OS</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const PaymentModal: React.FC<{ 
    order: ServiceOrder, 
    goals: KpiGoals,
    onClose: () => void, 
    onComplete: (paymentMethod: PaymentMethod, discount: number, finalPrice: number) => void 
}> = ({ order, goals, onClose, onComplete }) => {
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isManualDiscountActive, setIsManualDiscountActive] = useState(false);

    useEffect(() => setIsManualDiscountActive(false), [selectedPaymentMethod]);

    const discountInfo = useMemo(() => {
        if (!selectedPaymentMethod) return { discountPercent: 0, discountValue: 0 };
        if (!goals.autoApplyDiscount && !isManualDiscountActive) {
            return { discountPercent: 0, discountValue: 0 };
        }
        let discountPercent = 0;
        switch (selectedPaymentMethod) {
            case PaymentMethod.PIX:
            case PaymentMethod.CASH:
                discountPercent = Math.max(0, goals.feeCreditInstallment - goals.feePix);
                break;
            case PaymentMethod.DEBIT_CARD:
            case PaymentMethod.BANK_TRANSFER:
                discountPercent = Math.max(0, goals.feeCreditInstallment - goals.feeDebit);
                break;
            case PaymentMethod.CREDIT_CARD_SIGHT:
                discountPercent = Math.max(0, goals.feeCreditInstallment - goals.feeCreditSight);
                break;
            case PaymentMethod.CREDIT_CARD_INSTALLMENT:
                discountPercent = 0;
                break;
            default:
                discountPercent = 0;
        }
        const discountValue = order.totalPrice * (discountPercent / 100);
        return { discountPercent, discountValue };
    }, [selectedPaymentMethod, goals, order.totalPrice, isManualDiscountActive]);

    const finalTotal = order.totalPrice - discountInfo.discountValue;

    const handleFinish = () => {
        if (selectedPaymentMethod) {
            onComplete(selectedPaymentMethod, discountInfo.discountValue, finalTotal);
        }
    };

    const handleToggleManualDiscount = () => setIsManualDiscountActive(prev => !prev);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md animate-fade-in">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Concluir e Pagar OS #{order.id}</h3>
                <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cliente: {order.customerName}</p>
                    <p className="text-lg font-semibold mt-2">Valor Total: R$ {formatCurrencyNumber(order.totalPrice)}</p>
                </div>
                <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-sm">Forma de Pagamento (Cliente)</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setSelectedPaymentMethod(PaymentMethod.CASH)} className={`py-2 px-2 rounded-md text-sm font-medium transition-colors ${selectedPaymentMethod === PaymentMethod.CASH ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Dinheiro</button>
                        <button onClick={() => setSelectedPaymentMethod(PaymentMethod.PIX)} className={`py-2 px-2 rounded-md text-sm font-medium transition-colors ${selectedPaymentMethod === PaymentMethod.PIX ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Pix</button>
                        <button onClick={() => setSelectedPaymentMethod(PaymentMethod.DEBIT_CARD)} className={`py-2 px-2 rounded-md text-sm font-medium transition-colors ${selectedPaymentMethod === PaymentMethod.DEBIT_CARD ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Débito</button>
                        <button onClick={() => setSelectedPaymentMethod(PaymentMethod.CREDIT_CARD_SIGHT)} className={`py-2 px-2 rounded-md text-sm font-medium transition-colors ${selectedPaymentMethod === PaymentMethod.CREDIT_CARD_SIGHT ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Crédito Vista</button>
                        <button onClick={() => setSelectedPaymentMethod(PaymentMethod.CREDIT_CARD_INSTALLMENT)} className={`py-2 px-2 rounded-md text-sm font-medium transition-colors col-span-2 ${selectedPaymentMethod === PaymentMethod.CREDIT_CARD_INSTALLMENT ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Crédito Parcelado</button>
                    </div>
                    {!goals.autoApplyDiscount && selectedPaymentMethod && selectedPaymentMethod !== PaymentMethod.CREDIT_CARD_INSTALLMENT && (
                        <button onClick={handleToggleManualDiscount} className={`w-full mt-3 py-2 text-sm font-medium rounded-md border transition-colors ${isManualDiscountActive ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}>{isManualDiscountActive ? 'Remover Desconto' : 'Aplicar Desconto (À Vista)'}</button>
                    )}
                </div>
                {selectedPaymentMethod && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4">
                        {discountInfo.discountValue > 0 && (
                            <div className="flex justify-between text-sm text-green-600 mb-2">
                                <span>Desconto ({discountInfo.discountPercent.toFixed(2)}%):</span>
                                <span>- R$ {formatCurrencyNumber(discountInfo.discountValue)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-bold">
                            <span>A Pagar:</span>
                            <span>R$ {formatCurrencyNumber(finalTotal)}</span>
                        </div>
                    </div>
                )}
                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleFinish} disabled={!selectedPaymentMethod} className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed">
                        {order.totalCost > 0 ? 'Próximo: Pagar Custo' : 'Finalizar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Confirmar Ação</h3>
            <p className="mb-6">{message}</p>
            <div className="flex justify-end space-x-4">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-300 dark:bg-gray-600 hover:bg-gray-400">Cancelar</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Confirmar</button>
            </div>
        </div>
    </div>
);

interface ServiceOrdersProps {
    services: Service[];
    serviceOrders: ServiceOrder[];
    onAddServiceOrder: (orderData: any) => void;
    onUpdateServiceOrder: (order: ServiceOrder) => void;
    onDeleteServiceOrder: (orderId: string) => void;
    onToggleStatus: (orderId: string, paymentData?: any) => Promise<any>;
    setActivePage: (page: string) => void;
    goals: KpiGoals;
}

const ServiceOrders: React.FC<ServiceOrdersProps> = ({ services, serviceOrders, onAddServiceOrder, onUpdateServiceOrder, onDeleteServiceOrder, onToggleStatus, setActivePage, goals }) => {
    // ... [Existing state variables] ...
    const { user, apiCall } = useContext(AuthContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
    const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
    // Removed accounts fetch
    
    const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus | 'All'>(ServiceOrderStatus.PENDING);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;

    // Payment/Completion Flow State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [orderToComplete, setOrderToComplete] = useState<ServiceOrder | null>(null);
    const [tempPaymentInfo, setTempPaymentInfo] = useState<{paymentMethod: PaymentMethod, discount: number, finalPrice: number} | null>(null);

    const [generatedReceiptImage, setGeneratedReceiptImage] = useState<string | null>(null);
    const [isReceiptPromptOpen, setIsReceiptPromptOpen] = useState(false);
    
    const handleSaveOrder = (orderData: Omit<ServiceOrder, 'id' | 'createdAt' | 'status'> | ServiceOrder) => {
        if ('id' in orderData) {
            onUpdateServiceOrder(orderData);
        } else {
            onAddServiceOrder({ ...orderData, tenantId: user?.tenantId || '' });
        }
        setIsModalOpen(false);
        setEditingOrder(null);
    };

    const handleOpenEditModal = (order: ServiceOrder) => {
        setEditingOrder(order);
        setIsModalOpen(true);
    };

    const handleOpenCreateModal = () => {
        setEditingOrder(null);
        setIsModalOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (deletingOrderId) {
            onDeleteServiceOrder(deletingOrderId);
        }
        setDeletingOrderId(null);
    };

    const handleInitiateCompletion = (order: ServiceOrder) => {
        if (order.status === ServiceOrderStatus.PENDING) {
            setOrderToComplete(order);
            setIsPaymentModalOpen(true);
        } else {
            onToggleStatus(order.id);
        }
    };

    // --- REVISED FLOW ---
    const handlePaymentComplete = async (paymentMethod: PaymentMethod, discount: number, finalPrice: number) => {
        setIsPaymentModalOpen(false);
        
        if (orderToComplete) {
            // Check if Cost > 0
            if (orderToComplete.totalCost > 0) {
                // If yes, open Cost Modal
                setTempPaymentInfo({ paymentMethod, discount, finalPrice });
                setIsCostModalOpen(true);
            } else {
                // If no, skip cost registration and finish
                await finishOrder(orderToComplete.id, { paymentMethod, discount, finalPrice });
            }
        }
    };

    const handleCostComplete = async (costDetails: any) => {
        setIsCostModalOpen(false);
        if (orderToComplete && tempPaymentInfo) {
            const finalPayload = {
                ...tempPaymentInfo,
                costPaymentDetails: costDetails
            };
            await finishOrder(orderToComplete.id, finalPayload);
        }
        setTempPaymentInfo(null);
    };

    const finishOrder = async (orderId: string, payload: any) => {
        const updatedOrder = await onToggleStatus(orderId, payload);
        if (updatedOrder) {
            setOrderToComplete(updatedOrder); 
            setIsReceiptPromptOpen(true);
        }
    };

    const handleGenerateReceipt = async () => {
        if (orderToComplete && user) {
            try {
                // Generate receipt using native Canvas API (Robust & No oklch errors)
                const dataUrl = await generateServiceOrderReceipt(orderToComplete, goals, user.name);
                setGeneratedReceiptImage(dataUrl);
                setIsReceiptPromptOpen(false);
            } catch (error) { 
                console.error("Error generating receipt:", error); 
                alert('Erro ao gerar imagem.'); 
            }
        }
    };

    const getCleanFileName = (id: string) => {
        const parts = id.split('-');
        if (parts.length >= 2) return `${parts.slice(0, 2).join('-')}.png`;
        return `${id}.png`;
    };

    const filteredAndSortedOrders = useMemo(() => {
        return serviceOrders.filter(order => {
            if (statusFilter !== 'All' && order.status !== statusFilter) return false;
            const lowerCaseSearch = searchTerm.toLowerCase();
            if (lowerCaseSearch) {
                return (
                    order.id.toLowerCase().includes(lowerCaseSearch) ||
                    order.customerName.toLowerCase().includes(lowerCaseSearch) ||
                    order.customerWhatsapp.includes(lowerCaseSearch) ||
                    (order.customerContact && order.customerContact.includes(lowerCaseSearch))
                );
            }
            return true;
        }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [serviceOrders, statusFilter, searchTerm]);

    useEffect(() => { setCurrentPage(1); }, [statusFilter, searchTerm]);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredAndSortedOrders.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredAndSortedOrders.length / recordsPerPage);

    const nextPage = () => { if (currentPage < nPages) setCurrentPage(currentPage + 1); };
    const prevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

    return (
         <div className="container mx-auto">
            {isModalOpen && <OSModal services={services} orderToEdit={editingOrder} onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} onSave={handleSaveOrder} goals={goals} />}
            
            {deletingOrderId && <ConfirmationModal message="Tem certeza que deseja excluir esta Ordem de Serviço? As transações financeiras associadas também serão removidas." onConfirm={handleDeleteConfirm} onCancel={() => setDeletingOrderId(null)} />}

            {isPaymentModalOpen && orderToComplete && <PaymentModal order={orderToComplete} goals={goals} onClose={() => { setIsPaymentModalOpen(false); setOrderToComplete(null); }} onComplete={handlePaymentComplete} />}

            {isCostModalOpen && orderToComplete && <CostPaymentModal order={orderToComplete} goals={goals} onClose={() => { setIsCostModalOpen(false); setOrderToComplete(null); setTempPaymentInfo(null); }} onConfirm={handleCostComplete} />}

            {isReceiptPromptOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-140">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Serviço Concluído!</h3>
                        <p className="mb-6 text-gray-600 dark:text-gray-300">Deseja gerar a notinha (comprovante) para enviar ao cliente?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleGenerateReceipt} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Sim, Gerar Notinha</button>
                            <button onClick={() => { setIsReceiptPromptOpen(false); setOrderToComplete(null); }} className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300">Não, Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {generatedReceiptImage && orderToComplete && <ReceiptModal imageData={generatedReceiptImage} fileName={getCleanFileName(orderToComplete.id)} onClose={() => { setGeneratedReceiptImage(null); setOrderToComplete(null); }} />}

            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ordens de Serviço</h1>
                <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Criar Nova OS</button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Buscar por OS, Nome ou Telefone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2" />
                     <div className="flex items-center justify-center md:justify-end space-x-2">
                        <span className="text-sm font-medium">Status:</span>
                        {(['All', ...Object.values(ServiceOrderStatus)]).map(status => (
                            <button key={status} onClick={() => setStatusFilter(status as ServiceOrderStatus | 'All')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === status ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{status === 'All' ? 'Todas' : status}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                         <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">OS #</th>
                                <th scope="col" className="px-6 py-3">Cliente</th>
                                <th scope="col" className="px-6 py-3">Serviço</th>
                                <th scope="col" className="px-6 py-3">Total (a cobrar)</th>
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {currentRecords.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Nenhuma Ordem de Serviço encontrada.</td></tr>
                             ) : (
                                currentRecords.map(order => {
                                    const isTechnician = user?.role === 'technician';
                                    const isPending = order.status === ServiceOrderStatus.PENDING;
                                    const canDelete = !isTechnician || isPending;
                                    const canReopen = !isTechnician;
                                    const displayPrice = order.status === ServiceOrderStatus.COMPLETED && order.finalPrice ? order.finalPrice : order.totalPrice;

                                    return (
                                        <tr key={order.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.id}</td>
                                            <td className="px-6 py-4">
                                                <div>{order.customerName}</div>
                                                <div className="text-xs text-gray-500">{order.customerWhatsapp}</div>
                                            </td>
                                            <td className="px-6 py-4">{order.serviceDescription}</td>
                                            <td className="px-6 py-4 font-semibold text-green-500">R$ {formatCurrencyNumber(displayPrice)}</td>
                                            <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                                            <td className="px-6 py-4"><OSStatusBadge status={order.status} /></td>
                                            <td className="px-6 py-4 space-x-4 whitespace-nowrap">
                                                {isPending ? (
                                                    <button onClick={() => handleInitiateCompletion(order)} className="font-medium text-green-600 dark:text-green-500 hover:underline">Concluir</button>
                                                ) : (
                                                    canReopen && (<button onClick={() => onToggleStatus(order.id)} className="font-medium text-yellow-500 dark:text-yellow-400 hover:underline">Pendente</button>)
                                                )}
                                                {order.status === ServiceOrderStatus.PENDING && (
                                                    <button onClick={() => handleOpenEditModal(order)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:no-underline">Editar</button>
                                                )}
                                                <button onClick={() => setDeletingOrderId(order.id)} disabled={!canDelete} className="font-medium text-red-600 dark:text-red-500 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:no-underline">Excluir</button>
                                            </td>
                                        </tr>
                                    )
                                }))}
                        </tbody>
                    </table>
                </div>
                 {nPages > 1 && (
                    <div className="p-4 flex justify-between items-center flex-wrap gap-2">
                         <span className="text-sm text-gray-700 dark:text-gray-400">Página {currentPage} de {nPages} ({filteredAndSortedOrders.length} registros)</span>
                        <div className="flex space-x-2">
                            <button onClick={prevPage} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Anterior</button>
                            <button onClick={nextPage} disabled={currentPage === nPages || nPages === 0} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Próximo</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ServiceOrders;