import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Play, RotateCcw, ShieldAlert, UserCheck, UsersRound } from 'lucide-react';
import { User } from '../../types';

const FOOTBALLERS = [
  'Lionel Messi', 'Cristiano Ronaldo', 'Diego Maradona', 'Pelé', 'Neymar', 'Kylian Mbappé',
  'Vinícius Júnior', 'Erling Haaland', 'Ronaldinho', 'Zinedine Zidane', 'Andrés Iniesta', 'Xavi Hernández',
  'Luka Modrić', 'Karim Benzema', 'Robert Lewandowski', 'Sergio Ramos', 'Ángel Di María', 'Lautaro Martínez',
  'Julián Álvarez', 'Paulo Dybala', 'Kevin De Bruyne', 'Mohamed Salah', 'Harry Kane', 'Jude Bellingham',
  'Antoine Griezmann', 'Rodri', 'Manuel Neuer', 'Gianluigi Buffon', 'David Beckham', 'Ronaldo Nazário',
];

type Stage = 'setup' | 'handoff' | 'complete';

interface Round {
  word: string;
  players: User[];
  impostorIds: Set<string>;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export const ImpostorTab: React.FC<{ users: User[] }> = ({ users }) => {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(users.map((user) => [user.id, true])));
  const [impostorCount, setImpostorCount] = useState(1);
  const [stage, setStage] = useState<Stage>('setup');
  const [round, setRound] = useState<Round | null>(null);
  const [turn, setTurn] = useState(0);
  const [roleVisible, setRoleVisible] = useState(false);

  const selectedPlayers = useMemo(() => users.filter((user) => selected[user.id]), [selected, users]);
  const maxImpostors = Math.max(1, Math.min(3, selectedPlayers.length - 1));
  const currentPlayer = round?.players[turn] || null;

  const togglePlayer = (id: string) => setSelected((current) => ({ ...current, [id]: !current[id] }));

  const startRound = () => {
    if (selectedPlayers.length < 2) return;
    const players = shuffle<User>(selectedPlayers);
    const count = Math.min(impostorCount, players.length - 1);
    setRound({ word: FOOTBALLERS[Math.floor(Math.random() * FOOTBALLERS.length)], players, impostorIds: new Set(players.slice(0, count).map((user) => user.id)) });
    setTurn(0);
    setRoleVisible(false);
    setStage('handoff');
  };

  const passToNext = () => {
    if (!round) return;
    if (turn >= round.players.length - 1) {
      setRoleVisible(false);
      setStage('complete');
      return;
    }
    setTurn((current) => current + 1);
    setRoleVisible(false);
  };

  const resetGame = () => {
    setRound(null);
    setStage('setup');
    setTurn(0);
    setRoleVisible(false);
  };

  return <div className="space-y-4 pb-24 animate-fadeIn">
    <section className="overflow-hidden rounded-[26px] border border-rose-400/30 bg-gradient-to-br from-rose-500/15 via-zinc-950 to-violet-500/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div><div className="flex items-center gap-2 text-lg font-extrabold text-white"><ShieldAlert className="h-5 w-5 text-rose-300" /> Juego del Impostor</div><p className="mt-1 text-xs leading-relaxed text-zinc-300">Descubran quién no recibió el nombre del jugador.</p></div>
        <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-zinc-200">30 jugadores</span>
      </div>
    </section>

    {stage === 'setup' && <>
      <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300"><UsersRound className="h-4 w-4 text-[#0A84FF]" /> Jugadores ({selectedPlayers.length}/{users.length})</div><div className="flex gap-2 text-[11px] font-semibold"><button type="button" onClick={() => setSelected(Object.fromEntries(users.map((user) => [user.id, true])))} className="text-[#5AC8FA]">Todos</button><button type="button" onClick={() => setSelected(Object.fromEntries(users.map((user) => [user.id, false])))} className="text-zinc-400">Ninguno</button></div></div>
        <div className="grid grid-cols-2 gap-2">
          {users.map((user) => <button key={user.id} type="button" onClick={() => togglePlayer(user.id)} className={`flex items-center gap-2 rounded-2xl border p-2 text-left transition ${selected[user.id] ? 'border-[#0A84FF]/50 bg-[#0A84FF]/10' : 'border-white/10 bg-black/30 opacity-55'}`}><img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full bg-zinc-800 object-cover" /><span className="min-w-0 flex-1 truncate text-xs font-bold text-white">{user.name}</span>{selected[user.id] && <UserCheck className="h-4 w-4 shrink-0 text-[#5AC8FA]" />}</button>)}
        </div>
      </section>
      <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
        <label htmlFor="impostor-count" className="text-xs font-bold text-white">Cantidad de impostores</label><p className="mt-1 text-[11px] leading-relaxed text-zinc-400">La palabra se reparte a todos los demás jugadores.</p>
        <select id="impostor-count" value={Math.min(impostorCount, maxImpostors)} onChange={(event) => setImpostorCount(Number(event.target.value))} className="mt-3 w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[#0A84FF]">{Array.from({ length: maxImpostors }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? 'impostor' : 'impostores'}</option>)}</select>
      </section>
      <button type="button" onClick={startRound} disabled={selectedPlayers.length < 2} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-[#FF375F] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_0_25px_rgba(255,55,95,0.35)] transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"><Play className="h-4 w-4 fill-current" /> EMPEZAR REPARTO SECRETO</button>
      {selectedPlayers.length < 2 && <p className="text-center text-xs text-rose-300">Elegí al menos 2 jugadores para comenzar.</p>}
    </>}

    {stage === 'handoff' && currentPlayer && <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 text-center backdrop-blur-xl">
      <span className="inline-flex rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300">Jugador {turn + 1} de {round?.players.length}</span>
      {!roleVisible ? <><img src={currentPlayer.avatarUrl} alt="" className="mx-auto mt-5 h-20 w-20 rounded-full border-2 border-[#0A84FF]/60 bg-zinc-800 object-cover" /><h2 className="mt-3 text-xl font-extrabold text-white">{currentPlayer.name}</h2><p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-zinc-400">Tomá el celular. Cuando nadie más mire, tocá para ver tu rol.</p><button type="button" onClick={() => setRoleVisible(true)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0A84FF] py-3.5 text-sm font-bold text-white"><Eye className="h-4 w-4" /> VER MI ROL</button></> : <>{round?.impostorIds.has(currentPlayer.id) ? <div className="mt-5 rounded-[22px] border border-rose-400/45 bg-rose-500/10 p-6"><ShieldAlert className="mx-auto h-9 w-9 text-rose-300" /><p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-rose-200">Tu rol</p><p className="mt-1 text-4xl font-black text-rose-300">IMPOSTOR</p><p className="mt-3 text-xs leading-relaxed text-zinc-300">No conocés el jugador. Escuchá las pistas y tratá de pasar desapercibido.</p></div> : <div className="mt-5 rounded-[22px] border border-emerald-400/40 bg-emerald-500/10 p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">La palabra es</p><p className="mt-2 text-3xl font-black text-white">{round?.word}</p><p className="mt-3 text-xs leading-relaxed text-zinc-300">Después, decí una pista sin nombrarlo directamente.</p></div>}<button type="button" onClick={passToNext} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-zinc-900 py-3.5 text-sm font-bold text-white"><EyeOff className="h-4 w-4" /> {turn === (round?.players.length || 1) - 1 ? 'OCULTAR Y TERMINAR REPARTO' : 'OCULTAR Y PASAR EL CELULAR'}</button></>}
    </section>}

    {stage === 'complete' && <section className="rounded-[26px] border border-emerald-400/35 bg-emerald-500/10 p-6 text-center"><UserCheck className="mx-auto h-10 w-10 text-emerald-300" /><h2 className="mt-3 text-xl font-extrabold text-white">Reparto terminado</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-300">Todos ya vieron su rol. Dejen el celular, den una pista por turno y voten quién creen que es el impostor.</p><button type="button" onClick={resetGame} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0A84FF] py-3.5 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" /> NUEVA PARTIDA</button></section>}
  </div>;
};
