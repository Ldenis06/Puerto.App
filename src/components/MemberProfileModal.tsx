import React from 'react';
import { Expense, User } from '../types';
import { Calendar, DollarSign, MapPin, Sparkles, User as UserIcon, X } from 'lucide-react';

interface Props {
  member: User | null;
  currentUser: User | null;
  expenses: Expense[];
  onClose: () => void;
  onSelectAsActiveUser?: (user: User) => void;
}

export const MemberProfileModal: React.FC<Props> = ({
  member,
  currentUser,
  expenses,
  onClose,
  onSelectAsActiveUser,
}) => {
  if (!member) return null;

  const isSelf = currentUser?.id === member.id;

  // Calculate debt relationship between currentUser and this member
  let theyOweMe = 0;
  let iOweThem = 0;

  if (currentUser && !isSelf) {
    expenses.forEach((exp) => {
      if (!exp.isPaid) {
        if (exp.payerId === currentUser.id && exp.participantIds.includes(member.id)) {
          theyOweMe += exp.individualQuota;
        }
        if (exp.payerId === member.id && exp.participantIds.includes(currentUser.id)) {
          iOweThem += exp.individualQuota;
        }
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-zinc-950 border border-white/15 rounded-[26px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative overflow-hidden">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Member Header */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="relative mb-2">
            <img
              src={member.avatarUrl}
              alt={member.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-[#0A84FF] shadow-[0_0_20px_rgba(10,132,255,0.4)] bg-zinc-900"
            />
          </div>

          <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
            {member.name}
            {isSelf && <span className="text-xs text-[#5AC8FA] font-medium">(Tu perfil)</span>}
          </h3>

          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#FF9500]" />
              <span>Cumple: {member.birthday}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#30D158]" />
              <span>{member.location?.isActive ? 'GPS Activo' : 'Offline'}</span>
            </span>
          </div>
        </div>

        {/* Financial relation */}
        {!isSelf && currentUser && (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-3 flex items-center justify-around text-center">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-bold">Te debe</div>
              <div className={`text-sm font-black ${theyOweMe > 0 ? 'text-[#30D158]' : 'text-zinc-500'}`}>
                ${theyOweMe.toLocaleString('es-AR')}
              </div>
            </div>
            <div className="w-[1px] h-6 bg-white/10" />
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-bold">Le debés</div>
              <div className={`text-sm font-black ${iOweThem > 0 ? 'text-[#FF375F]' : 'text-zinc-500'}`}>
                ${iOweThem.toLocaleString('es-AR')}
              </div>
            </div>
          </div>
        )}

        {/* Bio Personal */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 mb-3">
          <div className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 mb-1">
            <UserIcon className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>Bio Personal</span>
          </div>
          <p className="text-xs text-zinc-300 italic">{member.bio || 'Sin biografía personal.'}</p>
        </div>

        {/* Descripción IA */}
        <div className="p-3.5 rounded-2xl bg-[#0A84FF]/10 border border-[#0A84FF]/30 mb-4">
          <div className="text-[11px] font-bold text-[#5AC8FA] flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personalidad IA Integrada</span>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed italic">"{member.aiDescription}"</p>
        </div>

        {/* Switch to this user button (quick testing / session change) */}
        {!isSelf && onSelectAsActiveUser && (
          <button
            type="button"
            onClick={() => {
              onSelectAsActiveUser(member);
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition active:scale-98"
          >
            Cambiar sesión activa a {member.name}
          </button>
        )}
      </div>
    </div>
  );
};
