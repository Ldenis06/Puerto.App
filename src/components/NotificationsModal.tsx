import React from 'react';
import { BirthdayNotification, ProximityAlert, User } from '../types';
import { Bell, Calendar, Gift, Radio, Sparkles, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  alerts: ProximityAlert[];
  birthdayAlert: {
    isCelebrant: boolean;
    celebrantName: string;
    message: string;
    todayFormatted: string;
  } | null;
  users: User[];
  onSimulateBirthday: (day: number, month: number) => void;
  onResetBirthday: () => void;
  simulatedDate: { day: number; month: number } | null;
}

export const NotificationsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  alerts,
  birthdayAlert,
  users,
  onSimulateBirthday,
  onResetBirthday,
  simulatedDate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-zinc-950 border border-white/15 rounded-[26px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#0A84FF]" />
            <h3 className="text-base font-bold text-white">Notificaciones Privadas</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Cumpleaños Section */}
          <div className="p-4 rounded-[22px] bg-white/[0.04] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Gift className="w-4 h-4 text-[#FF9500]" />
                <span>Alerta Privada de Cumpleaños</span>
              </div>
              {simulatedDate && (
                <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded">
                  Simulado ({simulatedDate.day}/{simulatedDate.month})
                </span>
              )}
            </div>

            {birthdayAlert ? (
              <div
                className={`p-3.5 rounded-xl border ${
                  birthdayAlert.isCelebrant
                    ? 'bg-gradient-to-r from-[#FF9500]/20 to-[#FF375F]/20 border-[#FF9500]/50 text-white'
                    : 'bg-[#0A84FF]/10 border-[#0A84FF]/30 text-white'
                }`}
              >
                <div className="text-xs font-extrabold flex items-center gap-1.5 mb-1">
                  <span>🎂 {birthdayAlert.isCelebrant ? '¡Es tu cumpleaños!' : 'Aviso Privado'}</span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-200">{birthdayAlert.message}</p>
                <div className="text-[10px] text-zinc-400 mt-2">
                  Notificación enviada individualmente. Sin muros ni chats públicos.
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                Hoy no coincide con el cumpleaños de ningún integrante registrado.
              </p>
            )}

            {/* Quick Birthday Simulator to test both perspectives */}
            <div className="pt-2 border-t border-white/5">
              <div className="text-[10px] text-zinc-400 font-semibold mb-1.5 uppercase tracking-wider">
                Simular fecha para probar alerta:
              </div>
              <div className="grid grid-cols-3 gap-1">
                {users.map((u) => {
                  const [day, month] = u.birthday.split('/').map(Number);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onSimulateBirthday(day, month)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300 hover:text-white border border-white/5 text-center truncate"
                      title={`Simular cumpleaños de ${u.name} (${u.birthday})`}
                    >
                      {u.name} ({u.birthday})
                    </button>
                  );
                })}
              </div>
              {simulatedDate && (
                <button
                  type="button"
                  onClick={onResetBirthday}
                  className="w-full mt-2 py-1 text-[10px] text-zinc-400 hover:text-white underline"
                >
                  Restablecer a fecha real de hoy
                </button>
              )}
            </div>
          </div>

          {/* Proximity Alerts Section */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
              Geofencing en Vivo (≤ 50m)
            </div>

            {alerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-zinc-500">
                No hay alertas de proximidad activas en este instante.
              </div>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl bg-zinc-900 border border-white/10 flex items-start gap-2.5"
                >
                  <Radio className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-white">{a.text}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{a.timestamp}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
