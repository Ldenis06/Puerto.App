import React, { useState } from 'react';
import { User } from '../types';
import { PuenteDeLaMujerIcon } from './PuenteDeLaMujerIcon';
import { Check, KeyRound, LogOut, ShieldAlert, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  onLogin: (user: User) => void;
  onLogout: () => void;
  onLinkFederatedAuth: (userId: string, provider: 'google' | 'apple', email: string) => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onLogin,
  onLogout,
  onLinkFederatedAuth,
}) => {
  const [selectedUserForPin, setSelectedUserForPin] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [federatedPendingProvider, setFederatedPendingProvider] = useState<'google' | 'apple' | null>(null);
  const [simulatedEmail, setSimulatedEmail] = useState('');

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPin) return;

    if (pinInput.trim() === selectedUserForPin.pin) {
      onLogin(selectedUserForPin);
      setPinInput('');
      setPinError('');
      setSelectedUserForPin(null);
      onClose();
    } else {
      setPinError(`Contraseña incorrecta para ${selectedUserForPin.name}. Recordá que es ${selectedUserForPin.id}123.`);
    }
  };

  const handleStartFederated = (provider: 'google' | 'apple') => {
    if (provider === 'google') {
      const emailChoice = window.prompt(
        'Ingresá tu correo de Google (@gmail.com):',
        ''
      );
      if (!emailChoice) return;
      const clean = emailChoice.trim().toLowerCase();
      setSimulatedEmail(clean);

      // Denis auto-login rule
      if (clean === 'denislautaro6@gmail.com') {
        const denisUser = users.find((u) => u.id === 'denis');
        if (denisUser) {
          onLinkFederatedAuth('denis', 'google', clean);
          onLogin(denisUser);
          onClose();
          return;
        }
      }

      // Check if already linked to a member
      const alreadyLinked = users.find((u) => u.linkedAuth?.accountEmail.toLowerCase() === clean);
      if (alreadyLinked) {
        onLogin(alreadyLinked);
        onClose();
        return;
      }

      // Trigger "¿Quién sos?" selection flow
      setFederatedPendingProvider('google');
      return;
    }

    const defaultEmail = 'amigo.puerto@icloud.com';
    setSimulatedEmail(defaultEmail);
    const alreadyLinked = users.find((u) => u.linkedAuth?.provider === provider);
    if (alreadyLinked) {
      onLogin(alreadyLinked);
      onClose();
    } else {
      setFederatedPendingProvider(provider);
    }
  };

  const handleSelectMemberForFederated = (targetUserId: string) => {
    if (!federatedPendingProvider) return;
    onLinkFederatedAuth(targetUserId, federatedPendingProvider, simulatedEmail);
    const targetUser = users.find((u) => u.id === targetUserId);
    if (targetUser) {
      onLogin(targetUser);
    }
    setFederatedPendingProvider(null);
    onClose();
  };

  // Candidates for "¿Quién sos?": Denis is EXCLUDED and already linked members are NOT available
  const federatedEligibleMembers = users.filter((u) => u.id !== 'denis' && !u.linkedAuth);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-zinc-950/95 border border-white/15 rounded-[26px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        {/* Close Button */}
        <button
          id="auth-close-button"
          type="button"
          onClick={() => {
            setFederatedPendingProvider(null);
            setSelectedUserForPin(null);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="p-2 rounded-2xl bg-black border border-white/10 shadow-[0_0_20px_rgba(10,132,255,0.3)] mb-2.5">
            <PuenteDeLaMujerIcon size={40} />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Acceso a Puerto App</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Grupo privado de Puerto Madero</p>
        </div>

        {/* FLOW 1: "¿Quién sos?" (Federated Account Assignment) */}
        {federatedPendingProvider ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-[18px] bg-[#0A84FF]/10 border border-[#0A84FF]/30 text-center">
              <div className="text-xs font-bold text-[#5AC8FA] uppercase tracking-wider mb-1">
                Vinculación {federatedPendingProvider === 'google' ? 'Google' : 'Apple'}
              </div>
              <p className="text-xs text-white font-semibold">¿Quién sos vos en el grupo?</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Elegí tu integrante para asociar tu cuenta de acceso.
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {federatedEligibleMembers.map((member) => (
                <button
                  key={member.id}
                  id={`select-federated-${member.id}`}
                  type="button"
                  onClick={() => handleSelectMemberForFederated(member.id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-[16px] bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-9 h-9 rounded-full object-cover bg-zinc-900 border border-white/15"
                    />
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-[#5AC8FA] transition-colors">
                        {member.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 line-clamp-1">{member.bio}</div>
                    </div>
                  </div>
                  <span className="text-xs text-[#0A84FF] font-medium px-2 py-1 rounded-lg bg-[#0A84FF]/15">
                    Elegir
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFederatedPendingProvider(null)}
              className="w-full py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition"
            >
              Volver a métodos de ingreso
            </button>
          </div>
        ) : selectedUserForPin ? (
          /* FLOW 2: PIN Entry for Selected Member */
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <img
                src={selectedUserForPin.avatarUrl}
                alt={selectedUserForPin.name}
                className="w-10 h-10 rounded-full bg-zinc-900 border border-white/20"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  {selectedUserForPin.name}
                  {selectedUserForPin.role === 'admin' && (
                    <span className="text-[9px] bg-[#0A84FF] text-white px-1.5 py-0.5 rounded font-black">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400">Ingresá tu clave de 6 integrantes</div>
              </div>
            </div>

            <div>
              <label htmlFor="pin-code-input" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Contraseña / PIN
              </label>
              <div className="relative">
                <input
                  id="pin-code-input"
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder={`Ej: ${selectedUserForPin.id}123`}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0A84FF] focus:ring-1 focus:ring-[#0A84FF] transition"
                  autoFocus
                />
                <KeyRound className="w-4 h-4 text-zinc-500 absolute right-3 top-3" />
              </div>
              {pinError && (
                <p className="text-[11px] text-[#FF375F] mt-1.5 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedUserForPin(null);
                  setPinInput('');
                  setPinError('');
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 bg-white/5 hover:bg-white/10 transition"
              >
                Atrás
              </button>
              <button
                id="pin-submit-button"
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] hover:opacity-95 shadow-[0_0_15px_rgba(10,132,255,0.4)] transition"
              >
                Ingresar
              </button>
            </div>
          </form>
        ) : (
          /* FLOW 3: Main Auth Menu (Member Direct or Federated) */
          <div className="space-y-4">
            {/* Quick Member Selection with PIN prompt */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Ingreso directo por integrante:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {users.map((user) => {
                  const isCurrent = currentUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      id={`auth-select-user-${user.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedUserForPin(user);
                        setPinInput(user.pin); // Pre-fill for ultra smooth experience
                      }}
                      className={`flex items-center gap-2 p-2 rounded-[14px] border transition text-left ${
                        isCurrent
                          ? 'bg-[#0A84FF]/20 border-[#0A84FF] text-white'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200'
                      }`}
                    >
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-7 h-7 rounded-full bg-zinc-900 border border-white/15 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate flex items-center gap-1">
                          {user.name}
                          {user.role === 'admin' && (
                            <span className="text-[8px] bg-[#0A84FF] text-white px-1 py-0.2 rounded font-black">
                              ADM
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {isCurrent ? 'Activo' : user.birthday}
                        </div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-[#0A84FF] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-zinc-950 px-2 text-[10px] text-zinc-500 uppercase tracking-wider">
                o federado
              </span>
            </div>

            {/* Federated Login Buttons */}
            <div className="space-y-2">
              <button
                id="btn-login-google"
                type="button"
                onClick={() => handleStartFederated('google')}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continuar con Google</span>
              </button>

              <button
                id="btn-login-apple"
                type="button"
                onClick={() => handleStartFederated('apple')}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition active:scale-[0.99]"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.66-.99 1.72-.88 2.74 1 .08 2.03-.54 2.58-1.24z" />
                </svg>
                <span>Continuar con Apple</span>
              </button>
            </div>

            {/* Logout button if active */}
            {currentUser && (
              <div className="pt-2">
                <button
                  id="btn-logout"
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[#FF375F] text-xs font-semibold border border-red-500/20 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión de {currentUser.name}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
