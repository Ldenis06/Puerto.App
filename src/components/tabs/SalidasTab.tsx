import React, { useState } from 'react';
import { LoaderCircle, MapPin, Sparkles, Users, Wallet } from 'lucide-react';
import { getGeminiRecommendations, RecommendationResponse } from '../../services/supabase';

const plans = ['Comer', 'Tomar algo', 'Cena tranqui', 'Bar con amigos'];
const zones = ['Palermo', 'Chacarita', 'Belgrano', 'Villa Crespo', 'San Telmo', 'Puerto Madero'];
const budgets = ['Económico', 'Medio', 'Alto'];

export const SalidasTab: React.FC = () => {
  const [plan, setPlan] = useState(plans[0]);
  const [zone, setZone] = useState(zones[0]);
  const [budget, setBudget] = useState(budgets[1]);
  const [groupSize, setGroupSize] = useState(4);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const askGemini = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await getGeminiRecommendations({ plan, zone, budget, groupSize }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos pedir recomendaciones.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pb-28 space-y-4">
      <div className="rounded-[28px] overflow-hidden border border-[#A855F7]/35 bg-gradient-to-br from-[#30134F] via-[#171025] to-zinc-950 p-5 shadow-[0_16px_40px_rgba(168,85,247,0.16)]">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-[#A855F7] text-white shadow-[0_0_20px_rgba(168,85,247,0.65)]"><Sparkles className="w-5 h-5" /></div>
          <div>
            <p className="text-base font-black tracking-tight">¿Pintó salir?</p>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">Gemini propone opciones para el grupo en Capital según el plan y presupuesto.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <OptionRow label="Plan" values={plans} value={plan} onChange={setPlan} />
          <OptionRow label="Zona" values={zones} value={zone} onChange={setZone} icon={<MapPin className="w-3.5 h-3.5" />} />
          <OptionRow label="Presupuesto" values={budgets} value={budget} onChange={setBudget} icon={<Wallet className="w-3.5 h-3.5" />} />
          <div className="flex items-center justify-between rounded-2xl bg-black/25 border border-white/10 px-3.5 py-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><Users className="w-4 h-4 text-[#C084FC]" /> ¿Cuántos son?</span>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Quitar persona" onClick={() => setGroupSize((current) => Math.max(1, current - 1))} className="w-7 h-7 rounded-full bg-white/10 font-bold">−</button>
              <span className="w-4 text-center font-black">{groupSize}</span>
              <button type="button" aria-label="Agregar persona" onClick={() => setGroupSize((current) => Math.min(20, current + 1))} className="w-7 h-7 rounded-full bg-white/10 font-bold">+</button>
            </div>
          </div>
          <button type="button" disabled={loading} onClick={askGemini} className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#A855F7] to-[#6366F1] font-extrabold text-sm flex justify-center items-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform">
            {loading ? <><LoaderCircle className="w-4 h-4 animate-spin" /> Pensando opciones...</> : <><Sparkles className="w-4 h-4" /> Pedirle a Gemini</>}
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-[#FF375F]/40 bg-[#FF375F]/10 p-3 text-xs text-[#FFB3C1]">{error}</div>}

      {result && (
        <div className="space-y-3">
          <p className="px-1 text-sm font-bold text-zinc-100">{result.summary}</p>
          {result.ideas.map((idea, index) => (
            <article key={`${idea.name}-${index}`} className="rounded-3xl bg-zinc-950 border border-white/10 p-4 shadow-lg">
              <div className="flex justify-between gap-3"><div><h3 className="font-black text-sm">{idea.name}</h3><p className="text-xs text-[#C084FC] font-semibold mt-0.5">{idea.neighborhood}</p></div><span className="h-fit rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-zinc-300">{idea.price}</span></div>
              <p className="mt-3 text-xs text-zinc-300 leading-relaxed">{idea.why}</p>
              <p className="mt-3 text-[11px] text-zinc-500 border-t border-white/5 pt-2.5">Tip: {idea.tip}</p>
            </article>
          ))}
          <p className="px-1 text-[11px] leading-relaxed text-zinc-500">{result.notice || 'Verificá horario, reserva y dirección antes de salir.'}</p>
        </div>
      )}
    </section>
  );
};

function OptionRow({ label, values, value, onChange, icon }: { label: string; values: string[]; value: string; onChange(value: string): void; icon?: React.ReactNode }) {
  return <div><p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400 mb-2">{icon}{label}</p><div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">{values.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold border transition-colors ${value === option ? 'bg-white text-black border-white' : 'bg-black/25 text-zinc-300 border-white/10'}`}>{option}</button>)}</div></div>;
}
