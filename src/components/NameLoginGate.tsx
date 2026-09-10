import React, { useState } from 'react';
import { KeyRound, ShieldCheck, User, UserRoundCheck } from 'lucide-react';
import { PuenteDeLaMujerIcon } from './PuenteDeLaMujerIcon';
import { User as Member } from '../types';

interface Props { users: Member[]; onLogin: (user: Member, password?: string) => Promise<boolean>; }

export const NameLoginGate: React.FC<Props> = ({ users, onLogin }) => {
  const [protectedMember, setProtectedMember] = useState<Member | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const selectMember = async (member: Member) => {
    if (member.id === 'denis') { setProtectedMember(member); setPassword(''); setError(null); return; }
    await onLogin(member);
  };
  const submitDenis = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!protectedMember) return;
    if (!await onLogin(protectedMember, password)) setError('La contraseña no es correcta.');
  };
  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-[radial-gradient(circle_at_50%_20%,rgba(10,132,255,0.22),transparent_32%),#000] px-4 py-10">
    <div className="mx-auto flex min-h-full max-w-md items-center justify-center"><section className="w-full rounded-[30px] border border-white/15 bg-zinc-950/95 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.8)]">
      <div className="mb-6 text-center"><div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-black shadow-[0_0_25px_rgba(10,132,255,0.35)]"><PuenteDeLaMujerIcon size={42} /></div><h1 className="text-2xl font-black text-white">Puerto <span className="text-[#0A84FF]">App</span></h1><p className="mt-1 text-sm text-zinc-400">Elegí tu nombre para entrar al grupo.</p></div>
      <div className="grid grid-cols-2 gap-3">{users.map((member) => <button key={member.id} type="button" onClick={() => selectMember(member)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-[#0A84FF]/60 hover:bg-[#0A84FF]/10 active:scale-[0.98]"><img src={member.avatarUrl} alt="" className="h-11 w-11 rounded-full border border-white/15 bg-zinc-900 object-cover" /><span className="min-w-0"><span className="flex items-center gap-1 truncate text-sm font-bold text-white">{member.name}{member.id === 'denis' && <ShieldCheck className="h-3.5 w-3.5 text-[#5AC8FA]" />}</span><span className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-400"><UserRoundCheck className="h-3 w-3" /> Entrar</span></span></button>)}</div>
      <p className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] leading-relaxed text-zinc-400"><User className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />Los perfiles comunes se eligen por nombre. Denis requiere contraseña para habilitar la administración.</p>
    </section></div>
    {protectedMember && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><form onSubmit={submitDenis} className="w-full max-w-sm rounded-[26px] border border-[#0A84FF]/35 bg-zinc-950 p-5 shadow-2xl"><div className="mb-4 flex items-center gap-3"><img src={protectedMember.avatarUrl} alt="" className="h-12 w-12 rounded-full border border-[#0A84FF]/50" /><div><h2 className="font-black text-white">Acceso de Denis</h2><p className="text-xs text-zinc-400">Ingresá la contraseña para habilitar administración.</p></div></div><label className="mb-1.5 block text-xs font-semibold text-zinc-300" htmlFor="denis-password">Contraseña</label><div className="relative"><KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-500" /><input id="denis-password" type="password" autoFocus value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} className="w-full rounded-xl border border-white/20 bg-black py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-[#0A84FF]" /></div>{error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}<div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setProtectedMember(null)} className="rounded-xl border border-white/15 py-2.5 text-xs font-bold text-zinc-300">Cancelar</button><button type="submit" className="rounded-xl bg-[#0A84FF] py-2.5 text-xs font-bold text-white">Entrar</button></div></form></div>}
  </div>;
};
