
import React from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onRequest: () => void;
    isTrial?: boolean; // Prop to adjust pricing display
}

const EcommerceDetailModal: React.FC<Props> = ({ isOpen, onClose, onRequest, isTrial = true }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-160 p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-linear-to-r from-indigo-600 to-purple-600 p-8 text-white text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                              <path fill-rule="evenodd" d="M10.854 8.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
                              <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1m3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Loja Virtual Integrada</h2>
                        <p className="text-indigo-100 font-medium">Expanda suas vendas com o E-commerce Smart-Store</p>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg border-b dark:border-gray-700 pb-2">Funcionalidades</h3>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <span className="text-green-500 text-xl">✓</span>
                                    <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Estoque Sincronizado:</strong> Vendeu na loja física, baixou no site automaticamente.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-green-500 text-xl">✓</span>
                                    <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Pedidos no WhatsApp:</strong> O cliente compra e o pedido chega pronto no seu Zap.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-green-500 text-xl">✓</span>
                                    <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Indexado no Google:</strong> Produtos visíveis nas buscas locais.</p>
                                </li>
                            </ul>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider mb-4">Degustação</h3>
                            
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">R$ 97,00</span>
                                <span className="text-gray-500 dark:text-gray-400 text-xs">/taxa única</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Ativação da degustação do módulo E-commerce.</p>

                            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
                                <p className="text-xs font-bold text-purple-700 dark:text-purple-400">
                                    Sistema Exclusive + E-commerce
                                </p>
                                <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                                    Mensalidade futura: R$ 297,00/mês (Sistema + Loja).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t dark:border-gray-700">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Talvez mais tarde
                        </button>
                        <button 
                            onClick={onRequest}
                            className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M9.752 6.193c.599.6 1.73.437 2.528-.362s.96-1.932.362-2.531c-.599-.6-1.73-.438-2.528.361-.798.8-.96 1.933-.362 2.532"/>
                              <path d="M15.811 3.312c-.363 1.534-1.334 3.626-3.64 6.218l-.24 2.408a2.56 2.56 0 0 1-.732 1.526L8.817 15.85a.51.51 0 0 1-.867-.434l.27-1.899c.04-.28-.013-.593-.131-.956a9 9 0 0 0-.249-.657l-.082-.202c-.815-.197-1.578-.662-2.191-1.277-.614-.615-1.079-1.379-1.275-2.195l-.203-.083a10 10 0 0 0-.655-.248c-.363-.119-.675-.172-.955-.132l-1.896.27A.51.51 0 0 1 .15 7.17l2.382-2.386c.41-.41.947-.67 1.524-.734h.006l2.4-.238C9.005 1.55 11.087.582 12.623.208c.89-.217 1.59-.232 2.08-.188.244.023.435.06.57.093q.1.026.16.045c.184.06.279.13.351.295l.029.073a3.5 3.5 0 0 1 .157.721c.055.485.051 1.178-.159 2.065m-4.828 7.475.04-.04-.107 1.081a1.54 1.54 0 0 1-.44.913l-1.298 1.3.054-.38c.072-.506-.034-.993-.172-1.418a9 9 0 0 0-.164-.45c.738-.065 1.462-.38 2.087-1.006M5.205 5c-.625.626-.94 1.351-1.004 2.09a9 9 0 0 0-.45-.164c-.424-.138-.91-.244-1.416-.172l-.38.054 1.3-1.3c.245-.246.566-.401.91-.44l1.08-.107zm9.406-3.961c-.38-.034-.967-.027-1.746.163-1.558.38-3.917 1.496-6.937 4.521-.62.62-.799 1.34-.687 2.051.107.676.483 1.362 1.048 1.928.564.565 1.25.941 1.924 1.049.71.112 1.429-.067 2.048-.688 3.079-3.083 4.192-5.444 4.556-6.987.183-.771.18-1.345.138-1.713a3 3 0 0 0-.045-.283 3 3 0 0 0-.3-.041Z"/>
                              <path d="M7.009 12.139a7.6 7.6 0 0 1-1.804-1.352A7.6 7.6 0 0 1 3.794 8.86c-1.102.992-1.965 5.054-1.839 5.18.125.126 3.936-.896 5.054-1.902Z"/>
                            </svg>
                            Iniciar Degustação
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EcommerceDetailModal;
