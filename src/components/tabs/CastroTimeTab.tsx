import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Timer, TrendingUp, Users } from 'lucide-react';

// Both values use the same public starting point so every device displays the
// same count, even after the page is reloaded.
const STARTED_AT = new Date('2026-10-01T00:00:00-03:00').getTime();
const JULIAS_START = 200_000;
const FRIENDS_START = 10;
const FRIENDS_INTERVAL_MS = 15 * 24 * 60 * 60 * 1000;
const JU_START = 350;
const JU_INTERVAL_MS = 10 * 1000;

function formatCount(value: number) {
  return new Intl.NumberFormat('es-AR').format(value);
}

export const CastroTimeTab: React.FC = () => {
  const [now, setNow] = useState(() => Date.now());
  const [juStartedAt] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { julias, friends } = useMemo(() => {
    const elapsed = Math.max(0, now - STARTED_AT);
    const completedIntervals = Math.floor(elapsed / FRIENDS_INTERVAL_MS);

    return {
      julias: JULIAS_START + Math.floor(elapsed / 1000),
      friends: FRIENDS_START + completedIntervals,
    };
  }, [now]);

  const juCount = JU_START + Math.floor(Math.max(0, now - juStartedAt) / JU_INTERVAL_MS);

  return (
    <section className="pb-28 space-y-4" aria-labelledby="castro-time-title">
      <div className="rounded-[28px] border border-[#FF9500]/40 bg-gradient-to-br from-[#3A1700] via-[#1A0D06] to-zinc-950 p-5 shadow-[0_16px_40px_rgba(255,149,0,0.16)]">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#FF9500] p-2.5 text-black shadow-[0_0_20px_rgba(255,149,0,0.65)]">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#FFB566]">Contador del grupo</p>
            <h2 id="castro-time-title" className="mt-1 text-2xl font-black tracking-tight text-white">CASTRO TIME</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300">El tiempo corre, Castro no perdona.</p>
          </div>
        </div>
      </div>

      <article className="overflow-hidden rounded-[28px] border border-[#FF375F]/35 bg-gradient-to-br from-[#39101D] via-[#1B0D14] to-zinc-950 p-5 shadow-[0_12px_32px_rgba(255,55,95,0.14)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#FF9AB0]">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-wide">Salidas con Jolias</p>
          </div>
          <TrendingUp className="h-5 w-5 text-[#FF375F]" />
        </div>
        <p className="mt-4 tabular-nums text-5xl font-black tracking-tighter text-white" aria-live="polite">{formatCount(julias)}</p>
      </article>

      <article className="overflow-hidden rounded-[28px] border border-[#5AC8FA]/35 bg-gradient-to-br from-[#092D45] via-[#0A1823] to-zinc-950 p-5 shadow-[0_12px_32px_rgba(90,200,250,0.14)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#8CDBFF]">
            <Users className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-wide">Salidas con los chicos</p>
          </div>
          <Timer className="h-5 w-5 text-[#5AC8FA]" />
        </div>
        <p className="mt-4 tabular-nums text-5xl font-black tracking-tighter text-white" aria-live="polite">{formatCount(friends)}</p>
      </article>

      <article className="overflow-hidden rounded-[28px] border border-violet-400/35 bg-gradient-to-br from-[#24113D] via-[#130D20] to-zinc-950 p-5 shadow-[0_12px_32px_rgba(167,139,250,0.14)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-violet-200">
            <Users className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-wide">Salidas con Ju…</p>
          </div>
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-300 shadow-[0_0_12px_#c4b5fd]" aria-hidden="true" />
        </div>
        <p className="mt-4 select-none tabular-nums text-5xl font-black tracking-tighter text-white blur-[7px]" aria-label="Contador oculto que se actualiza">{formatCount(juCount)}</p>
        <a
          href="https://mpago.li/1G5uU3j"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center rounded-full border border-violet-300/40 bg-violet-300/10 px-3 py-2 text-xs font-bold text-violet-100 transition hover:bg-violet-300/20 focus:outline-none focus:ring-2 focus:ring-violet-300"
        >
          Para más info, click aquí
        </a>
      </article>
    </section>
  );
};
