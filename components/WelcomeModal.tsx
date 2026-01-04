
import React from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const WelcomeModal: React.FC<Props> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-200 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="bg-linear-to-r from-indigo-600 to-blue-600 p-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-1">Bem Vindo ao Smart-Store!</h2>
                    <p className="text-indigo-100 text-sm">Seu parceiro de gestão inteligente.</p>
                </div>

                <div className="p-8 space-y-6">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Para iniciar a jornada de escalada da sua loja, faça as configurações iniciais:
                    </p>

                    <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
                        <li className="flex items-start gap-3">
                            <span className="text-green-500 font-bold">✓</span>
                            Endereço e Telefone em comprovantes
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-500 font-bold">✓</span>
                            Metas e Objetivos da loja
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-500 font-bold">✓</span>
                            Tributação, Margens e Taxas de Vendas
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-500 font-bold">✓</span>
                            Indice de reposição de estoque
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-500 font-bold">✓</span>
                            Meios de pagamento de Custos Fixos e Variáveis
                        </li>
                    </ul>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 space-y-3">
                        
                      <div className="flex items-center space-x-3">
                        <div className="bg-transparent">
                          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                          </svg>
                        </div>
                        <div>
                          <p><strong>Importante:</strong> Essas configurações são fundamentais para o cálculo correto dos indicadores e tomada de decisão.</p>
                        </div>
                      </div>
                        
                      <div className="flex items-center space-x-3">
                        <div className="bg-transparent">
                          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M2 15.5V2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.74.439L8 13.069l-5.26 2.87A.5.5 0 0 1 2 15.5m8.854-9.646a.5.5 0 0 0-.708-.708L7.5 7.793 6.354 6.646a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0z"/>
                          </svg>
                        </div>
                        <div>
                          <p>Sua degustação é de 15 dias renováveis por mais 60 dias.</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="bg-transparent">
                          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.354-5.854 1.5 1.5a.5.5 0 0 1-.708.708L13 11.707V14.5a.5.5 0 0 1-1 0v-2.793l-.646.647a.5.5 0 0 1-.708-.708l1.5-1.5a.5.5 0 0 1 .708 0"/>
                            <path d="M2 1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7.256A4.5 4.5 0 0 0 12.5 8a4.5 4.5 0 0 0-3.59 1.787A.5.5 0 0 0 9 9.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .39-.187A4.5 4.5 0 0 0 8.027 12H6.5a.5.5 0 0 0-.5.5V16H3a1 1 0 0 1-1-1zm2 1.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5m3 0v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5m3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM4 5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5M7.5 5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5M4.5 8a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/>
                          </svg>
                        </div>
                        <div>
                          <p>Aproveite nossos Serviços de Aceleração de Crescimento da Loja consultando o botão <strong>Status</strong> no Dashboard.</p>
                        </div>
                      </div>

                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 mt-3"
                    >
                        Iniciar Gestão
                    </button>
                </div>
            </div>
        </div>

      </div>
    );
};

export default WelcomeModal;
