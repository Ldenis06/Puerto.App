import React, { useState } from 'react';
import { Expense, User } from '../../types';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  DollarSign,
  Plus,
  Receipt,
  Users,
} from 'lucide-react';

interface Props {
  currentUser: User | null;
  users: User[];
  expenses: Expense[];
  onAddExpense: (newExpense: Omit<Expense, 'id' | 'createdAt' | 'isPaid' | 'individualQuota'>) => void;
  onMarkAsPaid: (expenseId: string) => void;
}

export const GastosTab: React.FC<Props> = ({
  currentUser,
  users,
  expenses,
  onAddExpense,
  onMarkAsPaid,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState<string>(currentUser?.id || users[0].id);
  const [filterMode, setFilterMode] = useState<'all' | 'unpaid' | 'myDebts'>('unpaid');

  // Participant switches for splitting
  const [participantMap, setParticipantMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    users.forEach((u) => {
      map[u.id] = true; // all 6 by default
    });
    return map;
  });

  const selectedParticipantIds = Object.keys(participantMap).filter((id) => participantMap[id]);
  const parsedAmount = parseFloat(amount) || 0;
  const computedQuota = selectedParticipantIds.length > 0 ? parsedAmount / selectedParticipantIds.length : 0;

  const toggleParticipant = (userId: string) => {
    setParticipantMap((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleSelectAllParticipants = (val: boolean) => {
    const next: Record<string, boolean> = {};
    users.forEach((u) => {
      next[u.id] = val;
    });
    setParticipantMap(next);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || parsedAmount <= 0 || selectedParticipantIds.length === 0) return;

    onAddExpense({
      concept: concept.trim(),
      totalAmount: parsedAmount,
      payerId,
      participantIds: selectedParticipantIds,
    });

    setConcept('');
    setAmount('');
    setShowAddModal(false);
  };

  // Immovable debt cards for the current user:
  // Current user is a participant, NOT the payer, and expense is NOT marked as paid.
  const myImmovableDebts = expenses.filter(
    (exp) =>
      !exp.isPaid &&
      currentUser &&
      exp.payerId !== currentUser.id &&
      exp.participantIds.includes(currentUser.id)
  );

  // Debts owed TO the current user:
  // Current user is the payer, and expense is not yet settled
  const debtsOwedToMe = expenses.filter(
    (exp) => !exp.isPaid && currentUser && exp.payerId === currentUser.id
  );

  // Calculate totals
  const totalIOwe = myImmovableDebts.reduce((sum, exp) => sum + exp.individualQuota, 0);
  const totalOwedToMe = debtsOwedToMe.reduce((sum, exp) => {
    // Other participants except the payer themselves
    const debtorsCount = exp.participantIds.filter((p) => p !== exp.payerId).length;
    return sum + exp.individualQuota * debtorsCount;
  }, 0);

  // Filtered expenses list
  const filteredExpenses = expenses.filter((exp) => {
    if (filterMode === 'unpaid') return !exp.isPaid;
    if (filterMode === 'myDebts') {
      return (
        currentUser &&
        (exp.participantIds.includes(currentUser.id) || exp.payerId === currentUser.id)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {/* Financial Summary Widget */}
      <div className="p-4 rounded-[26px] bg-white/[0.04] border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#0A84FF]" />
            <h2 className="text-base font-bold text-white">División de Gastos</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-open-add-expense"
              type="button"
              onClick={() => {
                setPayerId(currentUser?.id || users[0].id);
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] hover:opacity-95 text-xs font-bold text-white shadow-[0_0_15px_rgba(10,132,255,0.4)] transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Anotar Gasto</span>
            </button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/10">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
              <ArrowDownRight className="w-3.5 h-3.5 text-[#FF375F]" />
              <span>Debés en total</span>
            </div>
            <div className="text-lg font-black text-[#FF375F] mt-0.5">
              ${totalIOwe.toLocaleString('es-AR')}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {myImmovableDebts.length} {myImmovableDebts.length === 1 ? 'deuda activa' : 'deudas activas'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/10">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#30D158]" />
              <span>Te deben a vos</span>
            </div>
            <div className="text-lg font-black text-[#30D158] mt-0.5">
              ${totalOwedToMe.toLocaleString('es-AR')}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {debtsOwedToMe.length} {debtsOwedToMe.length === 1 ? 'gasto por cobrar' : 'gastos por cobrar'}
            </div>
          </div>
        </div>
      </div>

      {/* CARTEL DE DEUDA INAMOVIBLE (Mandatory by prompt) */}
      {myImmovableDebts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#FF375F] tracking-wide uppercase">
              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
              <span>Cartel de Deuda Inamovible</span>
            </div>
            <span className="text-[10px] text-zinc-500">Solo el pagador puede marcar pagado</span>
          </div>

          <div className="space-y-2">
            {myImmovableDebts.map((debt) => {
              const payer = users.find((u) => u.id === debt.payerId);
              const payerName = payer?.name || debt.payerId;

              return (
                <div
                  key={`immovable-${debt.id}`}
                  className="p-4 rounded-[22px] bg-gradient-to-r from-[#FF375F]/20 via-[#FF375F]/10 to-zinc-950 border-2 border-[#FF375F]/50 shadow-[0_4px_20px_rgba(255,55,95,0.25)] relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="relative mt-0.5">
                        <img
                          src={payer?.avatarUrl}
                          alt={payerName}
                          className="w-10 h-10 rounded-full object-cover border border-[#FF375F]/60 bg-zinc-900 shrink-0"
                        />
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#FF375F] text-white flex items-center justify-center text-[10px] font-black">
                          !
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-white">
                          Le debés <span className="text-[#FF375F]">${debt.individualQuota.toLocaleString('es-AR')}</span> a {payerName}
                        </div>
                        <div className="text-xs text-zinc-300 font-medium mt-0.5">
                          Por: <span className="italic">"{debt.concept}"</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1">
                          Total del gasto: ${debt.totalAmount.toLocaleString('es-AR')} ({debt.participantIds.length} integrantes)
                        </div>
                      </div>
                    </div>

                    {/* Status badge - NOT dismissible by debtor */}
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FF375F]/20 border border-[#FF375F]/40 text-[10px] font-extrabold text-[#FF375F] uppercase tracking-wider">
                        Pendiente
                      </span>
                    </div>
                  </div>

                  {/* Warning: Debtor cannot delete or dismiss */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="italic">
                      Aviso fijado en tu cuenta hasta que {payerName} confirme el cobro.
                    </span>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="p-1 rounded-xl bg-zinc-900/80 border border-white/10 flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('unpaid')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterMode === 'unpaid' ? 'bg-[#0A84FF] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pendientes
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('myDebts')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterMode === 'myDebts' ? 'bg-[#0A84FF] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mis Gastos
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterMode === 'all' ? 'bg-[#0A84FF] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Historial
          </button>
        </div>
        <span className="text-[11px] text-zinc-500">{filteredExpenses.length} registros</span>
      </div>

      {/* Expenses List */}
      <div className="space-y-2.5">
        {filteredExpenses.length === 0 ? (
          <div className="p-8 rounded-[26px] bg-white/[0.02] border border-white/10 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#30D158] mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-white">¡Cuentas al día!</h3>
            <p className="text-xs text-zinc-400 mt-1">No hay gastos pendientes en este filtro.</p>
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const payer = users.find((u) => u.id === exp.payerId);
            const isPayer = currentUser?.id === exp.payerId;
            const canMarkPaid = isPayer;

            return (
              <div
                key={exp.id}
                className={`p-4 rounded-[22px] border transition-all ${
                  exp.isPaid
                    ? 'bg-zinc-950/40 border-white/5 opacity-75'
                    : 'bg-zinc-950/80 border-white/15 shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={payer?.avatarUrl}
                      alt={payer?.name}
                      className="w-9 h-9 rounded-full object-cover bg-zinc-900 border border-white/15 shrink-0"
                    />
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{exp.concept}</span>
                        {exp.isPaid && (
                          <span className="text-[9px] font-extrabold bg-[#30D158]/20 text-[#30D158] px-1.5 py-0.5 rounded uppercase">
                            Pagado
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-zinc-400 mt-0.5">
                        Pagó <span className="font-semibold text-white">{payer?.name}</span> • Total: ${exp.totalAmount.toLocaleString('es-AR')}
                      </div>

                      <div className="text-[11px] text-[#5AC8FA] font-semibold mt-1">
                        Cuota individual: ${exp.individualQuota.toLocaleString('es-AR')} ({exp.participantIds.length} participantes)
                      </div>
                    </div>
                  </div>

                  {/* Actions / Paid Button */}
                  <div className="text-right shrink-0">
                    {!exp.isPaid ? (
                      canMarkPaid ? (
                        <button
                          id={`btn-mark-paid-${exp.id}`}
                          type="button"
                          onClick={() => onMarkAsPaid(exp.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#30D158] hover:bg-[#30D158]/90 active:scale-95 text-black text-xs font-bold shadow-[0_0_12px_rgba(48,209,88,0.4)] transition"
                          title="Confirmar cobro de deuda"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Marcar Pagado</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-500 italic block">
                          Solo {payer?.name} cobra
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-zinc-500 block">
                        Saldado {exp.paidAt ? new Date(exp.paidAt).toLocaleDateString() : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Participants Avatars Bar */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {exp.participantIds.map((pId) => {
                      const participantUser = users.find((u) => u.id === pId);
                      if (!participantUser) return null;
                      return (
                        <img
                          key={pId}
                          src={participantUser.avatarUrl}
                          alt={participantUser.name}
                          title={participantUser.name}
                          className="w-5 h-5 rounded-full object-cover border border-black bg-zinc-800"
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(exp.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/15 rounded-[26px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#0A84FF]" />
                <span>Registrar Nuevo Gasto</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg bg-white/5"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              {/* Concept */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Concepto del gasto
                </label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej: Gomitas, Asado, Nafta, Birras"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0A84FF]"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Monto Total ($ ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-500 font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>
              </div>

              {/* Payer Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  ¿Quién pagó?
                </label>
                <select
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/80 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0A84FF]"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {currentUser?.id === u.id ? '(Vos)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Participant switches */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#0A84FF]" />
                    <span>Participantes ({selectedParticipantIds.length})</span>
                  </label>
                  <div className="flex gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleSelectAllParticipants(true)}
                      className="text-[#5AC8FA] hover:underline"
                    >
                      Todos
                    </button>
                    <span className="text-zinc-600">•</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllParticipants(false)}
                      className="text-zinc-400 hover:underline"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isSelected = participantMap[u.id];
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleParticipant(u.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs text-left transition ${
                          isSelected
                            ? 'bg-[#0A84FF]/20 border-[#0A84FF] text-white'
                            : 'bg-white/5 border-white/10 text-zinc-400'
                        }`}
                      >
                        <span className="truncate">{u.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-[#0A84FF] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Individual Quota preview */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-[11px] text-zinc-400">Cuota Individual Equitativa:</div>
                <div className="text-base font-black text-[#5AC8FA] mt-0.5">
                  ${Math.round(computedQuota).toLocaleString('es-AR')} por cabeza
                </div>
                <div className="text-[9px] text-zinc-500 mt-0.5">
                  Fórmula: Monto (${parsedAmount.toLocaleString('es-AR')}) ÷ {selectedParticipantIds.length} participantes
                </div>
              </div>

              {/* Submit */}
              <button
                id="btn-submit-expense"
                type="submit"
                disabled={!concept.trim() || parsedAmount <= 0 || selectedParticipantIds.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] text-white font-bold text-xs shadow-[0_0_15px_rgba(10,132,255,0.4)] disabled:opacity-40 disabled:pointer-events-none transition"
              >
                Guardar y Fijar Deudas
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
