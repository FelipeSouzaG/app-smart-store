
import React from 'react';

export type GrowthVariant = 'verify' | 'maps_offer' | 'ecommerce_offer';

interface Props {
    isOpen: boolean;
    variant: GrowthVariant;
    onPrimaryAction: () => void;
    onRemindLater: () => void;
    onDismiss: () => void;
}

const GoogleVerificationAlertModal: React.FC<Props> = ({ isOpen, variant, onPrimaryAction, onRemindLater, onDismiss }) => {
    if (!isOpen) return null;

    const content = {
        verify: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/>
                  </svg>,
            title: 'Presença no Google',
            description: 'Ainda não verificamos a presença da sua empresa no Google Maps. Isso é essencial para que clientes encontrem sua loja.',
            buttonText: 'Verificar Presença',
            buttonColor: 'bg-blue-600 hover:bg-blue-700'
        },
        maps_offer: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z"/>
                  </svg>,
            title: 'Presença no Google',
            description: 'Sua empresa não foi encontrada no Maps. Clientes podem estar indo para concorrentes.',
            buttonText: 'Verificar Presença',
            buttonColor: 'bg-blue-600 hover:bg-blue-700'
        },
        ecommerce_offer: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                     <path fill-rule="evenodd" d="M10.854 8.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
                    <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1m3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>
                  </svg>,
            title: 'E-commerce Smart-Store',
            description: 'Deseja integrar seu sistema a Loja Online?',
            buttonText: 'Verificar E-commerce', 
            buttonColor: 'bg-indigo-600 hover:bg-indigo-700'
        }
    };

    const current = content[variant];
    
    // Safety check just in case
    if (!current) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-140 p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200 dark:border-gray-600 text-3xl">
                        {current.icon}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        {current.title}
                    </h3>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        {current.description}
                    </p>

                    <div className="space-y-3">
                        <button 
                            onClick={onPrimaryAction}
                            className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 ${current.buttonColor}`}
                        >
                            {current.buttonText}
                        </button>
                        
                        <button 
                            onClick={onRemindLater}
                            className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-semibold rounded-xl transition-colors"
                        >
                            Talvez mais tarde
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleVerificationAlertModal;
