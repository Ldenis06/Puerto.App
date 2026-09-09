import React, { useState } from 'react';
import { RouletteMode, RouletteResult, RouletteTeam, User } from '../../types';
import confetti from 'canvas-confetti';
import { Check, Dices, RotateCcw, Share2, Sparkles, Users } from 'lucide-react';

interface Props {
  users: User[];
  onSaveResult?: (result: RouletteResult) => void;
  initialResult?: RouletteResult | null;
}

export const RuletaTab: React.FC<Props> = ({ users, onSaveResult, initialResult }) => {
  // Presence toggles: all 6 present by default
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    users.forEach((u) => {
      initial[u.id] = true;
    });
    return initial;
  });

  const [mode, setMode] = useState<RouletteMode>('pairs');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDegrees, setSpinDegrees] = useState(0);
  const [activeHighlightName, setActiveHighlightName] = useState<string>('');
  const [result, setResult] = useState<RouletteResult | null>(initialResult || null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const activeUsers = users.filter((u) => presentMap[u.id]);

  const togglePresent = (userId: string) => {
    setPresentMap((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleSelectAll = (select: boolean) => {
    const next: Record<string, boolean> = {};
    users.forEach((u) => {
      next[u.id] = select;
    });
    setPresentMap(next);
  };

  // Fisher-Yates shuffle
  const shuffleArray = (arr: User[]): User[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const spinRoulette = () => {
    if (activeUsers.length === 0) return;
    setIsSpinning(true);
    setResult(null);

    // Dynamic spinning degrees
    const extraRotations = 5 + Math.floor(Math.random() * 5);
    const targetDeg = spinDegrees + extraRotations * 360 + Math.floor(Math.random() * 360);
    setSpinDegrees(targetDeg);

    // Rapid name flashing animation
    let counter = 0;
    const interval = setInterval(() => {
      const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
      setActiveHighlightName(randomUser.name);
      counter++;
      if (counter > 25) {
        clearInterval(interval);
      }
    }, 70);

    setTimeout(() => {
      // Form teams based on specified mode with flexible substitutes (suplentes)
      const shuffled = shuffleArray(activeUsers);

      let teams: RouletteTeam[] = [];

      if (mode === 'solo') {
        // Individual selection: 1 lucky chosen member or ranked order
        const winner = shuffled[0];
        teams = [
          {
            name: 'Elegido Oficial',
            members: [winner.id],
          },
        ];
        if (shuffled.length > 1) {
          const restIds = shuffled.slice(1).map((u) => u.id);
          teams.push({
            name: 'Suplentes / Resto',
            members: restIds,
            substituteIds: restIds,
          });
        }
      } else if (mode === 'trios') {
        // Modo: Equipos de 3 (Con suplente)
        const total = shuffled.length;
        if (total === 5) {
          // Requerimiento exacto: Equipo A con 2 integrantes, Equipo B con 3 integrantes y suplente subrayado
          const teamAMembers = [shuffled[0].id, shuffled[1].id];
          const teamBMembers = [shuffled[2].id, shuffled[3].id, shuffled[4].id];
          const suplenteId = shuffled[4].id;

          teams = [
            {
              name: 'Equipo A',
              members: teamAMembers,
            },
            {
              name: 'Equipo B',
              members: teamBMembers,
              substituteIds: [suplenteId],
            },
          ];
        } else if (total === 6) {
          // 6 jugadores: dos equipos limpios de 3 vs 3 (sin suplente)
          teams = [
            {
              name: 'Equipo A',
              members: [shuffled[0].id, shuffled[1].id, shuffled[2].id],
            },
            {
              name: 'Equipo B',
              members: [shuffled[3].id, shuffled[4].id, shuffled[5].id],
            },
          ];
        } else if (total <= 4) {
          // 4 o menos jugadores
          const half = Math.ceil(total / 2);
          const teamAMembers = shuffled.slice(0, half).map((u) => u.id);
          const teamBMembers = shuffled.slice(half).map((u) => u.id);
          teams = [
            { name: 'Equipo A', members: teamAMembers },
            {
              name: 'Equipo B',
              members: teamBMembers,
              substituteIds: total === 3 && teamBMembers.length > 0 ? [teamBMembers[teamBMembers.length - 1]] : undefined,
            },
          ];
        } else {
          // Más de 6 jugadores: dos equipos proporcionales con suplente rotativo
          const half = Math.floor(total / 2);
          const teamAMembers = shuffled.slice(0, half).map((u) => u.id);
          const teamBMembers = shuffled.slice(half).map((u) => u.id);
          const suplenteId = teamBMembers[teamBMembers.length - 1];
          teams = [
            { name: 'Equipo A', members: teamAMembers },
            { name: 'Equipo B', members: teamBMembers, substituteIds: [suplenteId] },
          ];
        }
      } else {
        // mode === 'pairs' (Equipos de 2 / Parejas)
        const total = shuffled.length;
        if (total === 5) {
          // Con 5 jugadores en parejas: se arman 2 equipos (Equipo A con 2, Equipo B con 3 y suplente subrayado)
          teams = [
            {
              name: 'Equipo A',
              members: [shuffled[0].id, shuffled[1].id],
            },
            {
              name: 'Equipo B',
              members: [shuffled[2].id, shuffled[3].id, shuffled[4].id],
              substituteIds: [shuffled[4].id],
            },
          ];
        } else if (total === 6) {
          // 3 parejas limpias
          teams = [
            { name: 'Pareja A', members: [shuffled[0].id, shuffled[1].id] },
            { name: 'Pareja B', members: [shuffled[2].id, shuffled[3].id] },
            { name: 'Pareja C', members: [shuffled[4].id, shuffled[5].id] },
          ];
        } else {
          const numPairs = Math.floor(total / 2);
          const pairTeams: RouletteTeam[] = [];
          for (let p = 0; p < numPairs; p++) {
            pairTeams.push({
              name: `Pareja ${String.fromCharCode(65 + p)}`,
              members: [shuffled[p * 2].id, shuffled[p * 2 + 1].id],
            });
          }
          if (total % 2 !== 0 && pairTeams.length > 0) {
            const surplusId = shuffled[total - 1].id;
            pairTeams[pairTeams.length - 1].members.push(surplusId);
            pairTeams[pairTeams.length - 1].substituteIds = [surplusId];
          }
          teams = pairTeams;
        }
      }

      const newResult: RouletteResult = {
        id: `spin-${Date.now()}`,
        mode,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        teams,
      };

      setResult(newResult);
      setIsSpinning(false);
      if (onSaveResult) {
        onSaveResult(newResult);
      }

      // Trigger iOS celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0A84FF', '#5AC8FA', '#30D158', '#FF9500'],
      });
    }, 2200);
  };

  const copyResults = () => {
    if (!result) return;
    let text = `🎲 *SORTEO PUERTO APP (${result.mode.toUpperCase()})* - ${result.date}\n`;
    result.teams.forEach((t) => {
      const names = t.members
        .map((mId) => {
          const u = users.find((usr) => usr.id === mId);
          const name = u?.name || mId;
          const isSub = t.substituteIds?.includes(mId);
          return isSub ? `${name} (SUPLENTE)` : name;
        })
        .join(', ');
      text += `👉 *${t.name}*: ${names}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      {/* Page Title Card */}
      <div className="p-4 rounded-[26px] bg-white/[0.04] border border-white/10 backdrop-blur-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Dices className="w-5 h-5 text-[#0A84FF]" />
            <span>Ruleta de Equipos</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sorteo balanceado: 3 vs 3 (o 2 vs 3 con suplente subrayado si son 5 presentes)
          </p>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-[#0A84FF]/15 border border-[#0A84FF]/30 text-xs font-semibold text-[#5AC8FA]">
          {activeUsers.length} presentes
        </div>
      </div>

      {/* Mode Selector Segmented Control (iOS style) */}
      <div className="p-1 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center">
        <button
          id="mode-btn-pairs"
          type="button"
          onClick={() => setMode('pairs')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
            mode === 'pairs'
              ? 'bg-[#0A84FF] text-white shadow-[0_2px_10px_rgba(10,132,255,0.4)]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Equipos de 2
        </button>
        <button
          id="mode-btn-trios"
          type="button"
          onClick={() => setMode('trios')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
            mode === 'trios'
              ? 'bg-[#0A84FF] text-white shadow-[0_2px_10px_rgba(10,132,255,0.4)]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Equipos de 3
        </button>
        <button
          id="mode-btn-solo"
          type="button"
          onClick={() => setMode('solo')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
            mode === 'solo'
              ? 'bg-[#0A84FF] text-white shadow-[0_2px_10px_rgba(10,132,255,0.4)]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          1 Integrante
        </button>
      </div>

      {/* Control de Presentes (Toggles) */}
      <div className="p-4 rounded-[26px] bg-white/[0.04] border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>Control de Presentes ({activeUsers.length}/6)</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-[11px] text-[#5AC8FA] hover:underline font-medium"
            >
              Todos
            </button>
            <span className="text-zinc-600">•</span>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 font-medium"
            >
              Ninguno
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {users.map((u) => {
            const isPresent = presentMap[u.id];
            return (
              <button
                key={u.id}
                id={`toggle-present-${u.id}`}
                type="button"
                onClick={() => togglePresent(u.id)}
                className={`flex items-center justify-between p-2 rounded-[16px] border transition-all duration-150 active:scale-95 text-left ${
                  isPresent
                    ? 'bg-white/10 border-[#0A84FF]/50 text-white'
                    : 'bg-black/40 border-white/5 text-zinc-500 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={u.avatarUrl}
                    alt={u.name}
                    className={`w-7 h-7 rounded-full object-cover border shrink-0 ${
                      isPresent ? 'border-[#0A84FF]' : 'border-zinc-700'
                    }`}
                  />
                  <span className="text-xs font-semibold truncate">{u.name}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1.5 ${
                    isPresent ? 'bg-[#0A84FF] text-white' : 'bg-zinc-800 text-transparent'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Spinning Wheel & Action Button */}
      <div className="p-6 rounded-[26px] bg-gradient-to-b from-white/[0.06] to-black/60 border border-white/10 text-center relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#0A84FF]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Dynamic Spinning Disc Visual */}
        <div className="relative w-44 h-44 mx-auto mb-5 flex items-center justify-center">
          <div
            className="w-full h-full rounded-full border-4 border-dashed border-[#0A84FF]/60 flex items-center justify-center transition-transform duration-[2200ms] ease-out shadow-[0_0_30px_rgba(10,132,255,0.25)]"
            style={{ transform: `rotate(${spinDegrees}deg)` }}
          >
            <div className="w-32 h-32 rounded-full bg-zinc-950 border border-white/15 flex items-center justify-center">
              <Dices
                className={`w-12 h-12 text-[#5AC8FA] transition-transform ${
                  isSpinning ? 'animate-spin' : ''
                }`}
              />
            </div>
          </div>

          {/* Center Indicator Pin */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-6 bg-[#FF375F] clip-triangle shadow-lg z-10" />

          {/* Flashing current candidate */}
          {isSpinning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full backdrop-blur-xs">
              <span className="text-lg font-black text-white animate-pulse tracking-wide">
                {activeHighlightName || 'Sorteando...'}
              </span>
            </div>
          )}
        </div>

        {/* Spin Button */}
        <button
          id="btn-spin-roulette"
          type="button"
          onClick={spinRoulette}
          disabled={isSpinning || activeUsers.length === 0}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] hover:opacity-95 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(10,132,255,0.5)] transition disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSpinning ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Mezclando integrantes...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>GIRAR RULETA ({activeUsers.length} EN JUEGO)</span>
            </>
          )}
        </button>

        {activeUsers.length === 0 && (
          <p className="text-xs text-[#FF375F] mt-2">
            Seleccioná al menos un integrante presente para girar.
          </p>
        )}
      </div>

      {/* Sorteo Result Showcase */}
      {result && (
        <div className="p-5 rounded-[26px] bg-white/[0.05] border border-white/15 backdrop-blur-xl animate-scaleUp">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] text-[#5AC8FA] font-black uppercase tracking-widest bg-[#0A84FF]/20 px-2 py-0.5 rounded-md">
                Resultado Oficial • {result.date}
              </span>
              <h3 className="text-base font-extrabold text-white mt-1">Equipos Formados</h3>
            </div>
            <button
              id="btn-copy-teams"
              type="button"
              onClick={copyResults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white border border-white/10 active:scale-95 transition"
            >
              <Share2 className="w-3.5 h-3.5 text-[#5AC8FA]" />
              <span>{copiedNotification ? '¡Copiado!' : 'Compartir'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {result.teams.map((team, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-[20px] bg-zinc-950/70 border border-white/10 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        team.substituteIds && team.substituteIds.length > 0
                          ? 'bg-[#FF9500]'
                          : 'bg-[#0A84FF]'
                      }`}
                    />
                    {team.name}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                    <span>{team.members.length} {team.members.length === 1 ? 'jugador' : 'jugadores'}</span>
                    {team.substituteIds && team.substituteIds.length > 0 && (
                      <span className="text-amber-400 font-semibold">• con suplente</span>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {team.members.map((mId) => {
                    const memberUser = users.find((u) => u.id === mId);
                    if (!memberUser) return null;
                    const isSubstitute = team.substituteIds?.includes(mId);

                    return (
                      <div
                        key={mId}
                        className={`flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border transition-all ${
                          isSubstitute
                            ? 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <img
                          src={memberUser.avatarUrl}
                          alt={memberUser.name}
                          className={`w-6 h-6 rounded-full object-cover border ${
                            isSubstitute ? 'border-amber-400' : 'border-white/20'
                          }`}
                        />
                        <span
                          className={`text-xs ${
                            isSubstitute
                              ? 'font-bold text-amber-200 underline decoration-amber-400 decoration-2 underline-offset-4'
                              : 'font-semibold text-zinc-200'
                          }`}
                        >
                          {memberUser.name}
                        </span>
                        {isSubstitute && (
                          <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-amber-400 text-black shadow-xs">
                            Suplente
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-zinc-500 text-center mt-4">
            Balanceado con algoritmo Fisher-Yates: 2 equipos oficiales con suplente rotativo subrayado.
          </p>
        </div>
      )}
    </div>
  );
};
