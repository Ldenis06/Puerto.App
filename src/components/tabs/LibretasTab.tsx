import React, { useEffect, useState } from 'react';
import { BookOpenText, LoaderCircle, Send } from 'lucide-react';
import { NotebookNote } from '../../types';
import { getNotebookNotes, publishNotebookNote } from '../../services/supabase';

interface Props { isDenis: boolean; }

export const LibretasTab: React.FC<Props> = ({ isDenis }) => {
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [password, setPassword] = useState('');
  const [publishing, setPublishing] = useState(false);

  const refresh = async () => {
    try { setError(null); setNotes(await getNotebookNotes()); }
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
      setDraft(''); setPassword('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo publicar la nota.'); }
    finally { setPublishing(false); }
  };

  return <div className="space-y-4 pb-24 animate-fadeIn">
    <section className="rounded-[26px] border border-white/10 bg-gradient-to-br from-[#0A84FF]/15 to-zinc-950 p-5">
      <div className="flex items-center gap-3"><div className="rounded-2xl bg-[#0A84FF]/20 p-3 text-[#5AC8FA]"><BookOpenText className="h-6 w-6" /></div><div><h2 className="text-lg font-black text-white">Libretas</h2><p className="text-xs text-zinc-400">Notas y novedades del grupo.</p></div></div>
    </section>

    {isDenis && <form onSubmit={publish} className="space-y-3 rounded-[26px] border border-[#0A84FF]/35 bg-white/[0.04] p-4"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={4} placeholder="Escribí una nota para el grupo..." className="w-full resize-none rounded-2xl border border-white/15 bg-black/60 p-3 text-sm text-white outline-none focus:border-[#0A84FF]" /><div className="flex flex-col gap-2 sm:flex-row"><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Contraseña" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/60 px-3 py-2.5 text-sm text-white outline-none focus:border-[#0A84FF]" /><button type="submit" disabled={publishing || !draft.trim() || !password} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0A84FF] px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{publishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publicar</button></div></form>}

    {error && <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}
    {loading ? <div className="flex justify-center py-10 text-zinc-400"><LoaderCircle className="h-6 w-6 animate-spin" /></div> : notes.length === 0 ? <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-8 text-center"><BookOpenText className="mx-auto mb-3 h-9 w-9 text-zinc-500" /><p className="text-sm font-bold text-white">Todavía no hay publicaciones</p></div> : <div className="space-y-3">{notes.map((note) => <article key={note.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#5AC8FA]">{note.author_name}</span><time className="text-[10px] text-zinc-500">{new Date(note.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</time></div><p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{note.body}</p></article>)}</div>}
  </div>;
};
