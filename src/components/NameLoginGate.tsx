import React from 'react';
import { User, UserRoundCheck } from 'lucide-react';
import { PuenteDeLaMujerIcon } from './PuenteDeLaMujerIcon';
import { User as Member } from '../types';

interface Props { users: Member[]; onLogin: (user: Member) => void; }

export const NameLoginGate: React.FC<Props> = ({ users, onLogin }) => (
  <div className="fixed inset-0 z-[60] overflow-y-auto bg-[radial-gradient(circle_at_50%_20%,rgba(10,132,255,0.22),transparent_32%),#000] px-4 py-10">
    <div className="mx-auto flex min-h-full max-w-md items-center justify-center"><section className="w-full rounded-[30px] border border-white/15 bg-zinc-950/95 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.8)]">
      <div className="mb-6 text-center"><div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-black shadow-[0_0_25px_rgba(10,132,255,0.35)]"><PuenteDeLaMujerIcon size={42} /></div><h1 className="text-2xl font-black text-white">Puerto <span className="text-[#0A84FF]">App</span></h1><p className="mt-1 text-sm text-zinc-400">Elegí tu nombre para entrar al grupo.</p></div>
      <div className="grid grid-cols-2 gap-3">{users.map((member) => <button key={member.id} type="button" onClick={() => onLogin(member)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-[#0A84FF]/60 hover:bg-[#0A84FF]/10 active:scale-[0.98]"><img src={member.avatarUrl} alt="" className="h-11 w-11 rounded-full border border-white/15 bg-zinc-900 object-cover" /><span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{member.name}</span><span className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-400"><UserRoundCheck className="h-3 w-3" /> Entrar</span></span></button>)}</div>
      <p className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] leading-relaxed text-zinc-400"><User className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />Este acceso no verifica identidad: cualquiera que abra el enlace puede elegir un nombre. No compartas información sensible.</p>
    </section></div>
  </div>
);
