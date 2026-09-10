import { createClient } from '@supabase/supabase-js';
import { NotebookNote } from '../types';

const supabaseUrl = 'https://pymciezjcucizinbasas.supabase.co';
const supabasePublishableKey = 'sb_publishable_QmbZs0vl_paAwA7hL1GpOg_ck7a-pSG';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

async function ensureAnonymousSession(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error('No se pudo conectar con la libreta. Intentá nuevamente.');
  }
}

export async function getNotebookNotes(): Promise<NotebookNote[]> {
  await ensureAnonymousSession();
  const { data, error } = await supabase.from('libretas_notes').select('id, body, author_name, created_at').order('created_at', { ascending: false });
  if (error) throw new Error('No se pudieron cargar las publicaciones.');
  return (data || []) as NotebookNote[];
}

export async function publishNotebookNote(body: string, password: string): Promise<NotebookNote> {
  await ensureAnonymousSession();
  const { data, error } = await supabase.functions.invoke<NotebookNote[]>('publish-notebook-note', { body: { body, password } });
  if (error || !data?.[0]) throw new Error('No se pudo publicar la nota. Revisá la contraseña e intentá nuevamente.');
  return data[0];
}

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
  await ensureAnonymousSession();

  const { data, error } = await supabase.functions.invoke<RecommendationResponse>(
    'gemini-recommendations',
    { body: input },
  );

  if (error || !data) throw new Error('Gemini no pudo generar recomendaciones ahora. Intentá nuevamente.');
  return data;
}
