import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

interface GooglePlace {
    placeId: string;
    name: string;
    address: string;
    rating: number;
    userRatingCount: number;
    mapsUri: string;
    websiteUri?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void; // Called when flow ends (success or skipped)
    onRequestService: (type: 'google_maps' | 'ecommerce') => void;
}

const GoogleVerificationModal: React.FC<Props> = ({ isOpen, onClose, onComplete, onRequestService }) => {
    const { apiCall } = useContext(AuthContext);
    
    const [step, setStep] = useState<'loading' | 'list' | 'website_check' | 'offer_maps' | 'offer_ecommerce' | 'success'>('loading');
    const [candidates, setCandidates] = useState<GooglePlace[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<GooglePlace | null>(null);
    const [websiteStatus, setWebsiteStatus] = useState<'good' | 'bad' | 'none'>('none');

    // Inicia a busca ao abrir
    useEffect(() => {
        if (isOpen && step === 'loading') {
            const fetchCandidates = async () => {
                try {
                    const response = await apiCall('insights/growth-check', 'POST');
                    
                    if (response.status === 'verified') {
                        // Já verificado, fecha ou mostra sucesso? Vamos fechar pois não deveria ter aberto
                        onComplete(); 
                        return;
                    }

                    if (response.status === 'not_found') {
                        // Já marcado como não encontrado, vai direto para a oferta
                        setStep('offer_maps');
                        return;
                    }

                    if (response.candidates && response.candidates.length > 0) {
                        setCandidates(response.candidates);
                        setStep('list');
                    } else {
                        // Nenhum candidato encontrado direto na busca
                        // Salva como not_found para não buscar de novo na próxima
                        await apiCall('settings/google-business', 'PUT', { status: 'not_found' });
                        setStep('offer_maps');
                    }
                } catch (e) {
                    console.error(e);
                    onComplete();
                }
            };
            fetchCandidates();
        }
    }, [isOpen, step]);

    const handleSelectPlace = async (place: GooglePlace) => {
        setSelectedPlace(place);
        
        // 1. Salvar no Backend
        try {
            await apiCall('settings/google-business', 'PUT', {
                status: 'verified',
                placeData: place
            });
        } catch (e) { console.error("Erro ao salvar place", e); }

        // 2. Analisar Website para Upsell
        let status: 'good' | 'bad' | 'none' = 'none';
        
        if (!place.websiteUri) {
            status = 'none';
        } else {
            const lowerUrl = place.websiteUri.toLowerCase();
            const socialMedia = ['facebook.com', 'instagram.com', 'linktr.ee', 'wix.com', 'linkedin.com'];
            if (socialMedia.some(s => lowerUrl.includes(s))) {
                status = 'bad'; // Tem site, mas é rede social ou amador
            } else {
                status = 'good'; // Site próprio
            }
        }
        
        setWebsiteStatus(status);

        if (status === 'good') {
            setStep('success'); // Tudo certo, parabéns
        } else {
            setStep('offer_ecommerce'); // Upsell de site
        }
    };

    const handleNoneOfThese = async () => {
        // Salva que não foi encontrado para não perguntar de novo tão cedo
        try {
            await apiCall('settings/google-business', 'PUT', { status: 'not_found' });
        } catch (e) {}
        setStep('offer_maps');
    };

    const handleRequestMaps = () => {
        onRequestService('google_maps'); 
        onClose(); // Close this modal
    };

    const handleRequestEcommerce = () => {
        onRequestService('ecommerce');
        onComplete();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-150 p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white text-center">
                    <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 text-2xl">
                        {step === 'loading' ?
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                          </svg>
                          : step.includes('offer') ?
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M9.752 6.193c.599.6 1.73.437 2.528-.362s.96-1.932.362-2.531c-.599-.6-1.73-.438-2.528.361-.798.8-.96 1.933-.362 2.532"/>
                              <path d="M15.811 3.312c-.363 1.534-1.334 3.626-3.64 6.218l-.24 2.408a2.56 2.56 0 0 1-.732 1.526L8.817 15.85a.51.51 0 0 1-.867-.434l.27-1.899c.04-.28-.013-.593-.131-.956a9 9 0 0 0-.249-.657l-.082-.202c-.815-.197-1.578-.662-2.191-1.277-.614-.615-1.079-1.379-1.275-2.195l-.203-.083a10 10 0 0 0-.655-.248c-.363-.119-.675-.172-.955-.132l-1.896.27A.51.51 0 0 1 .15 7.17l2.382-2.386c.41-.41.947-.67 1.524-.734h.006l2.4-.238C9.005 1.55 11.087.582 12.623.208c.89-.217 1.59-.232 2.08-.188.244.023.435.06.57.093q.1.026.16.045c.184.06.279.13.351.295l.029.073a3.5 3.5 0 0 1 .157.721c.055.485.051 1.178-.159 2.065m-4.828 7.475.04-.04-.107 1.081a1.54 1.54 0 0 1-.44.913l-1.298 1.3.054-.38c.072-.506-.034-.993-.172-1.418a9 9 0 0 0-.164-.45c.738-.065 1.462-.38 2.087-1.006M5.205 5c-.625.626-.94 1.351-1.004 2.09a9 9 0 0 0-.45-.164c-.424-.138-.91-.244-1.416-.172l-.38.054 1.3-1.3c.245-.246.566-.401.91-.44l1.08-.107zm9.406-3.961c-.38-.034-.967-.027-1.746.163-1.558.38-3.917 1.496-6.937 4.521-.62.62-.799 1.34-.687 2.051.107.676.483 1.362 1.048 1.928.564.565 1.25.941 1.924 1.049.71.112 1.429-.067 2.048-.688 3.079-3.083 4.192-5.444 4.556-6.987.183-.771.18-1.345.138-1.713a3 3 0 0 0-.045-.283 3 3 0 0 0-.3-.041Z"/>
                              <path d="M7.009 12.139a7.6 7.6 0 0 1-1.804-1.352A7.6 7.6 0 0 1 3.794 8.86c-1.102.992-1.965 5.054-1.839 5.18.125.126 3.936-.896 5.054-1.902Z"/>
                            </svg> : step === 'success' ?
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-check-square-fill" viewBox="0 0 16 16">
                              <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm10.03 4.97a.75.75 0 0 1 .011 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.75.75 0 0 1 1.08-.022z"/>
                            </svg>
                            :
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/>
                            </svg>
                        }
                    </div>
                    <h2 className="text-xl font-bold">
                        {step === 'loading' && 'Buscando sua Loja...'}
                        {step === 'list' && 'Encontramos estes locais'}
                        {step === 'offer_maps' && 'Loja Invisível no Google!'}
                        {step === 'offer_ecommerce' && 'Profissionalize sua Presença'}
                        {step === 'success' && 'Tudo Pronto!'}
                    </h2>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    
                    {step === 'loading' && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <p className="text-gray-500">Analisando presença digital no Google Maps...</p>
                        </div>
                    )}

                    {step === 'list' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
                                Selecione qual destes resultados é o seu negócio para conectarmos os dados:
                            </p>
                            {candidates.map((place) => (
                                <button
                                    key={place.placeId}
                                    onClick={() => handleSelectPlace(place)}
                                    className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                                >
                                    <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{place.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{place.address}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <span className="text-yellow-500 text-xs">★</span>
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{place.rating}</span>
                                        <span className="text-[10px] text-gray-400">({place.userRatingCount} avaliações)</span>
                                    </div>
                                </button>
                            ))}
                            <button
                                onClick={handleNoneOfThese}
                                className="w-full py-3 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white font-medium underline mt-4"
                            >
                                Nenhuma destas lojas é a minha
                            </button>
                        </div>
                    )}

                    {step === 'offer_maps' && (
                        <div className="text-center">
                            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                                <strong>Alerta Crítico:</strong> Sua loja não foi encontrada no Google Maps. 
                                <br/><br/>
                                Hoje, 85% dos clientes buscam no Google antes de visitar. Você está perdendo vendas diárias para concorrentes visíveis.
                            </p>
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 mb-6">
                                <p className="font-bold text-orange-800 dark:text-orange-300 mb-1">Oferta Exclusiva</p>
                                <p className="text-xs text-orange-700 dark:text-orange-400">
                                    Nossa equipe cadastra e otimiza sua ficha no Google para sua empresa aparecer nas pesquisas dos clientes com pagamento único de R$ 297,00.
                                </p>
                            </div>
                            <button 
                                onClick={handleRequestMaps}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105 mb-3"
                            >
                                Quero Aparecer no Google
                            </button>
                            <button onClick={onComplete} className="text-sm text-gray-400 hover:text-gray-600">Agora não, obrigado</button>
                        </div>
                    )}

                    {step === 'offer_ecommerce' && (
                        <div className="text-center">
                            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                                Conectamos sua loja <strong>"{selectedPlace?.name}"</strong> com sucesso!
                                <br/><br/>
                                {websiteStatus === 'none' 
                                    ? "Notamos que você ainda não tem um site vinculado à sua ficha."
                                    : "Notamos que seu site atual é uma rede social, o que limita suas vendas profissionais."
                                }
                            </p>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800 mb-6">
                                <p className="font-bold text-indigo-800 dark:text-indigo-300 mb-1">Ative seu E-commerce</p>
                                <p className="text-xs text-indigo-700 dark:text-indigo-400">Transforme seu estoque do sistema em uma vitrine online automática integrada ao Google.</p>
                            </div>
                            <button 
                                onClick={handleRequestEcommerce}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105 mb-3"
                            >
                                Ativar Vitrine Online (R$ 97)
                            </button>
                            <button onClick={onComplete} className="text-sm text-gray-400 hover:text-gray-600">Vou continuar sem site</button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-6">
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Parabéns! Sua loja <strong>"{selectedPlace?.name}"</strong> está devidamente mapeada e com presença digital profissional.
                            </p>
                            <button 
                                onClick={onComplete}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg"
                            >
                                Acessar Dashboard
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default GoogleVerificationModal;