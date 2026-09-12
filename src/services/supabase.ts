import { createClient } from '@supabase/supabase-js';
import { NotebookNote, NotebookReaction } from '../types';

const supabaseUrl = 'https://pymciezjcucizinbasas.supabase.co';
const supabasePublishableKey = 'sb_publishable_QmbZs0vl_paAwA7hL1GpOg_ck7a-pSG';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export type SharedProfileAvatar = { user_id: string; avatar_data: string };
export type SharedProfileDescription = { user_id: string; description: string };

async function ensureAnonymousSession(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user.id) return sessionData.session.user.id;
  {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error('No se pudo conectar con la libreta. Intentá nuevamente.');
  }
  const { data: nextSession } = await supabase.auth.getSession();
  if (!nextSession.session?.user.id) throw new Error('No se pudo identificar la sesión.');
  return nextSession.session.user.id;
}

export async function getSharedProfileAvatars(): Promise<SharedProfileAvatar[]> {
  await ensureAnonymousSession();
  const { data, error } = await supabase.from('profile_avatars').select('user_id, avatar_data');
  if (error) throw new Error('No se pudieron cargar las fotos compartidas.');
  return (data || []) as SharedProfileAvatar[];
}

export async function saveSharedProfileAvatar(userId: string, avatarData: string, password?: string): Promise<void> {
  await ensureAnonymousSession();
  const { data, error } = await supabase.functions.invoke<{ saved: boolean }>('save-profile-avatar', {
    body: { userId, avatarData, password },
  });
  if (error || !data?.saved) throw new Error('No se pudo sincronizar la foto. Intentá nuevamente.');
}

export async function getSharedProfileDescriptions(): Promise<SharedProfileDescription[]> {
  await ensureAnonymousSession();
  const { data, error } = await supabase.from('profile_descriptions').select('user_id, description');
  if (error) throw new Error('No se pudieron cargar las descripciones compartidas.');
  return (data || []) as SharedProfileDescription[];
}

export async function saveSharedProfileDescription(userId: string, description: string, password: string): Promise<void> {
  await ensureAnonymousSession();
  const { data, error } = await supabase.functions.invoke<{ saved: boolean }>('save-profile-description', {
    body: { userId, description, password },
  });
  if (error || !data?.saved) throw new Error('No se pudo sincronizar la descripción. Intentá nuevamente.');
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

export async function deleteNotebookNote(noteId: string, password: string): Promise<void> {
  await ensureAnonymousSession();
  const { error } = await supabase.functions.invoke('delete-notebook-note', { body: { noteId, password } });
  if (error) throw new Error('No se pudo borrar la publicación. Revisá la contraseña e intentá nuevamente.');
}

export async function getNotebookReactions(): Promise<NotebookReaction[]> {
  await ensureAnonymousSession();
  const { data, error } = await supabase.from('libretas_reactions').select('note_id, user_id, emoji');
  if (error) throw new Error('No se pudieron cargar las reacciones.');
  return (data || []) as NotebookReaction[];
}

export async function getNotebookSessionUserId(): Promise<string> {
  return ensureAnonymousSession();
}

export async function toggleNotebookReaction(noteId: string, emoji: NotebookReaction['emoji']): Promise<{ active: boolean }> {
  await ensureAnonymousSession();
  const { data, error } = await supabase.functions.invoke<{ active: boolean }>('toggle-notebook-reaction', { body: { noteId, emoji } });
  if (error || !data) throw new Error('No se pudo guardar la reacción.');
  return data;
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
