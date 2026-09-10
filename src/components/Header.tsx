import React from 'react';
import { User, ProximityAlert } from '../types';
import { PuenteDeLaMujerIcon } from './PuenteDeLaMujerIcon';
import { Bell, UserCheck } from 'lucide-react';

interface Props {
  currentUser: User | null;
  users: User[];
  alerts: ProximityAlert[];
  onSelectMember: (user: User) => void;
  onOpenNotifications: () => void;
  todayBirthdayMember?: User | null;
}

export const Header: React.FC<Props> = ({
  currentUser,
  users,
  alerts,
  onSelectMember,
  onOpenNotifications,
  todayBirthdayMember,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-2xl border-b border-white/10 shadow-2xl">
      {/* Top Brand Bar */}
      <div className="max-w-xl mx-auto px-4 pt-3 pb-2 flex items-center justify-between">
        {/* Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-xl bg-black border border-white/15 shadow-[0_0_15px_rgba(10,132,255,0.35)]">
            <PuenteDeLaMujerIcon size={32} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-1 leading-none">
              <span className="text-white font-extrabold">Puerto</span>
              <span className="bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] bg-clip-text text-transparent font-black tracking-wide">
                App
              </span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-medium tracking-wide flex items-center gap-1 mt-0.5">
              <span>Puerto Madero • 6 Integrantes</span>
            </p>
          </div>
        </div>

        {/* User Session Pill & Notifications */}
        <div className="flex items-center gap-2">
          {/* Notification icon with badge */}
          <button
            id="notifications-button"
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 transition text-zinc-300"
            aria-label="Ver notificaciones privadas"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF375F] text-[9px] font-bold text-white rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_#FF375F]">
                {alerts.length}
              </span>
            )}
          </button>

          {/* Fixed active profile */}
          <div
            id="user-session-pill"
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-left"
          >
            {currentUser ? (
              <>
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover border border-white/20 bg-zinc-800"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#30D158] rounded-full border border-black" />
                </div>
                <div className="leading-tight pr-1">
                  <div className="text-xs font-semibold text-white flex items-center gap-1">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-zinc-400">Tu perfil</div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 text-xs text-zinc-300">
                <UserCheck className="w-4 h-4 text-[#0A84FF]" />
                <span>Ingresar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Member Avatars Horizontal Carousel (Home Header) */}
      <div className="max-w-xl mx-auto px-3 pb-2.5 pt-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-3 min-w-max px-1">
          {users.map((u) => {
            const isCurrent = currentUser?.id === u.id;
            const isBday = todayBirthdayMember?.id === u.id;
            const hasGps = u.location?.isActive;

            return (
              <button
                key={u.id}
                id={`carousel-avatar-${u.id}`}
                type="button"
                onClick={() => onSelectMember(u)}
                className={`flex flex-col items-center gap-1 group transition-all duration-200 active:scale-95 ${
                  isCurrent ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                }`}
              >
                <div className="relative">
                  {/* Glowing ring for active user or birthday */}
                  <div
                    className={`w-12 h-12 rounded-full p-[2px] transition ${
                      isBday
                        ? 'bg-gradient-to-tr from-[#FF9500] via-[#FFD60A] to-[#FF375F] shadow-[0_0_12px_rgba(255,149,0,0.5)]'
                        : isCurrent
                        ? 'bg-gradient-to-tr from-[#0A84FF] to-[#5AC8FA] shadow-[0_0_12px_rgba(10,132,255,0.4)]'
                        : hasGps
                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-400'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <img
                      src={u.avatarUrl}
                      alt={u.name}
                      className="w-full h-full rounded-full object-cover bg-zinc-900"
                    />
                  </div>

                  {/* Birthday crown indicator */}
                  {isBday && (
                    <span className="absolute -top-1.5 -right-1 text-xs animate-bounce" title="¡Cumpleañero!">
                      🎂
                    </span>
                  )}

                  {/* Live GPS badge */}
                  {hasGps && (
                    <span
                      className="absolute bottom-0 right-0 w-3 h-3 bg-[#30D158] rounded-full border-2 border-black"
                      title="Ubicación activa"
                    />
                  )}
                </div>

                <span
                  className={`text-[11px] font-medium leading-none tracking-tight ${
                    isCurrent ? 'text-white font-bold' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                >
                  {u.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
