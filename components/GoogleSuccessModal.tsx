
import React, { useState } from 'react';

interface Props {
    isOpen: boolean;
    mapsUrl: string;
    onClose: () => void;
}

const GoogleSuccessModal: React.FC<Props> = ({ isOpen, mapsUrl, onClose }) => {
    const [clicked, setClicked] = useState(false);

    if (!isOpen) return null;

    const handleOpenLink = () => {
        setClicked(true);
        window.open(mapsUrl, '_blank');
        // Fecha o modal após o usuário clicar para ver
        setTimeout(() => onClose(), 1000); 
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-200 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-center relative border border-green-500/30">
                {/* Confetti effect can be CSS/SVG based later, for now sticking to clean UI */}
                <div className="bg-linear-to-b from-green-500 to-emerald-600 p-8 text-white relative">
                    <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10" style={{backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)', backgroundSize: '15px 15px'}}></div>
                    <div className="rounded-full flex items-center justify-center mx-auto mb-4 text-green-50 relative z-10 animate-bounce">
                      <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/>
                      </svg>
                    </div>
                    <h2 className="text-2xl font-black relative z-10">Sua Loja está no Google!</h2>
                </div>

                <div className="p-8 space-y-6">
                    <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                        Agora sua empresa aparecerá nas pesquisas de milhares de pessoas na sua região. 
                    </p>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800 text-sm text-green-800 dark:text-green-300">
                        <strong>Dica de Ouro:</strong> Peça para amigos e clientes avaliarem sua loja hoje mesmo. Isso fará você subir no ranking de buscas rapidamente!
                    </div>

                    <button 
                        onClick={handleOpenLink}
                        className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${clicked ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z"/>
                        </svg>
                        Ver Presença no Google
                    </button>
                    
                    <button onClick={onClose} className="text-gray-400 text-sm hover:text-gray-600 dark:hover:text-gray-200">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoogleSuccessModal;
