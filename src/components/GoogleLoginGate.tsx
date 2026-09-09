import React, { useState } from 'react';
import { User } from '../types';
import { PuenteDeLaMujerIcon } from './PuenteDeLaMujerIcon';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Lock,
  Shield,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
  onLinkGoogleAuth: (userId: string, email: string) => void;
}

export const GoogleLoginGate: React.FC<Props> = ({ users, onLogin, onLinkGoogleAuth }) => {
  const [step, setStep] = useState<'landing' | 'enter-email' | 'who-is-entering' | 'welcome'>('landing');
  const [activeEmail, setActiveEmail] = useState('');
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [welcomeUser, setWelcomeUser] = useState<User | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // The 5 group members (excluding Denis who is strictly reserved for denislautaro6@gmail.com)
  const targetGroupOrder = ['maxi', 'drizza', 'alca', 'castro', 'alan'];
  const selectableMembers = targetGroupOrder
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is User => !!u);

  // Count how many are still available
  const availableMembers = selectableMembers.filter((m) => !m.linkedAuth);

  // Handle Google email processing
  const handleProcessGoogleEmail = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor ingresá una dirección de correo de Google válida (@gmail.com).');
      return;
    }

    setErrorMsg('');
    setActiveEmail(cleanEmail);

    // RULE 1: If email is denislautaro6@gmail.com -> Instant login as Denis (Admin)
    if (cleanEmail === 'denislautaro6@gmail.com') {
      const denisUser = users.find((u) => u.id === 'denis');
      if (denisUser) {
        onLinkGoogleAuth('denis', cleanEmail);
        setWelcomeUser(denisUser);
        setStep('welcome');
        setTimeout(() => {
          onLogin(denisUser);
        }, 1200);
        return;
      }
    }

    // RULE 2: If this Google email was ALREADY linked to a member previously
    const alreadyLinkedMember = users.find(
      (u) => u.linkedAuth?.accountEmail.toLowerCase() === cleanEmail
    );

    if (alreadyLinkedMember) {
      setWelcomeUser(alreadyLinkedMember);
      setStep('welcome');
      setTimeout(() => {
        onLogin(alreadyLinkedMember);
      }, 1000);
      return;
    }

    // RULE 3: Otherwise, ask "¿Quién es el que ingresa?" with the remaining available members
    setStep('who-is-entering');
  };

  // When a user selects their name (e.g. Maxi, Drizza, etc.)
  const handleSelectMember = (member: User) => {
    // Member cannot be chosen if already linked to another email
    if (member.linkedAuth) {
      return;
    }

    onLinkGoogleAuth(member.id, activeEmail);

    const updatedUser: User = {
      ...member,
      linkedAuth: {
        provider: 'google',
        accountEmail: activeEmail,
        linkedAt: new Date().toISOString(),
      },
    };

    setWelcomeUser(updatedUser);
    setStep('welcome');
    setTimeout(() => {
      onLogin(updatedUser);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl selection:bg-[#0A84FF] selection:text-white">
      {/* Background ambient water glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#0A84FF]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm bg-zinc-950 border border-white/15 rounded-[28px] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative overflow-hidden animate-fadeIn">
        {/* STEP 4: Welcome splash transition */}
        {step === 'welcome' && welcomeUser && (
          <div className="flex flex-col items-center text-center py-6 space-y-3 animate-scaleUp">
            <div className="relative">
              <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#0A84FF] to-[#5AC8FA] shadow-[0_0_30px_#0A84FF]">
                <img
                  src={welcomeUser.avatarUrl}
                  alt={welcomeUser.name}
                  className="w-full h-full rounded-full object-cover bg-black"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-6 h-6 bg-[#30D158] rounded-full border-2 border-black flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-black" />
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">¡Hola, {welcomeUser.name}!</h3>
              <p className="text-xs text-[#5AC8FA] font-semibold mt-0.5 flex items-center justify-center gap-1">
                {welcomeUser.role === 'admin' ? (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    <span>Ingresando como Administrador</span>
                  </>
                ) : (
                  <span>Ingresando a PuertoApp...</span>
                )}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">{activeEmail}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Landing screen with main "Ingresar con cuenta de Google" button */}
        {step === 'landing' && (
          <div className="space-y-6">
            {/* App Brand Header */}
            <div className="flex flex-col items-center text-center">
              <div className="p-3.5 rounded-2xl bg-black border border-white/10 shadow-[0_0_30px_rgba(10,132,255,0.45)] mb-3">
                <PuenteDeLaMujerIcon size={56} />
              </div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-1.5">
                <span className="text-white">Puerto</span>
                <span className="bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] bg-clip-text text-transparent">
                  App
                </span>
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-1">
                Puerto Madero • Grupo Privado
              </p>
            </div>

            {/* Description Card */}
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#0A84FF]" />
                <span>Acceso por Cuenta de Google</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Cada integrante ingresa con su cuenta de Google y elige su nombre en el grupo.
              </p>
            </div>

            {/* PRIMARY MANDATED BUTTON: "Ingresar con cuenta de Google" */}
            <div className="space-y-3 pt-1">
              <button
                id="btn-ingresar-cuenta-google"
                type="button"
                onClick={() => setStep('enter-email')}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-100 text-black font-extrabold text-xs tracking-wide shadow-[0_4px_25px_rgba(255,255,255,0.25)] flex items-center justify-center gap-3 transition active:scale-[0.98] group"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                <span>Ingresar con cuenta de Google</span>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-black group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Input Google Email */}
        {step === 'enter-email' && (
          <div className="space-y-4 animate-fadeIn">
            <button
              type="button"
              onClick={() => setStep('landing')}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>

            <div className="text-center space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-white flex items-center justify-center shadow">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              </div>
              <h2 className="text-lg font-bold text-white">Acceso con Google</h2>
              <p className="text-[11px] text-zinc-400">
                Ingresá tu correo de Google para identificarte:
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessGoogleEmail(customEmailInput);
              }}
              className="space-y-3"
            >
              <div>
                <label
                  htmlFor="google-input-email"
                  className="block text-[11px] font-semibold text-zinc-300 mb-1"
                >
                  Tu cuenta de Google:
                </label>
                <input
                  id="google-input-email"
                  type="email"
                  autoFocus
                  value={customEmailInput}
                  onChange={(e) => {
                    setCustomEmailInput(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="ejemplo@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/20 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#0A84FF] focus:ring-1 focus:ring-[#0A84FF] transition"
                />
              </div>

              {errorMsg && <p className="text-[11px] text-[#FF375F] font-medium">{errorMsg}</p>}

              <button
                id="btn-confirm-google-email"
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#0A84FF] hover:bg-[#0071e3] text-white text-xs font-bold transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(10,132,255,0.4)]"
              >
                <span>Continuar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: "¿Quién es el que ingresa?" Menu */}
        {step === 'who-is-entering' && (
          <div className="space-y-4 animate-fadeIn">
            <button
              type="button"
              onClick={() => setStep('enter-email')}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Cambiar correo</span>
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0A84FF]/15 border border-[#0A84FF]/30 text-[11px] text-[#5AC8FA] font-medium">
                <span>{activeEmail}</span>
              </div>
              <h2 className="text-lg font-black text-white flex items-center justify-center gap-1.5 pt-1">
                <UserCheck className="w-5 h-5 text-[#30D158]" />
                <span>¿Quién es el que ingresa?</span>
              </h2>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Seleccioná tu nombre. Cada integrante elige el suyo y deja de estar disponible para los demás.
              </p>
            </div>

            {/* Status of choices */}
            <div className="flex items-center justify-between text-[11px] px-1 text-zinc-400">
              <span>Disponibles para elegir:</span>
              <span className="font-bold text-[#5AC8FA]">
                {availableMembers.length} de {selectableMembers.length}
              </span>
            </div>

            {/* List of the 5 Members */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {selectableMembers.map((member) => {
                const isTaken = !!member.linkedAuth;
                const isTakenByMe =
                  member.linkedAuth?.accountEmail.toLowerCase() === activeEmail.toLowerCase();

                if (isTaken) {
                  return (
                    <div
                      key={member.id}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 opacity-50 cursor-not-allowed text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-9 h-9 rounded-full object-cover grayscale bg-zinc-900 border border-white/10"
                        />
                        <div>
                          <div className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                            <span>{member.name}</span>
                            <Lock className="w-3 h-3 text-zinc-500" />
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            Ya elegido ({member.linkedAuth?.accountEmail})
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] text-zinc-500 font-semibold px-2 py-1 rounded-lg bg-white/5">
                        No disponible
                      </span>
                    </div>
                  );
                }

                // Member IS AVAILABLE for selection
                return (
                  <button
                    key={member.id}
                    id={`btn-select-member-${member.id}`}
                    type="button"
                    onClick={() => handleSelectMember(member)}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/15 hover:border-[#0A84FF]/50 transition group text-left shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-9 h-9 rounded-full object-cover bg-zinc-900 border border-white/20 group-hover:scale-105 transition-transform"
                      />
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-[#5AC8FA] transition-colors">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 line-clamp-1">{member.bio}</div>
                      </div>
                    </div>

                    <span className="text-xs text-[#0A84FF] font-bold px-2.5 py-1 rounded-xl bg-[#0A84FF]/15 group-hover:bg-[#0A84FF] group-hover:text-white transition shrink-0">
                      Soy yo
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Warning if all members are already taken */}
            {availableMembers.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
                <p className="text-xs text-amber-400 font-bold">
                  Todos los integrantes ya fueron asignados
                </p>
                <p className="text-[10px] text-zinc-400">
                  El único que puede cambiar quién es quién o liberar un nombre es Denis (Administrador).
                </p>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-white/5 text-center">
              <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3 text-[#0A84FF]" />
                <span>El único que puede cambiar quién es quién es el Administrador (Denis).</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
