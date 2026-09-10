import React, { useRef, useState } from 'react';
import { Camera, Check, Save, Sparkles, Upload, User as UserIcon } from 'lucide-react';
import { User } from '../../types';

interface Props { currentUser: User | null; onUpdateUser: (updatedUser: User) => void; }

export const PerfilTab: React.FC<Props> = ({ currentUser, onUpdateUser }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [personalBio, setPersonalBio] = useState(currentUser?.bio || '');
  const [saved, setSaved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  if (!currentUser) return null;
  const updateAvatar = (file: File) => {
    setAvatarError(null);
    if (!file.type.startsWith('image/')) return setAvatarError('Elegí una imagen válida.');
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        const ratio = Math.min(256 / image.width, 256 / image.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        onUpdateUser({ ...currentUser, avatarUrl: canvas.toDataURL('image/jpeg', 0.75) });
      };
      image.onerror = () => setAvatarError('No se pudo procesar la imagen.'); image.src = String(event.target?.result || '');
    };
    reader.readAsDataURL(file);
  };
  const saveBio = (event: React.FormEvent) => { event.preventDefault(); onUpdateUser({ ...currentUser, bio: personalBio.trim().slice(0, 280) }); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  return <div className="space-y-4 pb-24 animate-fadeIn">
    <section className="relative overflow-hidden rounded-[26px] border border-white/15 bg-gradient-to-b from-white/[0.06] to-zinc-950/80 p-5 text-center backdrop-blur-xl">
      <div className="relative mx-auto mb-3 w-24"><div className="h-24 w-24 rounded-full bg-gradient-to-tr from-[#0A84FF] to-[#5AC8FA] p-1 shadow-[0_0_20px_rgba(10,132,255,0.4)]"><img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full rounded-full bg-black object-cover" /></div><div className="absolute bottom-0 right-0 flex gap-1"><button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full border-2 border-black bg-[#0A84FF] p-2 text-white" title="Subir foto"><Upload className="h-3.5 w-3.5" /></button><button type="button" onClick={() => cameraInputRef.current?.click()} className="rounded-full border-2 border-black bg-zinc-800 p-2 text-white" title="Tomar foto"><Camera className="h-3.5 w-3.5" /></button></div><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && updateAvatar(event.target.files[0])} /><input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(event) => event.target.files?.[0] && updateAvatar(event.target.files[0])} /></div>
      <h2 className="text-xl font-extrabold text-white">{currentUser.name}</h2><p className="mt-1 text-xs text-zinc-400">🎂 Cumpleaños: {currentUser.birthday} <span className="px-1">•</span> 📍 Puerto Madero</p>{avatarError && <p className="mt-3 text-xs text-red-300">{avatarError}</p>}
    </section>
    <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-bold text-white"><UserIcon className="h-4 w-4 text-[#0A84FF]" /> Bio personal</span><span className="text-[10px] text-zinc-500">{personalBio.length}/280</span></div><form onSubmit={saveBio} className="space-y-2.5"><textarea maxLength={280} rows={3} value={personalBio} onChange={(event) => setPersonalBio(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/60 p-3 text-xs leading-relaxed text-white outline-none focus:border-[#0A84FF]" placeholder="Escribí unas palabras sobre vos..." /><div className="flex justify-end"><button type="submit" className="flex items-center gap-1.5 rounded-xl bg-[#0A84FF] px-3 py-1.5 text-xs font-bold text-white">{saved ? <><Check className="h-3.5 w-3.5" /> Guardado</> : <><Save className="h-3.5 w-3.5" /> Guardar bio</>}</button></div></form></section>
    <section className="rounded-[26px] border border-[#0A84FF]/30 bg-[#0A84FF]/10 p-4"><div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#5AC8FA]"><Sparkles className="h-4 w-4" /> Descripción IA</div><p className="rounded-xl border border-white/10 bg-black/50 p-3 text-xs italic leading-relaxed text-zinc-200">“{currentUser.aiDescription}”</p><p className="mt-2 text-[10px] text-zinc-500">La descripción del grupo se modifica desde el código de la app.</p></section>
  </div>;
};
