import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pymciezjcucizinbasas.supabase.co';
const supabasePublishableKey = 'sb_publishable_QmbZs0vl_paAwA7hL1GpOg_ck7a-pSG';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export type Recommendation = {
  name: string;
  neighborhood: string;
  why: string;
  price: 'económico' | 'medio' | 'alto' | string;
  tip: string;
};

export type RecommendationResponse = {
  summary: string;
  ideas: Recommendation[];
  notice: string;
};

export async function getGeminiRecommendations(input: {
  plan: string;
  zone: string;
  budget: string;
  groupSize: number;
}): Promise<RecommendationResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error('No pudimos iniciar el acceso al recomendador. Intentá de nuevo.');
  }

  const { data, error } = await supabase.functions.invoke<RecommendationResponse>(
    'gemini-recommendations',
    { body: input },
  );

  if (error || !data) throw new Error('Gemini no pudo generar recomendaciones ahora. Intentá nuevamente.');
  return data;
}
