import React, { useState, useRef } from 'react';
import { KpiGoals } from '../types';
import { formatPhone } from '../validation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: any) => void;
    goals: KpiGoals;
}

type ImageType = 'logo' | 'facade' | 'interior';

const GoogleBusinessFormModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, goals }) => {
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [services, setServices] = useState('');
    const [openingHours, setOpeningHours] = useState('Seg a Sex: 08h às 18h (Fecha para intervalo: 11h as 12h) | Sáb: 08h às 12h | Dom: 08h às 12h');
    const [website, setWebsite] = useState('');
    const [instagram, setInstagram] = useState('');
    const [tiktok, setTiktok] = useState('');
    
    // Contact Info (Pre-filled)
    const [contactName, setContactName] = useState(goals.companyInfo?.name || '');
    const [contactPhone, setContactPhone] = useState(goals.companyInfo?.phone || '');

    // Structured Images
    const [images, setImages] = useState<{ [key in ImageType]?: string }>({});
    const [processingSlot, setProcessingSlot] = useState<ImageType | null>(null);

    // Refs for distinct inputs
    const logoInputRef = useRef<HTMLInputElement>(null);
    const facadeInputRef = useRef<HTMLInputElement>(null);
    const interiorInputRef = useRef<HTMLInputElement>(null);

    // Função para comprimir imagem antes do envio (Evita PayloadTooLarge)
    // Reduzido para 1280px (HD) para maior velocidade em dispositivos móveis
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1280; // HD (mais rápido e suficiente para Web)
                    const MAX_HEIGHT = 1280;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG 80% quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: ImageType) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProcessingSlot(type);
            
            // Pequeno delay para permitir que o React renderize o estado de loading antes de travar no processamento
            setTimeout(async () => {
                try {
                    const compressedData = await compressImage(file);
                    setImages(prev => ({ ...prev, [type]: compressedData }));
                } catch (err) {
                    alert("Erro ao processar imagem. Tente outra.");
                } finally {
                    setProcessingSlot(null);
                }
            }, 50);
        }
    };

    const removeImage = (type: ImageType) => {
        setImages(prev => {
            const newState = { ...prev };
            delete newState[type];
            return newState;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validação Estrita de Imagens
        if (!images.logo) { alert("A imagem do LOGO é obrigatória."); return; }
        if (!images.facade) { alert("A imagem da FACHADA é obrigatória."); return; }
        if (!images.interior) { alert("A imagem do INTERIOR é obrigatória."); return; }

        // Formatar array para envio
        const imageArray = [
            { name: 'Logo', data: images.logo },
            { name: 'Fachada', data: images.facade },
            { name: 'Interior', data: images.interior }
        ];

        const payload = {
            category,
            description,
            services,
            openingHours,
            socialLinks: {
                website,
                instagram,
                tiktok
            },
            contactInfo: {
                name: contactName,
                phone: contactPhone,
                fullAddress: goals.companyInfo?.address ? `${goals.companyInfo.address.street}, ${goals.companyInfo.address.number} - ${goals.companyInfo.address.neighborhood}, ${goals.companyInfo.address.city} - ${goals.companyInfo.address.state}` : ''
            },
            images: imageArray 
        };

        onSubmit(payload);
    };

    const ImageSlot = ({ type, label, icon }: { type: ImageType, label: string, icon: React.ReactNode }) => {
        const isLoading = processingSlot === type;
        const hasImage = !!images[type];

        return (
            <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label} <span className="text-red-500">*</span>
                </label>
                
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-indigo-200 dark:border-indigo-800 bg-gray-50 dark:bg-gray-800 transition-all hover:border-indigo-400">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 animate-pulse text-indigo-600 dark:text-indigo-400">
                            <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-xs font-bold">Processando...</span>
                        </div>
                    ) : hasImage ? (
                        <div className="relative w-full h-full group">
                            <img src={images[type]} alt={label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    type="button"
                                    onClick={() => removeImage(type)}
                                    className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg transform hover:scale-110 transition-transform"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            onClick={() => {
                                if (type === 'logo') logoInputRef.current?.click();
                                if (type === 'facade') facadeInputRef.current?.click();
                                if (type === 'interior') interiorInputRef.current?.click();
                            }}
                            className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        >
                            <span className="text-3xl mb-1">{icon}</span>
                            <span className="text-xs font-bold uppercase tracking-wide">Adicionar Foto</span>
                        </button>
                    )}
                </div>

                {/* Inputs escondidos */}
                <input 
                    type="file" 
                    ref={type === 'logo' ? logoInputRef : type === 'facade' ? facadeInputRef : interiorInputRef}
                    onChange={(e) => handleImageUpload(e, type)} 
                    accept="image/*" 
                    className="hidden" 
                />
            </div>
        );
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-200 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl my-8 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b dark:border-gray-700 bg-indigo-600 text-white rounded-t-xl">
                    <div className="text-xl font-bold flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z"/>
                        </svg>
                        <span>Cadastro Profissional Google</span>
                    </div>
                    <p className="text-sm opacity-90 mt-1">Preencha com atenção. Estas informações serão a vitrine da sua loja para milhões de clientes.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-8">
                    
                    {/* Seção 1: Fotos Obrigatórias */}
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            1. Fotos da Empresa
                            <span className="text-xs font-normal bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-full">Essencial</span>
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <ImageSlot
                              type="logo"
                              label="Logotipo"
                              icon={
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                                  <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1z"/>
                                </svg>
                              }
                            />
                            <ImageSlot
                              type="facade"
                              label="Fachada (Frente)"
                              icon={
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                                  <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1z"/>
                                </svg>
                              }
                            />
                            <ImageSlot
                              type="interior"
                              label="Interior da Loja"
                              icon={
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                                  <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1z"/>
                                </svg>
                              }
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-3 text-center">
                            Dica: Tire fotos bem iluminadas. O sistema otimizará automaticamente o tamanho para envio rápido.
                        </p>
                    </div>

                    {/* Seção 2: Dados Básicos */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2">2. Informações Principais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Categoria Principal <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={category} 
                                    onChange={e => setCategory(e.target.value)} 
                                    placeholder="Ex: Assistência Técnica, Loja de Roupas..."
                                    className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Horário de Funcionamento <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={openingHours} 
                                    onChange={e => setOpeningHours(e.target.value)} 
                                    className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Descrição Comercial</label>
                            <textarea 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                placeholder="Conte a história da sua loja, seus diferenciais e o que você oferece de melhor. Texto chamativo para clientes."
                                className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 h-24 focus:ring-2 focus:ring-indigo-500"
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Lista de Serviços/Produtos (Palavras-chave)</label>
                            <textarea 
                                value={services} 
                                onChange={e => setServices(e.target.value)} 
                                placeholder="Ex: Troca de tela, Bateria iPhone, Capinhas, Películas... (Isso ajuda a ser encontrado nas buscas)"
                                className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 h-20 focus:ring-2 focus:ring-indigo-500"
                            ></textarea>
                        </div>
                    </div>

                    {/* Seção 3: Presença Digital */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3">3. Redes Sociais e Site</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Site (se houver)</label>
                                <input type="text" value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.sualoja.com.br" className="w-full rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 p-2 text-sm"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Instagram</label>
                                <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@sualoja" className="w-full rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 p-2 text-sm"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">TikTok</label>
                                <input type="text" value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="@sualoja" className="w-full rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 p-2 text-sm"/>
                            </div>
                        </div>
                    </div>

                    {/* Contact Confirmation */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nome do Responsável</label>
                            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} required className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2.5"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Telefone para Contato</label>
                            <input type="text" value={contactPhone} onChange={e => setContactPhone(formatPhone(e.target.value))} required className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2.5"/>
                        </div>
                    </div>

                </form>

                <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium">Cancelar</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={!!processingSlot}
                        className="px-8 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transform transition hover:scale-105 disabled:bg-indigo-400 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                        {processingSlot ? 'Processando Imagens...' : 'Salvar e Ir para Pagamento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoogleBusinessFormModal;