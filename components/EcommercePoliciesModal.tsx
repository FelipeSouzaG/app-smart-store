
import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { KpiGoals } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    goals: KpiGoals;
}

type PolicyType = 'refund' | 'privacy' | 'shipping' | 'terms';

// Boilerplate generator
const getBoilerplate = (type: PolicyType, companyName: string, email: string) => {
    switch(type) {
        case 'refund':
            return `POLÍTICA DE TROCAS E DEVOLUÇÕES - ${companyName.toUpperCase()}

1. DIREITO DE ARREPENDIMENTO (ART. 49 DO CDC)
O cliente tem o direito de desistir da compra em até 7 (sete) dias corridos após o recebimento do produto, sem necessidade de justificativa. O produto deve estar em sua embalagem original, sem indícios de uso, acompanhado de nota fiscal e todos os acessórios. O reembolso será integral.

2. TROCAS POR DEFEITO
Garantimos a troca de produtos com defeito de fabricação no prazo de 30 dias para bens não duráveis e 90 dias para bens duráveis, conforme legislação vigente.

3. CONDIÇÕES GERAIS
Produtos devolvidos com danos causados pelo cliente (mau uso) não serão aceitos. O frete da primeira troca/devolução por defeito é por conta da loja.`;

        case 'privacy':
            return `POLÍTICA DE PRIVACIDADE - ${companyName.toUpperCase()}

1. CONTROLADOR DE DADOS
A ${companyName} é a controladora dos seus dados pessoais. A plataforma tecnológica é operada pela FluxoClean Sistemas sob nossa diretriz.

2. USO DOS DADOS
Coletamos Nome, Telefone e Endereço exclusivamente para:
- Processar e entregar seus pedidos;
- Emitir notas fiscais;
- Entrar em contato via WhatsApp sobre o status da compra.

3. COMPARTILHAMENTO
Seus dados podem ser compartilhados com empresas de logística (Correios/Transportadoras) e Gateways de Pagamento para viabilizar a transação. Não vendemos seus dados para terceiros.`;

        case 'shipping':
            return `POLÍTICA DE FRETE E ENTREGAS

1. PRAZOS
Os prazos de entrega informados no site são estimativas fornecidas pelos Correios ou Transportadoras e começam a contar após a confirmação do pagamento.

2. RETIRADA NA LOJA
Para opção de "Retirada", o pedido ficará disponível por até 30 dias. Após este prazo, a compra poderá ser cancelada e o valor convertido em crédito na loja.

3. ENDEREÇO INCORRETO
A loja não se responsabiliza por endereços preenchidos incorretamente pelo cliente. Caso o produto retorne, um novo frete será cobrado para reenvio.`;

        case 'terms':
            return `TERMOS DE USO

1. DISPONIBILIDADE
Nos esforçamos para manter o estoque atualizado, mas eventuais falhas podem ocorrer. Em caso de ruptura de estoque após a compra, o cliente será reembolsado integralmente.

2. PREÇOS
Reservamo-nos o direito de corrigir erros de digitação em preços. Promoções são válidas enquanto durarem os estoques.

3. RESPONSABILIDADE DA PLATAFORMA
A tecnologia desta loja virtual é fornecida pela FluxoClean Sistemas. A FluxoClean não é proprietária dos produtos, não define preços e não realiza a logística, sendo a ${companyName} a única responsável comercial pelas ofertas aqui veiculadas.`;
        default: return '';
    }
};

const EcommercePoliciesModal: React.FC<Props> = ({ isOpen, onClose, onSave, goals }) => {
    const { apiCall } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState<PolicyType>('refund');
    const [policies, setPolicies] = useState({
        refund: goals.ecommercePolicies?.refundPolicy || getBoilerplate('refund', goals.companyInfo?.name || 'Sua Loja', goals.companyInfo?.email || ''),
        privacy: goals.ecommercePolicies?.privacyPolicy || getBoilerplate('privacy', goals.companyInfo?.name || 'Sua Loja', goals.companyInfo?.email || ''),
        shipping: goals.ecommercePolicies?.shippingPolicy || getBoilerplate('shipping', goals.companyInfo?.name || 'Sua Loja', goals.companyInfo?.email || ''),
        terms: goals.ecommercePolicies?.legalTerms || getBoilerplate('terms', goals.companyInfo?.name || 'Sua Loja', goals.companyInfo?.email || '')
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleRestoreDefault = () => {
        if(window.confirm("Isso substituirá o texto atual pelo modelo padrão. Deseja continuar?")) {
            setPolicies(prev => ({
                ...prev,
                [activeTab]: getBoilerplate(activeTab, goals.companyInfo?.name || 'Sua Loja', goals.companyInfo?.email || '')
            }));
        }
    };

    const handleConfirm = async () => {
        setIsSaving(true);
        try {
            // Update StoreConfig via generic settings endpoint (assuming it handles deep merge or we send full structure)
            // Or specifically, backend might need to handle 'ecommercePolicies' key
            const payload = {
                ecommercePolicies: {
                    refundPolicy: policies.refund,
                    privacyPolicy: policies.privacy,
                    shippingPolicy: policies.shipping,
                    legalTerms: policies.terms,
                    configured: true
                }
            };
            
            await apiCall('settings', 'PUT', payload);
            onSave(); // Refresh parent state
            onClose();
        } catch (e) {
            alert("Erro ao salvar políticas.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-200 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b dark:border-gray-700 bg-linear-to-r from-red-600 to-orange-600 text-white rounded-t-xl">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        ⚖️ Proteção Jurídica da Loja
                    </h2>
                    <p className="text-sm opacity-90 mt-1">
                        Para vender online, você <strong>precisa</strong> definir estas regras. Isso protege sua loja de processos e multas (CDC/LGPD).
                        Já preenchemos com textos padrão seguros para você.
                    </p>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-1/4 bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-700 p-4 space-y-2 overflow-y-auto">
                        <button onClick={() => setActiveTab('refund')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-colors ${activeTab === 'refund' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>Trocas e Devoluções</button>
                        <button onClick={() => setActiveTab('privacy')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-colors ${activeTab === 'privacy' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>Privacidade (LGPD)</button>
                        <button onClick={() => setActiveTab('shipping')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-colors ${activeTab === 'shipping' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>Fretes e Prazos</button>
                        <button onClick={() => setActiveTab('terms')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-colors ${activeTab === 'terms' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>Termos de Uso</button>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 p-6 flex flex-col bg-white dark:bg-gray-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wide">
                                {activeTab === 'refund' && 'Política de Trocas'}
                                {activeTab === 'privacy' && 'Privacidade e Dados'}
                                {activeTab === 'shipping' && 'Regras de Entrega'}
                                {activeTab === 'terms' && 'Isenção de Responsabilidade'}
                            </h3>
                            <button onClick={handleRestoreDefault} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline">
                                Restaurar Texto Padrão
                            </button>
                        </div>
                        <textarea 
                            className="flex-1 w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none dark:text-gray-200"
                            value={policies[activeTab]}
                            onChange={(e) => setPolicies({...policies, [activeTab]: e.target.value})}
                        ></textarea>
                         <p className="text-xs text-gray-400 mt-2">
                            * Este texto aparecerá publicamente no rodapé do seu site. Revise com atenção.
                        </p>
                    </div>
                </div>

                <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl flex justify-between items-center">
                    <p className="text-sm text-red-600 font-bold animate-pulse">A configuração é obrigatória para liberar o E-commerce.</p>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isSaving}
                        className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50"
                    >
                        {isSaving ? 'Salvando...' : 'Confirmar e Publicar Políticas'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EcommercePoliciesModal;
