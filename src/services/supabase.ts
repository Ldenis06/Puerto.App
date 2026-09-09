import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://pymciezjcucizinbasas.supabase.co',
  'sb_publishable_QmbZs0vl_paAwA7hL1GpOg_ck7a-pSG',
);

export async function getGeminiRecommendations(input: { plan: string; zone: string; budget: string; groupSize: number }) {
  const { data: current } = await supabase.auth.getSession();
  if (!current.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error('No se pudo iniciar el recomendador.');
  }
  const { data, error } = await supabase.functions.invoke('gemini-recommendations', { body: input });
  if (error || !data) throw new Error('Gemini no pudo responder ahora.');
  return data as { summary: string; ideas: Array<{ name: string; neighborhood: string; why: string; price: string; tip: string }>; notice: string };
}
