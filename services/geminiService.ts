import type { KPIs } from '../types';

/**
 * Busca insights de gestão utilizando a API do backend que encapsula o Gemini.
 * @param kpis Dados dos indicadores do mês
 * @param apiCall Função de chamada à API vinda do AuthContext
 */
const getManagementInsights = async (
  kpis: KPIs,
  apiCall: (endpoint: string, method: string, body?: any) => Promise<any | null>
): Promise<string> => {
  try {
    const data = await apiCall('insights', 'POST', { kpis });

    if (!data || !data.insights) {
      throw new Error('O servidor não retornou insights válidos.');
    }

    return data.insights;
  } catch (error) {
    console.error('Error fetching insights from backend API:', error);
    return 'Não foi possível gerar os insights de IA no momento. Verifique sua conexão ou tente novamente em alguns instantes.';
  }
};

export default getManagementInsights;
