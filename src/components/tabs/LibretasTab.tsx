import React, { useEffect, useState } from 'react';
import { BookOpenText, Check, Clipboard, LoaderCircle, Send, Trash2 } from 'lucide-react';
import { NotebookNote, NotebookReaction } from '../../types';
import { deleteNotebookNote, getNotebookNotes, getNotebookReactions, getNotebookSessionUserId, publishNotebookNote, toggleNotebookReaction } from '../../services/supabase';

interface Props { isDenis: boolean; }

const PROFILE_TEMPLATE = `Usuario:
Cuenta:

Seguidores:
Seguidos:

Detalles:`;

export const LibretasTab: React.FC<Props> = ({ isDenis }) => {
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [reactions, setReactions] = useState<NotebookReaction[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(PROFILE_TEMPLATE);
  const [password, setPassword] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [copiedUserNoteId, setCopiedUserNoteId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      const [nextNotes, nextReactions, userId] = await Promise.all([getNotebookNotes(), getNotebookReactions(), getNotebookSessionUserId()]);
      setNotes(nextNotes); setReactions(nextReactions); setSessionUserId(userId);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las publicaciones.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || !password || publishing) return;
    try {
      setPublishing(true); setError(null);
      const note = await publishNotebookNote(draft.trim(), password);
      setNotes((current) => [note, ...current]);
      setDraft(PROFILE_TEMPLATE); setPassword('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo publicar la nota.'); }
    finally { setPublishing(false); }
  };

  const react = async (noteId: string, emoji: NotebookReaction['emoji']) => {
    if (!sessionUserId) return;
    try {
      setError(null);
      const result = await toggleNotebookReaction(noteId, emoji);
      setReactions((current) => result.active
        ? [...current, { note_id: noteId, emoji, user_id: sessionUserId }]
        : current.filter((reaction) => !(reaction.note_id === noteId && reaction.emoji === emoji && reaction.user_id === sessionUserId)));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar la reacción.'); }
  };

  const emojis: NotebookReaction['emoji'][] = ['👍', '😂', '❤️', '🔥'];

  const copyUser = async (noteId: string, username: string) => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUserNoteId(noteId);
      window.setTimeout(() => setCopiedUserNoteId((current) => current === noteId ? null : current), 1800);
    } catch { setError('No se pudo copiar automáticamente. Mantené presionado el usuario para copiarlo.'); }
  };

  const removeNote = async (noteId: string) => {
    if (!window.confirm('¿Borrar esta publicación? Esta acción no se puede deshacer.')) return;
    const deletePassword = window.prompt('Ingresá la contraseña de Denis para confirmar el borrado.');
    if (!deletePassword) return;
    try {
      setError(null);
      await deleteNotebookNote(noteId, deletePassword);
      setNotes((current) => current.filter((note) => note.id !== noteId));
      setReactions((current) => current.filter((reaction) => reaction.note_id !== noteId));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo borrar la publicación.'); }
  };

  return <div className="space-y-4 pb-24 animate-fadeIn">
    <section className="rounded-[26px] border border-white/10 bg-gradient-to-br from-[#0A84FF]/15 to-zinc-950 p-5">
      <div className="flex items-center gap-3"><div className="rounded-2xl bg-[#0A84FF]/20 p-3 text-[#5AC8FA]"><BookOpenText className="h-6 w-6" /></div><div><h2 className="text-lg font-black text-white">Libretas</h2><p className="text-xs text-zinc-400">Notas y novedades del grupo.</p></div></div>
    </section>

    {isDenis && <form onSubmit={publish} className="space-y-3 rounded-[26px] border border-[#0A84FF]/35 bg-white/[0.04] p-4"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={8} className="w-full resize-none rounded-2xl border border-white/15 bg-black/60 p-3 text-sm text-white outline-none focus:border-[#0A84FF]" /><div className="flex flex-col gap-2 sm:flex-row"><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Contraseña" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[#0A84FF]" /><button type="submit" disabled={publishing || !draft.trim() || !password} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0A84FF] px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{publishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publicar</button></div></form>}

    {error && <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}
    {loading ? <div className="flex justify-center py-10 text-zinc-400"><LoaderCircle className="h-6 w-6 animate-spin" /></div> : notes.length === 0 ? <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-8 text-center"><BookOpenText className="mx-auto mb-3 h-9 w-9 text-zinc-500" /><p className="text-sm font-bold text-white">Todavía no hay publicaciones</p></div> : <div className="space-y-3">{notes.map((note) => { const noteReactions = reactions.filter((reaction) => reaction.note_id === note.id); const username = note.body.match(/^\s*Usuario:\s*(.+)$/im)?.[1]?.trim(); return <article key={note.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#5AC8FA]">Sistema</span><div className="flex items-center gap-2"><time className="text-[10px] text-zinc-500">{new Date(note.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</time>{isDenis && <button type="button" aria-label="Borrar publicación" onClick={() => void removeNote(note.id)} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/15 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>}</div></div><p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{note.body}</p>{username && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2"><span className="min-w-0 truncate text-xs text-zinc-300">Usuario: <strong className="select-text text-white">{username}</strong></span><button type="button" onClick={() => void copyUser(note.id, username)} className="flex shrink-0 items-center gap-1 rounded-lg border border-[#0A84FF]/35 bg-[#0A84FF]/15 px-2 py-1 text-[10px] font-bold text-[#5AC8FA]">{copiedUserNoteId === note.id ? <><Check className="h-3 w-3" /> Copiado</> : <><Clipboard className="h-3 w-3" /> Copiar usuario</>}</button></div>}<div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">{emojis.map((emoji) => { const count = noteReactions.filter((reaction) => reaction.emoji === emoji).length; const active = noteReactions.some((reaction) => reaction.emoji === emoji && reaction.user_id === sessionUserId); return <button key={emoji} type="button" onClick={() => void react(note.id, emoji)} className={`rounded-xl border px-2.5 py-1 text-xs transition ${active ? 'border-[#0A84FF]/70 bg-[#0A84FF]/20 text-white' : 'border-white/10 bg-black/30 text-zinc-300 hover:bg-white/10'}`}>{emoji}{count > 0 && <span className="ml-1">{count}</span>}</button>; })}</div></article>; })}</div>}
  </div>;
};
