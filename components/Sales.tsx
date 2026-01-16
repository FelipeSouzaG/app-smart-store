
import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import type { Product, SaleItem, TicketSale, Customer, KpiGoals, EcommerceOrder } from '../types';
import { PaymentMethod } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { formatName, formatPhone, formatRegister, formatCurrencyNumber, validateName, validateRegister, validatePhone } from '../validation';

// Declare ZXing
declare global {
    interface Window {
        ZXing: any;
    }
}

// --- MODALS ---

const ConflictModal: React.FC<{
    isOpen: boolean;
    product: Product | null;
    reservedQty: number;
    conflictingOrders: EcommerceOrder[];
    onCancel: () => void;
    onForceSale: (action: 'replenish' | 'cancel_online') => void;
}> = ({ isOpen, product, reservedQty, conflictingOrders, onCancel, onForceSale }) => {
    if (!isOpen || !product) return null;

    const [step, setStep] = useState<1 | 2>(1);

    if (step === 1) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-100 p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm border-2 border-orange-500">
                    <div className="flex justify-center mb-4 text-orange-500">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Item Reservado Online!</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
                        O produto <strong>{product.name}</strong> tem <strong>{reservedQty} unidade(s)</strong> reservada(s) em pedidos pendentes do E-commerce.
                    </p>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800 mb-6 text-xs text-orange-800 dark:text-orange-300">
                        <p><strong>Pedidos Afetados:</strong></p>
                        <ul className="list-disc ml-4 mt-1">
                            {conflictingOrders.slice(0, 3).map(o => (
                                <li key={o.id}>Pedido #{o.id} ({o.customer.name})</li>
                            ))}
                            {conflictingOrders.length > 3 && <li>...e mais {conflictingOrders.length - 3}</li>}
                        </ul>
                    </div>
                    <p className="text-sm font-bold text-center mb-6 text-gray-800 dark:text-white">
                        Deseja priorizar o cliente da loja física?
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Não, Cancelar</button>
                        <button onClick={() => setStep(2)} className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow-lg">Sim, Vender</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-100 p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm border-2 border-red-500">
                <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-4">Como resolver o conflito?</h3>
                
                <button 
                    onClick={() => onForceSale('cancel_online')}
                    className="w-full mb-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-left hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors group"
                >
                    <span className="block font-bold text-red-700 dark:text-red-400 group-hover:underline">Excluir Pedido Online</span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">O pedido do site será cancelado/removido. O estoque fica livre para esta venda.</span>
                </button>

                <button 
                    onClick={() => onForceSale('replenish')}
                    className="w-full p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-left hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors group"
                >
                    <span className="block font-bold text-yellow-700 dark:text-yellow-400 group-hover:underline">Gerar Reposição (Aguardar)</span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">O pedido online continua pendente, mas não poderá ser enviado até que você reponha o estoque físico.</span>
                </button>

                <button onClick={onCancel} className="mt-6 w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 text-sm font-medium">Voltar</button>
            </div>
        </div>
    );
};

const ScannerModal: React.FC<{ onClose: () => void; onScan: (code: string) => void }> = ({ onClose, onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const codeReader = new window.ZXing.BrowserMultiFormatReader();
        
        const startScanning = async () => {
            try {
                await codeReader.decodeFromVideoDevice(
                    undefined, 
                    videoRef.current,
                    (result: any, err: any) => {
                        if (result) {
                            if (navigator.vibrate) navigator.vibrate(200);
                            onScan(result.getText());
                            codeReader.reset(); 
                        }
                    }
                );
            } catch (err) {
                console.error("Error starting scanner:", err);
                setError("Erro ao iniciar a câmera. Verifique as permissões.");
            }
        };

        startScanning();

        return () => {
            codeReader.reset();
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="relative w-full max-w-lg p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-4 text-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scanner de Código de Barras</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Aponte a câmera para o código do produto</p>
                    </div>
                    <div className="relative aspect-4/3 bg-black">
                        <video ref={videoRef} className="w-full h-full object-cover" style={{ transform: 'scaleX(1)' }} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-3/4 h-0.5 bg-red-500 animate-[pulse_2s_infinite] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        </div>
                        <div className="absolute inset-0 border-2 border-white/30 rounded-lg m-8 pointer-events-none"></div>
                    </div>
                    {error && <p className="text-center text-red-500 p-2 text-sm">{error}</p>}
                    <div className="p-4">
                        <button onClick={onClose} className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancelar</button>
                    </div>
                </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md flex flex-col items-center">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Comprovante de Venda</h3>
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

const generateTicketReceipt = async (sale: TicketSale, goals: KpiGoals): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    const width = 380;
    canvas.width = width;
    canvas.height = 1200; 

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

    // --- HEADER WITH LOGO ---
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
    const iconSize = 24; 
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

    drawText("COMPROVANTE DE VENDA", fontSmall, width / 2, 'center');
    y += 10;
    
    drawDivider();

    const dateStr = new Date(sale.timestamp).toLocaleString('pt-BR');
    drawText("DATA:", fontBold, padding);
    drawText(dateStr, fontRegular, width - padding, 'right');
    y += lineHeight;

    drawText("CLIENTE:", fontBold, padding);
    drawText(sale.customerName.substring(0, 25), fontRegular, width - padding, 'right');
    y += lineHeight;

    if (sale.customerWhatsapp) {
        drawText("TEL:", fontBold, padding);
        drawText(sale.customerWhatsapp, fontRegular, width - padding, 'right');
        y += lineHeight;
    }

    drawText("VENDEDOR:", fontBold, padding);
    drawText(sale.userName.split(' ')[0], fontRegular, width - padding, 'right');
    y += lineHeight;

    drawText("TICKET:", fontBold, padding);
    drawText(sale.id.split('-').slice(0, 3).join('-'), fontRegular, width - padding, 'right');
    y += lineHeight;

    drawDivider();

    // Items List
    drawText("ITENS DA VENDA", fontBold, padding);
    y += lineHeight + 5;

    sale.items.forEach(item => {
        drawText(item.item.name.substring(0, 35), fontBold, padding);
        y += lineHeight;
        
        const details = `${item.quantity} un x R$ ${formatCurrencyNumber(item.unitPrice)}`;
        drawText(details, fontRegular, padding);
        const subtotal = `R$ ${formatCurrencyNumber(item.quantity * item.unitPrice)}`;
        drawText(subtotal, fontBold, width - padding, 'right');
        
        if (item.uniqueIdentifier) {
            y += lineHeight;
            drawText(`ID: ${item.uniqueIdentifier}`, fontSmall, padding);
        }
        
        y += lineHeight + 5;
    });

    drawDivider();

    // Totals
    const subtotalBruto = sale.total + (sale.discount || 0);
    drawText("SUBTOTAL:", fontBold, padding);
    drawText(`R$ ${formatCurrencyNumber(subtotalBruto)}`, fontRegular, width - padding, 'right');
    y += lineHeight;

    if (sale.discount && sale.discount > 0) {
        drawText("DESCONTO:", fontBold, padding);
        drawText(`- R$ ${formatCurrencyNumber(sale.discount)}`, fontRegular, width - padding, 'right');
        y += lineHeight;
    }

    y += 5;
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText("TOTAL PAGO:", padding, y);
    const totalStr = `R$ ${formatCurrencyNumber(sale.total)}`;
    const tMetrics = ctx.measureText(totalStr);
    ctx.fillText(totalStr, width - padding - tMetrics.width, y);
    y += lineHeight * 1.5;

    if (sale.paymentMethod) {
        drawText(`Forma: ${sale.paymentMethod}`, fontSmall, width / 2, 'center');
        y += lineHeight;
    }

    // Store Footer
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

    // Crop
    const finalData = ctx.getImageData(0, 0, width, y);
    canvas.height = y;
    ctx.putImageData(finalData, 0, 0);

    return canvas.toDataURL('image/png');
};

interface SalesProps {
    products: Product[];
    onAddSale: (sale: Omit<TicketSale, 'id' | 'timestamp' | 'saleHour' | 'customerId'> & { customerCnpjCpf?: string; paymentMethod?: PaymentMethod; discountApplied?: number }) => Promise<TicketSale | null>;
    goals: KpiGoals;
}

const Sales: React.FC<SalesProps> = ({ products, onAddSale, goals }) => {
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [message, setMessage] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    
    const [customerName, setCustomerName] = useState('');
    const [customerWhatsapp, setCustomerWhatsapp] = useState('');
    const [customerCnpjCpf, setCustomerCnpjCpf] = useState('');
    const [isCustomerLoading, setIsCustomerLoading] = useState(false);
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [customerError, setCustomerError] = useState('');
    const [cpfVerificationError, setCpfVerificationError] = useState('');
    const [isValidatingCpf, setIsValidatingCpf] = useState(false);

    const { user, apiCall } = useContext(AuthContext);
    
    // Pending Online Orders State for Conflict Resolution
    const [pendingOrders, setPendingOrders] = useState<EcommerceOrder[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [uniqueIdentifier, setUniqueIdentifier] = useState('');
    const [identifierError, setIdentifierError] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isManualDiscountActive, setIsManualDiscountActive] = useState(false);

    const [generatedReceiptImage, setGeneratedReceiptImage] = useState<string | null>(null);
    const [isReceiptPromptOpen, setIsReceiptPromptOpen] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState<TicketSale | null>(null);

    // Conflict Modal State
    const [conflictState, setConflictState] = useState<{
        isOpen: boolean;
        product: Product | null;
        reservedQty: number;
        conflictingOrders: EcommerceOrder[];
    }>({ isOpen: false, product: null, reservedQty: 0, conflictingOrders: [] });

    // Fetch Pending Orders on Mount for Stock Checks
    useEffect(() => {
        const fetchPending = async () => {
            try {
                const data = await apiCall('ecommerce-orders', 'GET');
                if (data) {
                    const pending = data.filter((o: EcommerceOrder) => o.status === 'PENDING');
                    setPendingOrders(pending);
                }
            } catch (e) { console.error(e); }
        };
        fetchPending();
    }, [apiCall]);

    // Updated Logic: Call generation via Canvas
    const handleGenerateReceipt = async () => {
        if (lastCompletedSale) {
            try {
                const dataUrl = await generateTicketReceipt(lastCompletedSale, goals);
                setGeneratedReceiptImage(dataUrl);
                setIsReceiptPromptOpen(false);
            } catch (error) {
                console.error("Error generating receipt:", error);
                alert("Erro ao gerar a imagem da notinha.");
            }
        }
    };

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
                    setCpfVerificationError('');
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
        setIsManualDiscountActive(false);
    }, [selectedPaymentMethod]);

    const subtotal = cart.reduce((sum, cartItem) => sum + cartItem.unitPrice * cartItem.quantity, 0);

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
        const discountValue = subtotal * (discountPercent / 100);
        return { discountPercent, discountValue };
    }, [selectedPaymentMethod, goals, subtotal, isManualDiscountActive]);

    const finalTotal = subtotal - discountInfo.discountValue;

    const showTemporaryMessage = (msg: string, isError: boolean = false, duration: number = 2000) => {
        if(isError) setCustomerError(msg); else setMessage(msg);
        setTimeout(() => { setMessage(''); setCustomerError(''); }, duration);
    };

    const checkCnpjAvailability = async (docValue: string, phoneValue: string): Promise<boolean> => {
        const cleanedDoc = docValue.replace(/\D/g, '');
        const cleanedPhone = phoneValue.replace(/\D/g, '');
        if (!cleanedDoc) { setCpfVerificationError(''); return true; }
        if (!validateRegister(docValue)) { setCpfVerificationError('Formato de CPF/CNPJ inválido.'); return false; }
        setIsValidatingCpf(true); 
        try {
            const existingCustomer = await apiCall(`customers/by-document/${cleanedDoc}`, 'GET');
            if (existingCustomer) {
                const dbPhone = existingCustomer.phone.replace(/\D/g, '');
                if (dbPhone !== cleanedPhone) {
                    const errorMsg = `CPF/CNPJ já pertence a: ${existingCustomer.name} (Tel: ${formatPhone(existingCustomer.phone)}).`;
                    setCpfVerificationError(errorMsg);
                    setIsValidatingCpf(false);
                    return false;
                }
            }
            setCpfVerificationError('');
            setIsValidatingCpf(false);
            return true;
        } catch (error) {
            console.error("Error validating CNPJ", error);
            showTemporaryMessage("Erro de conexão ao validar CPF", true);
            setIsValidatingCpf(false);
            return false;
        }
    };

    const handleCnpjBlur = () => { checkCnpjAvailability(customerCnpjCpf, customerWhatsapp); };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        setSelectedProduct(null);
        setUniqueIdentifier('');
        setIdentifierError('');
        if (value.length < 1) { setSearchResults([]); return; }
        const lowerCaseValue = value.toLowerCase();
        // FIX: Reference 'p' instead of 'product' in the filter loop
        const results = products.filter(p => 
            p.name.toLowerCase().includes(lowerCaseValue) ||
            p.barcode.toLowerCase().includes(lowerCaseValue) ||
            p.category.toLowerCase().includes(lowerCaseValue) ||
            (p.location && p.location.toLowerCase().includes(lowerCaseValue))
        );
        setSearchResults(results);
    };

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setSearchTerm(product.name);
        setSearchResults([]);
        setQuantity(1);
        setUniqueIdentifier('');
        setIdentifierError('');
    };

    const handleAddItemToCart = (bypassConflict = false) => {
        let productToAdd = selectedProduct;
        if (!productToAdd) {
            const foundByBarcode = products.find(p => p.barcode === searchTerm);
            if (foundByBarcode) {
                productToAdd = foundByBarcode;
                setSelectedProduct(foundByBarcode);
                setSearchTerm(foundByBarcode.name);
            }
        }
        
        if (!productToAdd) { showTemporaryMessage('Selecione um produto válido.', true); return; }

        // --- STOCK CONFLICT CHECK ---
        if (!bypassConflict) {
            let pendingQty = 0;
            const conflicting = pendingOrders.filter(o => {
                const item = o.items.find(i => i.productId === productToAdd!.id);
                if (item) {
                    pendingQty += item.quantity;
                    return true;
                }
                return false;
            });

            const availableFree = productToAdd.stock - pendingQty;
            
            // Logic: If physical stock exists BUT free stock is insufficient for cart
            if (productToAdd.stock >= quantity && availableFree < quantity) {
                 setConflictState({
                     isOpen: true,
                     product: productToAdd,
                     reservedQty: pendingQty,
                     conflictingOrders: conflicting
                 });
                 return;
            }
        }
        // ----------------------------

        if (productToAdd.stock < quantity) { showTemporaryMessage(`Estoque insuficiente: ${productToAdd.stock}`, true, 3000); return; }
        if (productToAdd.requiresUniqueIdentifier) {
            if (!uniqueIdentifier.trim()) { setIdentifierError('Identificador é obrigatório.'); return; }
             setCart(prevCart => [...prevCart, { item: productToAdd!, quantity: 1, type: 'product', unitPrice: productToAdd!.price, uniqueIdentifier: uniqueIdentifier.trim(), unitCost: productToAdd!.cost }]);
        } else {
             setCart(prevCart => {
                const existingItemIndex = prevCart.findIndex(ci => ci.item.id === productToAdd!.id && ci.type === 'product');
                if (existingItemIndex !== -1) {
                    const newCart = [...prevCart];
                    const existingItem = newCart[existingItemIndex];
                    const newQuantity = existingItem.quantity + quantity;
                    if (newQuantity > productToAdd!.stock) {
                        showTemporaryMessage(`Estoque insuficiente. Disponível: ${productToAdd!.stock}`, true, 3000);
                        return prevCart;
                    }
                    newCart[existingItemIndex] = { ...existingItem, quantity: newQuantity };
                    return newCart;
                } else {
                    return [...prevCart, { item: productToAdd!, quantity, type: 'product', unitPrice: productToAdd!.price, unitCost: productToAdd!.cost }];
                }
            });
        }
        showTemporaryMessage(`${productToAdd.name} adicionado.`);
        setSearchTerm('');
        setSearchResults([]);
        setSelectedProduct(null);
        setQuantity(1);
        setUniqueIdentifier('');
        setIdentifierError('');
        setSelectedPaymentMethod(null);
        setIsManualDiscountActive(false);
        searchInputRef.current?.focus();
    };

    const handleConflictResolution = async (action: 'replenish' | 'cancel_online') => {
        if (!conflictState.product) return;

        if (action === 'cancel_online') {
            // Delete all conflicting online orders to free up stock
            for (const order of conflictState.conflictingOrders) {
                await apiCall(`ecommerce-orders/${order.id}`, 'DELETE');
            }
            // Update local pending list to reflect removal
            const remainingOrders = pendingOrders.filter(o => !conflictState.conflictingOrders.some(c => c.id === o.id));
            setPendingOrders(remainingOrders);
            showTemporaryMessage("Pedidos online cancelados. Estoque liberado.");
        } 
        
        // Both actions proceed to add item (Overselling logic accepted or stock freed)
        setConflictState({ isOpen: false, product: null, reservedQty: 0, conflictingOrders: [] });
        handleAddItemToCart(true); // Bypass check
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItemToCart(); } };

    const handleScan = (code: string) => {
        setIsScannerOpen(false);
        setSearchTerm(code); 
        const product = products.find(p => p.barcode === code || p.id === code);
        if (product) {
            if (product.stock <= 0) { showTemporaryMessage('Produto sem estoque.', true); return; }
            handleSelectProduct(product);
        } else { showTemporaryMessage(`Produto não encontrado: ${code}`, true); }
    };

    const handleCompleteSale = async () => {
        if (cart.length === 0) { showTemporaryMessage('Carrinho vazio.', true); return; }
        if (!user) { showTemporaryMessage('Erro: Usuário não identificado.', true); return; }
        if (!selectedPaymentMethod) { showTemporaryMessage('Selecione a forma de pagamento.', true); return; }
        if (customerCnpjCpf) {
            const isValid = await checkCnpjAvailability(customerCnpjCpf, customerWhatsapp);
            if (!isValid) { showTemporaryMessage('Erro de validação de CPF/CNPJ.', true, 4000); return; }
        }
        const requiresCustomer = cart.some(item => item.type === 'product' && 'requiresUniqueIdentifier' in item.item && item.item.requiresUniqueIdentifier);
        if (requiresCustomer) {
            if (!customerName || !customerWhatsapp || !validateName(customerName) || !validatePhone(customerWhatsapp)) {
                showTemporaryMessage('Dados do cliente obrigatórios para itens com Serial/IMEI.', true, 3500);
                return;
            }
        }
        const totalSaleCost = cart.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0);

        const savedSale = await onAddSale({
            items: cart,
            total: finalTotal,
            totalCost: totalSaleCost,
            customerName,
            customerWhatsapp,
            customerCnpjCpf,
            userId: user.id,
            userName: user.name,
            paymentMethod: selectedPaymentMethod,
            discount: discountInfo.discountValue,
            discountApplied: discountInfo.discountValue,
            tenantId: user.tenantId || '' // Include tenantId
        });
        if (savedSale) {
            setLastCompletedSale(savedSale);
            setIsReceiptPromptOpen(true);
            showTemporaryMessage('Venda registrada!');
        }
    };
    
    const resetForm = () => {
        setCart([]);
        setCustomerName('');
        setCustomerWhatsapp('');
        setCustomerCnpjCpf('');
        setFoundCustomer(null);
        setSelectedPaymentMethod(null);
        setCpfVerificationError('');
        setIsManualDiscountActive(false);
        setLastCompletedSale(null);
        setGeneratedReceiptImage(null);
    };

    const handleToggleManualDiscount = () => setIsManualDiscountActive(prev => !prev);

    const getCleanFileName = (id: string) => {
        const parts = id.split('-');
        if (parts.length >= 3) return `${parts.slice(0, 3).join('-')}.png`;
        return `${id}.png`;
    };

    return (
        <div className="container mx-auto space-y-8">
            {isScannerOpen && <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}
            
            {/* Stock Conflict Modal */}
            <ConflictModal 
                isOpen={conflictState.isOpen}
                product={conflictState.product}
                reservedQty={conflictState.reservedQty}
                conflictingOrders={conflictState.conflictingOrders}
                onCancel={() => setConflictState({ ...conflictState, isOpen: false })}
                onForceSale={handleConflictResolution}
            />

            {isReceiptPromptOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Venda Concluída!</h3>
                        <p className="mb-6 text-gray-600 dark:text-gray-300">Deseja gerar a notinha (comprovante) para enviar ao cliente?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleGenerateReceipt} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Sim, Gerar Notinha</button>
                            <button onClick={() => { setIsReceiptPromptOpen(false); resetForm(); }} className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300">Não, Nova Venda</button>
                        </div>
                    </div>
                </div>
            )}

            {generatedReceiptImage && lastCompletedSale && (
                <ReceiptModal imageData={generatedReceiptImage} fileName={getCleanFileName(lastCompletedSale.id)} onClose={resetForm} />
            )}
            
            <div>
                 <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Ponto de Venda</h1>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-semibold mb-4">Itens da Venda</h2>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {cart.length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400">Nenhum item no carrinho.</p>
                                ) : (
                                    cart.map((cartItem, index) => (
                                        <div key={`${cartItem.item.id}-${index}`} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div>
                                                <p className="font-semibold">{cartItem.item.name}</p>
                                                 {cartItem.uniqueIdentifier && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">ID: {cartItem.uniqueIdentifier}</p>
                                                )}
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {cartItem.quantity} x R$ {formatCurrencyNumber(cartItem.unitPrice)}
                                                </p>
                                            </div>
                                            <p className="font-semibold">R$ {formatCurrencyNumber(cartItem.unitPrice * cartItem.quantity)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg space-y-6">
                            <h2 className="text-xl font-semibold">Adicionar Item</h2>
                            <div className="space-y-4">
                                <div className="relative">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar Produto</label>
                                    <div className="mt-1 flex rounded-md shadow-sm">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            id="search"
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Cód., nome, local, categoria..."
                                            className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            autoComplete="off"
                                        />
                                        <button type="button" onClick={() => setIsScannerOpen(true)} className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a2 2 0 012-2h2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm10 0a2 2 0 012-2h2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM3 13a2 2 0 012-2h2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                     {searchResults.length > 0 && (
                                        <ul className="absolute z-10 w-full bg-white dark:bg-gray-900 border dark:border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                            {searchResults.map(product => (
                                                <li key={product.id} onClick={() => handleSelectProduct(product)} className="p-2 text-sm hover:bg-indigo-500 hover:text-white cursor-pointer">
                                                    <p className="font-semibold">{product.name}</p>
                                                    <p className="text-xs text-gray-400">Cód: {product.barcode} | Estoque: {product.stock}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {selectedProduct?.requiresUniqueIdentifier && (
                                    <div>
                                        <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identificador (IMEI, Serial)</label>
                                        <input type="text" id="identifier" value={uniqueIdentifier} onChange={e => { setUniqueIdentifier(e.target.value); if(e.target.value) setIdentifierError(''); }} onKeyDown={handleKeyDown} className={`mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${identifierError ? 'border-red-500' : ''}`} />
                                        {identifierError && <p className="text-xs text-red-500 mt-1">{identifierError}</p>}
                                    </div>
                                )}
                                <div className="flex items-end gap-2">
                                    <div className="w-24">
                                        <label htmlFor="quantity" className="block text-sm font-medium">Qtd.</label>
                                        <input type="number" id="quantity" value={selectedProduct?.requiresUniqueIdentifier ? 1 : quantity} onChange={e => setQuantity(Number(e.target.value) || 1)} onKeyDown={handleKeyDown} min="1" disabled={selectedProduct?.requiresUniqueIdentifier} className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 disabled:opacity-50" />
                                    </div>
                                    <button onClick={() => handleAddItemToCart(false)} disabled={selectedProduct?.requiresUniqueIdentifier && !uniqueIdentifier.trim()} className="grow h-10 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">Incluir</button>
                                </div>
                            </div>
                             <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                                <h3 className="font-semibold">Dados do Cliente</h3>
                                <div>
                                    <label className="block text-sm font-medium">Telefone/Whatsapp</label>
                                    <input type="text" value={customerWhatsapp} onChange={e => setCustomerWhatsapp(formatPhone(e.target.value))} className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                                    {isCustomerLoading && <p className="text-xs text-blue-400 mt-1">Buscando...</p>}
                                    {foundCustomer && <p className="text-xs text-green-500 mt-1">Cliente encontrado!</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Nome</label>
                                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} onBlur={() => setCustomerName(formatName(customerName))} className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">CPF/CNPJ (Opcional)</label>
                                    <input type="text" value={customerCnpjCpf} onChange={e => { setCustomerCnpjCpf(formatRegister(e.target.value)); if (!e.target.value) setCpfVerificationError(''); }} onBlur={handleCnpjBlur} className={`mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${cpfVerificationError ? 'border-red-500 focus:ring-red-500' : ''}`} />
                                    {isValidatingCpf && <p className="text-xs text-blue-500 mt-1 animate-pulse">Verificando...</p>}
                                    {cpfVerificationError && <p className="text-xs text-red-500 mt-1 font-bold">{cpfVerificationError}</p>}
                                </div>
                             </div>
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <h3 className="font-semibold mb-2">Forma de Pagamento</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setSelectedPaymentMethod(PaymentMethod.CASH)} className={`py-2 px-1 rounded-md text-sm font-medium transition-colors ${selectedPaymentMethod === PaymentMethod.CASH ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Dinheiro</button>
                                    <button onClick={() => setSelectedPaymentMethod(PaymentMethod.PIX)} className={`py-2 px-1 rounded-md text-sm font-medium transition-colors ${selectedPaymentMethod === PaymentMethod.PIX ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Pix</button>
                                    <button onClick={() => setSelectedPaymentMethod(PaymentMethod.DEBIT_CARD)} className={`py-2 px-1 rounded-md text-sm font-medium transition-colors ${selectedPaymentMethod === PaymentMethod.DEBIT_CARD ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Débito</button>
                                    <button onClick={() => setSelectedPaymentMethod(PaymentMethod.CREDIT_CARD_SIGHT)} className={`py-2 px-1 rounded-md text-sm font-medium transition-colors ${selectedPaymentMethod === PaymentMethod.CREDIT_CARD_SIGHT ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Crédito Vista</button>
                                    <button onClick={() => setSelectedPaymentMethod(PaymentMethod.CREDIT_CARD_INSTALLMENT)} className={`py-2 px-1 rounded-md text-sm font-medium transition-colors col-span-2 ${selectedPaymentMethod === PaymentMethod.CREDIT_CARD_INSTALLMENT ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Crédito Parcelado</button>
                                </div>
                                {!goals.autoApplyDiscount && selectedPaymentMethod && selectedPaymentMethod !== PaymentMethod.CREDIT_CARD_INSTALLMENT && (
                                    <button onClick={handleToggleManualDiscount} className={`w-full mt-3 py-2 text-sm font-medium rounded-md border transition-colors ${isManualDiscountActive ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}>{isManualDiscountActive ? 'Remover Desconto' : 'Aplicar Desconto (À Vista)'}</button>
                                )}
                            </div>
                            {message && <p className="text-sm text-indigo-600 dark:text-indigo-400 text-center">{message}</p>}
                            {customerError && <p className="text-sm text-red-500 text-center font-bold">{customerError}</p>}
                            {selectedPaymentMethod ? (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4 animate-fade-in">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                            <span>Subtotal:</span>
                                            <span>R$ {formatCurrencyNumber(subtotal)}</span>
                                        </div>
                                        {discountInfo.discountValue > 0 && (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Desconto ({discountInfo.discountPercent.toFixed(2)}%):</span>
                                                <span>- R$ {formatCurrencyNumber(discountInfo.discountValue)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-2xl font-bold pt-2 border-t border-dashed border-gray-300 dark:border-gray-600">
                                            <span>Total a Pagar:</span>
                                            <span>R$ {formatCurrencyNumber(finalTotal)}</span>
                                        </div>
                                    </div>
                                    <button onClick={handleCompleteSale} disabled={!!cpfVerificationError || isValidatingCpf} className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105 disabled:bg-green-400 disabled:cursor-not-allowed disabled:transform-none">{isValidatingCpf ? 'Validando...' : 'Finalizar Venda'}</button>
                                    <button onClick={() => { resetForm(); showTemporaryMessage('Venda cancelada.'); }} className="w-full py-2 px-4 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600">Cancelar</button>
                                </div>
                            ) : (
                                 <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                     <div className="text-center text-gray-500 dark:text-gray-400 text-sm italic">Selecione uma forma de pagamento.</div>
                                     <button onClick={() => { resetForm(); showTemporaryMessage('Venda cancelada.'); }} className="w-full mt-4 py-2 px-4 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500">Cancelar</button>
                                 </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sales;
